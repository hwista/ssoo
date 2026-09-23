'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, RefreshCw, RotateCcw, Search } from 'lucide-react';
import type {
  CrmReportsAttentionItem,
  CrmReportsBreakdown,
  CrmReportsBreakdownKind,
  CrmReportsConfirmationResult,
  CrmReportsMonthlyTrend,
  CrmReportsPreviewRegion,
  CrmReportsPreviewResponse,
} from '@ssoo/types/crm';
import { Badge, Button, Input, NativeSelect, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';
import { SSOO_CONTENT_PAGE_METRICS, SSOO_PAGE_CHROME_METRICS, SsooSearchInput } from '@ssoo/web-shell';
import { useAuthStore } from '@/stores/auth.store';
import { useCrmBusinessYearOptions } from '@/lib/crmCommonCodeOptions';
import { useCrmDomainAccess } from '@/lib/useCrmDomainAccess';
import { toRequiredReportsPreviewQuery, type ReportsPreviewWorkspaceQuery } from './reportsPreviewQuery';

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

const regionLabels: Record<CrmReportsPreviewRegion, string> = {
  all: '전체',
  domestic: '국내',
  overseas: '해외',
};

const breakdownKindLabels: Record<CrmReportsBreakdownKind, string> = {
  'business-type': '사업구분',
  owner: '담당자',
  wbs: 'WBS',
};

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

function formatEok(value: number) {
  return `${(Math.round(value / 1000000) / 100).toLocaleString('ko-KR')}억`;
}

function formatTableAmount(value: number) {
  if (Math.round(value) === 0) {
    return '-';
  }
  return (value / 100000000).toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatRate(value: number) {
  return `${value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}%`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function buildApiHref(query: ReportsPreviewWorkspaceQuery) {
  const params = new URLSearchParams();
  params.set('year', String(query.year));
  if (query.businessType) params.set('businessType', query.businessType);
  if (query.industryLine) params.set('industryLine', query.industryLine);
  if (query.region !== 'all') params.set('region', query.region);
  if (query.search) params.set('search', query.search);
  return `/api/crm/reports/preview?${params.toString()}`;
}

function getBackendErrorMessage(responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null): string {
  if (!responseBody || responseBody.success === true) {
    return '보고 Preview 조회 중 오류가 발생했습니다.';
  }

  return responseBody.error?.message || responseBody.message || '보고 Preview 조회 중 오류가 발생했습니다.';
}

function getYearOptions(year: number) {
  const currentYear = new Date().getFullYear();
  return [...new Set([year, currentYear - 1, currentYear, currentYear + 1, currentYear + 2])]
    .sort((left, right) => left - right);
}

export function ReportsPreviewWorkspaceClient({
  data,
  query,
}: {
  data: CrmReportsPreviewResponse;
  query: ReportsPreviewWorkspaceQuery;
}) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const { access: domainAccess, error: domainAccessError } = useCrmDomainAccess(accessToken);
  const canConfirmReport = domainAccess?.features.canConfirmReport === true;
  const [currentData, setCurrentData] = useState(data);
  const [filters, setFilters] = useState(query);
  const [isReloading, setIsReloading] = useState(data.breakdowns.length === 0 && data.attentionItems.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const apiHref = useMemo(() => buildApiHref(query), [query]);
  const businessYears = useCrmBusinessYearOptions(query.year, getYearOptions(query.year));
  const yearOptions = businessYears.years;
  const latestConfirmation = currentData.summary.latestConfirmation;
  const businessTypeOptions = [...new Set([...currentData.summary.businessTypeOptions, filters.businessType].filter(Boolean))];
  const industryLineOptions = [...new Set([...currentData.summary.industryLineOptions, filters.industryLine].filter(Boolean))];

  useEffect(() => {
    setFilters({
      year: query.year,
      businessType: query.businessType,
      industryLine: query.industryLine,
      region: query.region,
      search: query.search,
    });
  }, [query.year, query.businessType, query.industryLine, query.region, query.search]);

  useEffect(() => {
    setCurrentData(data);
    if (data.breakdowns.length > 0 || data.attentionItems.length > 0) {
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
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmReportsPreviewResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setCurrentData(payload.data);
      return payload.data;
    } catch (error) {
      if (signal?.aborted) {
        return null;
      }
      setLoadError(error instanceof Error ? error.message : '보고 Preview 조회에 실패했습니다.');
      return null;
    } finally {
      if (!signal?.aborted) {
        setIsReloading(false);
      }
    }
  }, [accessToken, apiHref]);

  const confirmReport = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setIsConfirming(true);
    setConfirmationMessage(null);
    setConfirmationError(null);
    try {
      const response = await fetch('/api/crm/reports/confirm', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(toRequiredReportsPreviewQuery(query)),
      });
      const result = await response.json().catch(() => null) as BackendSuccessResponse<CrmReportsConfirmationResult> | BackendErrorResponse | null;
      if (!response.ok || result?.success !== true) {
        throw new Error(getBackendErrorMessage(result));
      }
      setConfirmationMessage(`보고 확정 ${formatDateTime(result.data.confirmation.confirmedAt)} · 실적 ${formatEok(result.data.confirmation.actualRevenueTotal)}`);
      await loadPreview();
    } catch (error) {
      setConfirmationError(error instanceof Error ? error.message : '보고 확정에 실패했습니다.');
    } finally {
      setIsConfirming(false);
    }
  }, [accessToken, loadPreview, query]);

  const reopenReport = useCallback(async () => {
    if (!accessToken || !latestConfirmation) {
      return;
    }
    setIsConfirming(true);
    setConfirmationMessage(null);
    setConfirmationError(null);
    try {
      const response = await fetch(`/api/crm/reports/confirmations/${encodeURIComponent(latestConfirmation.id)}/reopen`, {
        method: 'POST',
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await response.json().catch(() => null) as BackendSuccessResponse<CrmReportsConfirmationResult> | BackendErrorResponse | null;
      if (!response.ok || result?.success !== true) {
        throw new Error(getBackendErrorMessage(result));
      }
      setConfirmationMessage(`보고 확정 해제 ${formatDateTime(result.data.confirmation.updatedAt)}`);
      await loadPreview();
    } catch (error) {
      setConfirmationError(error instanceof Error ? error.message : '보고 확정 해제에 실패했습니다.');
    } finally {
      setIsConfirming(false);
    }
  }, [accessToken, latestConfirmation, loadPreview]);

  useEffect(() => {
    const abortController = new AbortController();
    void loadPreview(abortController.signal);
    return () => abortController.abort();
  }, [loadPreview]);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-ssoo-content-bg">
      <header className="border-b bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">CRM Reports Preview</p>
            <h1 className="mt-1 text-xl font-semibold text-foreground">보고 Preview</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {latestConfirmation ? (
              <Badge variant="default">확정 {formatDateTime(latestConfirmation.confirmedAt)}</Badge>
            ) : (
              <Badge variant="outline">미확정</Badge>
            )}
            <Button variant="outline" size="sm" type="button" onClick={() => void loadPreview()} disabled={isReloading || isConfirming}>
              <RefreshCw className="mr-2 h-4 w-4" />
              새로고침
            </Button>
            <Button size="sm" type="button" onClick={() => void confirmReport()} disabled={!canConfirmReport || isReloading || isConfirming} title={canConfirmReport ? '현재 보고 확정' : '보고 확정 권한이 없습니다.'}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {isConfirming ? '처리 중' : '보고 확정'}
            </Button>
            <Button variant="outline" size="sm" type="button" onClick={() => void reopenReport()} disabled={!canConfirmReport || !latestConfirmation || isReloading || isConfirming} title={canConfirmReport ? '보고 확정 해제' : '보고 확정 해제 권한이 없습니다.'}>
              <RotateCcw className="mr-2 h-4 w-4" />
              확정 해제
            </Button>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{currentData.summary.boundaryNotice}</p>
        {latestConfirmation ? (
          <p className="mt-2 text-xs text-muted-foreground">
            최신 확정: Pipeline {formatEok(latestConfirmation.pipelineRevenueTotal)} · 계획 {formatEok(latestConfirmation.planRevenueTotal)} · 실적 {formatEok(latestConfirmation.actualRevenueTotal)} · 확인 {latestConfirmation.attentionItemCount}건
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {currentData.summary.unavailableActions.map((action) => (
            <Badge key={action} variant="outline">{action}</Badge>
          ))}
        </div>
      </header>

      <main className="mx-auto min-h-0 w-full min-w-0 flex-1 overflow-auto p-4" style={{ maxWidth: SSOO_CONTENT_PAGE_METRICS.landscapeContentWidthPx + SSOO_PAGE_CHROME_METRICS.stackPaddingPx * 2 }}>
        <section className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Metric label="Pipeline 매출" value={formatEok(currentData.summary.pipelineRevenueTotal)} sub={`${currentData.summary.opportunityCount}개 영업기회`} />
          <Metric label="계획 매출" value={formatEok(currentData.summary.planRevenueTotal)} sub={`${currentData.summary.contractCount}개 확정 계약`} />
          <Metric label="실적 매출" value={formatEok(currentData.summary.actualRevenueTotal)} sub={formatRate(currentData.summary.revenueAchievementRate)} />
          <Metric label="매출 Gap" value={formatEok(currentData.summary.revenueDelta)} sub={formatWon(currentData.summary.revenueDelta)} />
          <Metric label="손익 Gap" value={formatEok(currentData.summary.marginDelta)} sub={formatRate(currentData.summary.marginAchievementRate)} />
        </section>

        <section className="mt-4 rounded-md border bg-card">
          <form action="/reports" className="flex flex-wrap items-end gap-3 border-b p-4">
            <label className="w-[132px] text-sm font-medium text-muted-foreground">
              사업년도
              <NativeSelect name="year" value={String(filters.year)} onChange={(event) => setFilters((current) => ({ ...current, year: Number(event.target.value) }))} className="mt-1">
                {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
              </NativeSelect>
            </label>
            <label className="w-[172px] text-sm font-medium text-muted-foreground">
              사업구분
              <NativeSelect name="businessType" value={filters.businessType} onChange={(event) => setFilters((current) => ({ ...current, businessType: event.target.value }))} className="mt-1">
                <option value="">전체</option>
                {businessTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </NativeSelect>
            </label>
            <label className="w-[172px] text-sm font-medium text-muted-foreground">
              계열/산업
              <NativeSelect name="industryLine" value={filters.industryLine} onChange={(event) => setFilters((current) => ({ ...current, industryLine: event.target.value }))} className="mt-1">
                <option value="">전체</option>
                {industryLineOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </NativeSelect>
            </label>
            <label className="w-[132px] text-sm font-medium text-muted-foreground">
              국내/해외
              <NativeSelect name="region" value={filters.region} onChange={(event) => setFilters((current) => ({ ...current, region: event.target.value as CrmReportsPreviewRegion }))} className="mt-1">
                {Object.entries(regionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </NativeSelect>
            </label>
            <label className="min-w-0 flex-[1_1_220px] text-sm font-medium text-muted-foreground">
              검색
              <SsooSearchInput id="crm-reports-search-input" name="search" ariaLabel="CRM 보고서 검색" intent="data-filter" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="고객, 건명, 담당자, WBS" className="mt-1" />
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
          {domainAccess && !canConfirmReport ? (
            <div className="border-b bg-ssoo-warning-bg px-4 py-3 text-sm text-ssoo-warning">보고 확정 권한이 없어 Preview 조회만 가능합니다.</div>
          ) : null}
          {domainAccessError ? (
            <div className="border-b bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger">{domainAccessError}</div>
          ) : null}
          {confirmationMessage ? (
            <div className="border-b px-4 py-3 text-sm text-ssoo-success">{confirmationMessage}</div>
          ) : null}
          {confirmationError ? (
            <div className="flex items-center gap-2 border-b bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger">
              <AlertCircle className="h-4 w-4" />
              {confirmationError}
            </div>
          ) : null}

          <div className="border-b px-4 py-2 text-xs text-muted-foreground">
            단위: 억원 · 원천 계약대비실적 표를 월별 trend와 사업구분/담당자/WBS drilldown으로 재구성
          </div>
          <MonthlyTrend months={currentData.monthlyTrend} />
          <BreakdownTable rows={currentData.breakdowns} isLoading={isReloading} />
          <AttentionItems items={currentData.attentionItems} />
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  const valueTone = value.startsWith('-') ? 'text-ssoo-danger' : 'text-foreground';
  return (
    <div className="min-w-0 rounded-md border bg-card px-4 py-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={`mt-1 break-words text-lg font-semibold ${valueTone}`}>{value}</div>
      <div className="mt-1 break-words text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function MonthlyTrend({ months }: { months: CrmReportsMonthlyTrend[] }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-2 border-b p-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {months.map((month) => (
        <div key={month.month} className="min-w-0 rounded-md border bg-ssoo-content-bg px-3 py-2">
          <div className="text-sm font-semibold text-foreground">{month.month}월</div>
          <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-1 break-words text-xs text-muted-foreground">
            <span>계획</span>
            <span className="text-right font-medium text-foreground">{formatEok(month.planRevenueAmount)}</span>
            <span>실적</span>
            <span className="text-right font-medium text-foreground">{formatEok(month.actualRevenueAmount)}</span>
            <span>Gap</span>
            <span className={`text-right font-medium ${month.revenueDelta < 0 ? 'text-ssoo-danger' : 'text-foreground'}`}>{formatEok(month.revenueDelta)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function BreakdownTable({ rows, isLoading }: { rows: CrmReportsBreakdown[]; isLoading: boolean }) {
  if (isLoading && rows.length === 0) {
    return <div className="px-4 py-10 text-center text-sm text-muted-foreground">보고 지표를 조회하는 중입니다.</div>;
  }
  if (rows.length === 0) {
    return <div className="px-4 py-10 text-center text-sm text-muted-foreground">집계할 보고 지표가 없습니다.</div>;
  }

  return (
    <div className="overflow-auto">
      <Table className="min-w-[1180px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px] px-2 py-2">구분</TableHead>
            <TableHead className="w-[220px] px-2 py-2">라벨</TableHead>
            <TableHead className="w-[90px] px-2 py-2 text-right">Pipeline</TableHead>
            <TableHead className="w-[90px] px-2 py-2 text-right">계약</TableHead>
            <TableHead className="w-[120px] px-2 py-2 text-right">Pipeline 매출</TableHead>
            <TableHead className="w-[120px] px-2 py-2 text-right">계획 매출</TableHead>
            <TableHead className="w-[120px] px-2 py-2 text-right">실적 매출</TableHead>
            <TableHead className="w-[120px] px-2 py-2 text-right">매출 Gap</TableHead>
            <TableHead className="w-[120px] px-2 py-2 text-right">손익 Gap</TableHead>
            <TableHead className="w-[90px] px-2 py-2 text-right">달성률</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="px-2 py-2 text-muted-foreground">{breakdownKindLabels[row.kind]}</TableCell>
              <TableCell className="px-2 py-2 font-medium text-foreground">
                <Link className="text-ssoo-primary hover:underline" href={row.href}>{row.label}</Link>
              </TableCell>
              <TableCell className="px-2 py-2 text-right">{row.opportunityCount}</TableCell>
              <TableCell className="px-2 py-2 text-right">{row.contractCount}</TableCell>
              <TableCell className="px-2 py-2 text-right">{formatTableAmount(row.pipelineRevenueTotal)}</TableCell>
              <TableCell className="px-2 py-2 text-right">{formatTableAmount(row.planRevenueTotal)}</TableCell>
              <TableCell className="px-2 py-2 text-right">{formatTableAmount(row.actualRevenueTotal)}</TableCell>
              <TableCell className={`px-2 py-2 text-right ${row.revenueDelta < 0 ? 'text-ssoo-danger' : 'text-foreground'}`}>{formatTableAmount(row.revenueDelta)}</TableCell>
              <TableCell className={`px-2 py-2 text-right ${row.marginDelta < 0 ? 'text-ssoo-danger' : 'text-foreground'}`}>{formatTableAmount(row.marginDelta)}</TableCell>
              <TableCell className="px-2 py-2 text-right">{formatRate(row.revenueAchievementRate)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AttentionItems({ items }: { items: CrmReportsAttentionItem[] }) {
  return (
    <div className="border-t p-4">
      <div className="text-sm font-semibold text-foreground">보고 확인 항목</div>
      {items.length === 0 ? (
        <div className="mt-3 rounded-md border bg-ssoo-content-bg px-3 py-4 text-sm text-muted-foreground">확인할 항목이 없습니다.</div>
      ) : (
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {items.map((item) => (
            <Link key={`${item.kind}:${item.id}`} href={item.href} className="rounded-md border bg-ssoo-content-bg px-3 py-3 hover:border-ssoo-primary">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{item.title}</div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">{item.customerName} · {item.ownerName}</div>
                </div>
                <Badge variant="outline">{item.statusLabel}</Badge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">{item.reason}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
