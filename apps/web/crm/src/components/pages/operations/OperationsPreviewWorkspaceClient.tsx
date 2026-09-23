'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw, Search } from 'lucide-react';
import type {
  CrmOperationsAdminBoundaryItem,
  CrmOperationsBusinessYear,
  CrmOperationsCodeGroup,
  CrmOperationsPreviewOwner,
  CrmOperationsPreviewReadiness,
  CrmOperationsPreviewResponse,
} from '@ssoo/types/crm';
import { Badge, Button, NativeSelect, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';
import { SSOO_CONTENT_PAGE_METRICS, SSOO_PAGE_CHROME_METRICS } from '@ssoo/web-shell';
import { useAuthStore } from '@/stores/auth.store';
import { useCrmBusinessYearOptions } from '@/lib/crmCommonCodeOptions';
import { LaunchOperationsSurface } from './LaunchOperationsSurface';
import type { OperationsPreviewWorkspaceQuery } from './operationsPreviewQuery';

interface BackendSuccessResponse<T> {
  success: true;
  data: T;
}

interface BackendErrorResponse {
  success?: false;
  error?: {
    message?: string;
  };
  message?: string;
}

const ownerLabels: Record<CrmOperationsPreviewOwner, string> = {
  crm: 'CRM',
  'shared-admin': '공용 Admin',
  'shared-auth': '공용 Auth',
  dms: 'DMS',
  pms: 'PMS',
};

const readinessLabels: Record<CrmOperationsPreviewReadiness, string> = {
  ready: '준비',
  partial: '부분',
  planned: '후속',
  external: '공용',
};

function buildApiHref(query: OperationsPreviewWorkspaceQuery) {
  const params = new URLSearchParams();
  params.set('year', String(query.year));
  return `/api/crm/operations/preview?${params.toString()}`;
}

function getBackendErrorMessage(responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null): string {
  if (!responseBody || responseBody.success === true) {
    return '운영 기준 preview 조회 중 오류가 발생했습니다.';
  }

  return responseBody.error?.message || responseBody.message || '운영 기준 preview 조회 중 오류가 발생했습니다.';
}

function getYearOptions(year: number, years: CrmOperationsBusinessYear[]) {
  const currentYear = new Date().getFullYear();
  return [...new Set([year, currentYear - 1, currentYear, currentYear + 1, currentYear + 2, ...years.map((item) => item.year)])]
    .sort((left, right) => left - right);
}

export function OperationsPreviewWorkspaceClient({
  data,
  query,
}: {
  data: CrmOperationsPreviewResponse;
  query: OperationsPreviewWorkspaceQuery;
}) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [currentData, setCurrentData] = useState(data);
  const [selectedYear, setSelectedYear] = useState(query.year);
  const [isReloading, setIsReloading] = useState(data.codeGroups.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const apiHref = useMemo(() => buildApiHref(query), [query]);
  const businessYears = useCrmBusinessYearOptions(selectedYear, getYearOptions(query.year, currentData.businessYears));
  const yearOptions = businessYears.years;

  useEffect(() => {
    setSelectedYear(query.year);
  }, [query.year]);

  useEffect(() => {
    setCurrentData(data);
    if (data.codeGroups.length > 0) {
      setIsReloading(false);
    }
  }, [data]);

  const loadPreview = useCallback(async (signal?: AbortSignal) => {
    if (!accessToken) {
      return null;
    }

    setIsReloading(true);
    setLoadError(null);
    try {
      const response = await fetch(apiHref, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOperationsPreviewResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setCurrentData(payload.data);
      return payload.data;
    } catch (error) {
      if (signal?.aborted) {
        return null;
      }
      setLoadError(error instanceof Error ? error.message : '운영 기준 preview 조회에 실패했습니다.');
      return null;
    } finally {
      if (!signal?.aborted) {
        setIsReloading(false);
      }
    }
  }, [accessToken, apiHref]);

  useEffect(() => {
    const abortController = new AbortController();
    void loadPreview(abortController.signal);
    return () => abortController.abort();
  }, [loadPreview]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-ssoo-content-bg">
      <header className="mx-auto w-full min-w-0 border-b bg-card p-4" style={{ maxWidth: SSOO_CONTENT_PAGE_METRICS.landscapeContentWidthPx + SSOO_PAGE_CHROME_METRICS.stackPaddingPx * 2 }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">CRM Launch Operations</p>
            <h1 className="mt-1 text-xl font-semibold text-foreground">운영 기준·제어</h1>
          </div>
          <Button variant="outline" size="sm" type="button" onClick={() => void loadPreview()} disabled={isReloading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{currentData.summary.boundaryNotice}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {currentData.summary.unavailableActions.map((action) => (
            <Badge key={action} variant="outline">{action}</Badge>
          ))}
        </div>
      </header>

      <main className="mx-auto min-h-0 w-full min-w-0 flex-1 overflow-auto p-4" style={{ maxWidth: SSOO_CONTENT_PAGE_METRICS.landscapeContentWidthPx + SSOO_PAGE_CHROME_METRICS.stackPaddingPx * 2 }}>
        <LaunchOperationsSurface accessToken={accessToken} />

        <section className="mt-4 rounded-md border border-dashed bg-muted/30 px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">원천 데모 운영 항목 Preview</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            아래 영역은 100% 이식 범위와 소유 경계를 보존한 참고 화면입니다. 런칭 차단 여부는 위 Live 런칭 운영 상태만 판정합니다.
          </p>
        </section>

        <section className="mt-4 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Metric label="코드 그룹" value={`${currentData.summary.codeGroupCount}개`} sub={`${currentData.summary.codeOptionCount}개 후보`} />
          <Metric label="사업년도" value={`${currentData.summary.businessYearCount}개`} sub={`${currentData.summary.selectedYear}년 선택`} />
          <Metric label="CRM 소유" value={`${currentData.summary.crmOwnedCount}개`} sub="원장/표시 설정" />
          <Metric label="공용 소유" value={`${currentData.summary.sharedOwnedCount}개`} sub="Admin/Auth 경계" />
          <Metric label="DMS 소유" value={`${currentData.summary.dmsOwnedCount}개`} sub="CI/템플릿/문서" />
        </section>

        <section className="mt-4 rounded-md border bg-card">
          <form action="/operations" className="flex flex-wrap items-end gap-3 border-b p-4">
            <label className="w-[132px] text-sm font-medium text-muted-foreground">
              기준년도
              <NativeSelect name="year" value={String(selectedYear)} onChange={(event) => setSelectedYear(Number(event.target.value))} className="mt-1">
                {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
              </NativeSelect>
            </label>
            <Button type="submit">
              <Search className="mr-2 h-4 w-4" />
              조회
            </Button>
          </form>

          {loadError ? (
            <div className="flex items-center gap-2 border-b bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger">
              <AlertCircle className="h-4 w-4" />
              {loadError}
            </div>
          ) : null}

          <SellerProfilePanel data={currentData} />
          <BusinessYearTable items={currentData.businessYears} isLoading={isReloading} />
          <CodeGroupTable items={currentData.codeGroups} isLoading={isReloading} />
          <AdminBoundaryTable items={currentData.adminBoundaries} isLoading={isReloading} />
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0 rounded-md border bg-card px-4 py-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
      <div className="mt-1 break-words text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function ReadinessBadge({ value }: { value: CrmOperationsPreviewReadiness }) {
  const variant = value === 'ready' ? 'default' : value === 'planned' ? 'outline' : value === 'external' ? 'secondary' : 'outline';
  return <Badge variant={variant}>{readinessLabels[value]}</Badge>;
}

function OwnerBadge({ value }: { value: CrmOperationsPreviewOwner }) {
  return <Badge variant={value === 'crm' ? 'default' : 'outline'}>{ownerLabels[value]}</Badge>;
}

function SellerProfilePanel({ data }: { data: CrmOperationsPreviewResponse }) {
  const seller = data.sellerProfile;
  return (
    <section className="border-b p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">공급자 회사 정보</h2>
          <p className="mt-1 text-xs text-muted-foreground">{seller.boundaryNote}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OwnerBadge value={seller.owner} />
          <ReadinessBadge value={seller.readiness} />
        </div>
      </div>
      <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
        <InfoItem label="회사명" value={seller.profile.companyName} />
        <InfoItem label="대표이사" value={seller.profile.ceoName ?? '-'} />
        <InfoItem label="사업자번호" value={seller.profile.businessRegistrationNo ?? '-'} />
        <InfoItem label="CI 상태" value={seller.sellerInfoStatus} />
      </div>
      {seller.missingFields.length > 0 ? (
        <p className="mt-3 text-xs text-ssoo-danger">누락 필드: {seller.missingFields.join(', ')}</p>
      ) : null}
    </section>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border bg-ssoo-content-bg px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-medium text-foreground">{value}</div>
    </div>
  );
}

function BusinessYearTable({ items, isLoading }: { items: CrmOperationsBusinessYear[]; isLoading: boolean }) {
  return (
    <section className="border-b">
      <div className="px-4 py-3 text-sm font-semibold text-foreground">사업년도 기준</div>
      <Table className="min-w-[640px] text-xs">
        <TableHeader className="bg-ssoo-content-bg text-muted-foreground">
          <TableRow>
            <TableHead className="px-3 py-2">사업년도</TableHead>
            <TableHead className="px-3 py-2 text-right">영업기회</TableHead>
            <TableHead className="px-3 py-2 text-right">계약</TableHead>
            <TableHead className="px-3 py-2 text-right">청구계획</TableHead>
            <TableHead className="px-3 py-2">소유</TableHead>
            <TableHead className="px-3 py-2">상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? <TableRow><TableCell className="px-3 py-5 text-left text-ssoo-info" colSpan={6}>사업년도 기준을 불러오는 중입니다.</TableCell></TableRow> : null}
          {!isLoading && items.length === 0 ? <TableRow><TableCell className="px-3 py-5 text-left text-muted-foreground" colSpan={6}>조회된 사업년도 기준이 없습니다.</TableCell></TableRow> : null}
          {!isLoading ? items.map((item) => (
            <TableRow key={item.year}>
              <TableCell className="px-3 py-2 font-medium text-foreground">{item.year}{item.selected ? ' · 선택' : ''}</TableCell>
              <TableCell className="px-3 py-2 text-right text-muted-foreground">{item.opportunityCount}</TableCell>
              <TableCell className="px-3 py-2 text-right text-muted-foreground">{item.contractCount}</TableCell>
              <TableCell className="px-3 py-2 text-right text-muted-foreground">{item.billingPlanCount}</TableCell>
              <TableCell className="px-3 py-2"><OwnerBadge value={item.owner} /></TableCell>
              <TableCell className="px-3 py-2"><ReadinessBadge value={item.readiness} /></TableCell>
            </TableRow>
          )) : null}
        </TableBody>
      </Table>
    </section>
  );
}

function CodeGroupTable({ items, isLoading }: { items: CrmOperationsCodeGroup[]; isLoading: boolean }) {
  return (
    <section className="border-b">
      <div className="px-4 py-3 text-sm font-semibold text-foreground">코드 기준</div>
      <Table className="min-w-[980px] text-xs">
        <TableHeader className="bg-ssoo-content-bg text-muted-foreground">
          <TableRow>
            <TableHead className="w-[150px] px-3 py-2">그룹</TableHead>
            <TableHead className="px-3 py-2">후보 코드</TableHead>
            <TableHead className="w-[110px] px-3 py-2">소유</TableHead>
            <TableHead className="w-[90px] px-3 py-2">상태</TableHead>
            <TableHead className="w-[360px] px-3 py-2">경계</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? <TableRow><TableCell className="px-3 py-5 text-left text-ssoo-info" colSpan={5}>코드 기준을 불러오는 중입니다.</TableCell></TableRow> : null}
          {!isLoading && items.length === 0 ? <TableRow><TableCell className="px-3 py-5 text-left text-muted-foreground" colSpan={5}>조회된 코드 기준이 없습니다.</TableCell></TableRow> : null}
          {!isLoading ? items.map((item) => (
            <TableRow key={item.key}>
              <TableCell className="px-3 py-2 font-medium text-foreground">{item.label}</TableCell>
              <TableCell className="px-3 py-2 text-muted-foreground">
                <div className="flex flex-wrap gap-1">
                  {item.options.map((option) => (
                    <Badge key={`${item.key}-${option.code}`} variant="outline">{option.label} {option.usageCount}</Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="px-3 py-2"><OwnerBadge value={item.owner} /></TableCell>
              <TableCell className="px-3 py-2"><ReadinessBadge value={item.readiness} /></TableCell>
              <TableCell className="px-3 py-2 text-muted-foreground">{item.boundaryNote}</TableCell>
            </TableRow>
          )) : null}
        </TableBody>
      </Table>
    </section>
  );
}

function AdminBoundaryTable({ items, isLoading }: { items: CrmOperationsAdminBoundaryItem[]; isLoading: boolean }) {
  return (
    <section>
      <div className="px-4 py-3 text-sm font-semibold text-foreground">공용 운영 경계</div>
      <Table className="min-w-[980px] text-xs">
        <TableHeader className="bg-ssoo-content-bg text-muted-foreground">
          <TableRow>
            <TableHead className="w-[150px] px-3 py-2">항목</TableHead>
            <TableHead className="w-[120px] px-3 py-2">소유</TableHead>
            <TableHead className="w-[90px] px-3 py-2">상태</TableHead>
            <TableHead className="w-[190px] px-3 py-2">대상 surface</TableHead>
            <TableHead className="px-3 py-2">경계</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? <TableRow><TableCell className="px-3 py-5 text-left text-ssoo-info" colSpan={5}>공용 운영 경계를 불러오는 중입니다.</TableCell></TableRow> : null}
          {!isLoading && items.length === 0 ? <TableRow><TableCell className="px-3 py-5 text-left text-muted-foreground" colSpan={5}>조회된 공용 운영 경계가 없습니다.</TableCell></TableRow> : null}
          {!isLoading ? items.map((item) => (
            <TableRow key={item.key}>
              <TableCell className="px-3 py-2 font-medium text-foreground">{item.label}</TableCell>
              <TableCell className="px-3 py-2"><OwnerBadge value={item.owner} /></TableCell>
              <TableCell className="px-3 py-2"><ReadinessBadge value={item.readiness} /></TableCell>
              <TableCell className="px-3 py-2 text-muted-foreground">{item.targetSurface}</TableCell>
              <TableCell className="px-3 py-2 text-muted-foreground">{item.boundaryNote}</TableCell>
            </TableRow>
          )) : null}
        </TableBody>
      </Table>
    </section>
  );
}
