'use client';

import { createSharedHttpError } from '@ssoo/web-auth';
import { SsooErrorNotice } from '@ssoo/web-shell';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useCrmCommonCodeOptions, withCurrentCodeOption } from '@/lib/crmCommonCodeOptions';
import { AlertCircle, RefreshCw, Save, Search } from 'lucide-react';
import type {
  CrmBusinessPlanPerformanceActualInputRequest,
  CrmBusinessPlanPerformanceActualInputResult,
  CrmBusinessPlanPerformanceMonth,
  CrmBusinessPlanPerformanceMode,
  CrmBusinessPlanPerformanceResponse,
  CrmBusinessPlanPerformanceRow,
  CrmBusinessPlanPerformanceSource,
  CrmBusinessPlanPreviewRegion,
} from '@ssoo/types/crm';
import { Badge, Button, Input, NativeSelect, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';
import { SSOO_CONTENT_PAGE_METRICS, SSOO_PAGE_CHROME_METRICS, SsooSearchInput } from '@ssoo/web-shell';
import { BusinessOrganizationFilter, BusinessOrganizationField } from '@/components/common/BusinessOrganizationField';
import { useAuthStore } from '@/stores/auth.store';
import { useCrmBusinessYearOptions } from '@/lib/useCrmBusinessYears';
import { useCrmDomainAccess } from '@/lib/useCrmDomainAccess';
import type { BusinessPlanPerformancePreviewWorkspaceQuery } from './businessPlanPerformancePreviewQuery';

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

type PerformanceRowKind = 'plan' | 'actual' | 'gap';

interface DirectActualDraft {
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmBusinessPlanPreviewRegion, 'all'>;
  wbsCode: string;
  monthlyRevenueAmounts: number[];
  monthlyCostAmounts: number[];
  memo: string;
}

const regionLabels: Record<CrmBusinessPlanPreviewRegion, string> = {
  all: '전체',
  domestic: '국내',
  overseas: '해외',
  unspecified: '미선택',
};

const sourceLabels: Record<CrmBusinessPlanPerformanceSource, string> = {
  'confirmed-plan': '확정계획',
  pipeline: 'Pipeline',
  contract: '계약',
  'confirmed-cost': '확정원가',
  'manual-actual': '직접실적',
  mixed: '혼합',
};

const rowKindLabels: Record<PerformanceRowKind, string> = {
  plan: '계획',
  actual: '실적',
  gap: '차이',
};

const performanceModeLabels: Record<CrmBusinessPlanPerformanceMode, string> = {
  'source-compatible': '원천 호환 · 계약 청구계획',
  'extended-actual': 'SSOO 확장 · 청구실적/직접실적',
};

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

function formatEok(value: number) {
  return `${(Math.round(value / 1000000) / 100).toLocaleString('ko-KR')}억`;
}

function formatTableAmount(value: number, sourceCompatible = false) {
  if (Math.round(value) === 0) {
    return '-';
  }
  if (sourceCompatible) return (value / 100000000).toFixed(2);
  return (value / 100000000).toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildApiHref(query: BusinessPlanPerformancePreviewWorkspaceQuery) {
  const params = new URLSearchParams();
  if (query.ownerOrganizationId) params.set('ownerOrganizationId', query.ownerOrganizationId);
  params.set('year', String(query.year));
  params.set('mode', query.mode);
  if (query.businessType) params.set('businessType', query.businessType);
  if (query.industryLine) params.set('industryLine', query.industryLine);
  if (query.region !== 'all') params.set('region', query.region);
  if (query.search) params.set('search', query.search);
  return `/api/crm/business-plan/performance-preview?${params.toString()}`;
}

function getBackendErrorMessage(responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null): string {
  if (!responseBody || responseBody.success === true) {
    return '사업계획대비실적 preview 조회 중 오류가 발생했습니다.';
  }

  return responseBody.error?.message || responseBody.message || '사업계획대비실적 preview 조회 중 오류가 발생했습니다.';
}

function getYearOptions(year: number) {
  const currentYear = new Date().getFullYear();
  return [...new Set([year, currentYear - 1, currentYear, currentYear + 1, currentYear + 2])]
    .sort((left, right) => left - right);
}

function createDirectActualDraft(query: BusinessPlanPerformancePreviewWorkspaceQuery): DirectActualDraft {
  return {
    businessType: query.businessType,
    industryLine: query.industryLine,
    ownerName: '',
    region: query.region === 'unspecified' ? 'unspecified' : query.region === 'overseas' ? 'overseas' : 'domestic',
    wbsCode: '',
    monthlyRevenueAmounts: Array.from({ length: 12 }, () => 0),
    monthlyCostAmounts: Array.from({ length: 12 }, () => 0),
    memo: '',
  };
}

function toInputAmount(value: string): number {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
}

export function BusinessPlanPerformancePreviewWorkspaceClient({
  data,
  query,
  active = true,
}: {
  active?: boolean;
  data: CrmBusinessPlanPerformanceResponse;
  query: BusinessPlanPerformancePreviewWorkspaceQuery;
}) {
  const router = useRouter();
  const commonCodes = useCrmCommonCodeOptions(['biz_type', 'group_type']);
  const updateQuery = (patch: Partial<BusinessPlanPerformancePreviewWorkspaceQuery>) => {
    const next = { ...query, ...patch };
    const params = new URLSearchParams({ mode: next.mode, year: String(next.year) });
    for (const key of ['ownerOrganizationId', 'businessType', 'industryLine', 'region', 'search'] as const) if (next[key]) params.set(key, next[key]);
    router.replace(`/business-plan-performance?${params}`, { scroll: false });
  };
  const requestSequence = useRef(0);
  const accessToken = useAuthStore((state) => state.accessToken);
  const { access: domainAccess } = useCrmDomainAccess(accessToken, query.ownerOrganizationId);
  const canWriteBusinessPlan = domainAccess?.features.canWriteBusinessPlan === true;
  const [currentData, setCurrentData] = useState(data);
  const [isReloading, setIsReloading] = useState(data.rows.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [directActualDraft, setDirectActualDraft] = useState(() => createDirectActualDraft(query));
  const [isDirectActualSaving, setIsDirectActualSaving] = useState(false);
  const [directActualMessage, setDirectActualMessage] = useState<string | null>(null);
  const [directActualError, setDirectActualError] = useState<string | null>(null);
  const apiHref = useMemo(() => buildApiHref(query), [query]);
  const businessYears = useCrmBusinessYearOptions(query.year, getYearOptions(query.year));
  const yearOptions = businessYears.years;
  const businessTypeOptions = currentData.summary.businessTypeOptions.reduce((options, value) => withCurrentCodeOption(options, value), withCurrentCodeOption(commonCodes.options.biz_type ?? [], query.businessType));
  const industryLineOptions = currentData.summary.industryLineOptions.reduce((options, value) => withCurrentCodeOption(options, value), withCurrentCodeOption(commonCodes.options.group_type ?? [], query.industryLine));

  useEffect(() => {
    setCurrentData(data);
    if (data.rows.length > 0) {
      setIsReloading(false);
    }
  }, [data]);

  useEffect(() => {
    setDirectActualDraft((current) => ({
      ...current,
      businessType: current.businessType || query.businessType,
      industryLine: current.industryLine || query.industryLine,
      region: query.region === 'unspecified' ? 'unspecified' : query.region === 'overseas' ? 'overseas' : current.region,
    }));
  }, [query.businessType, query.industryLine, query.region]);

  const loadPreview = useCallback(async (signal?: AbortSignal) => {
    if (!accessToken) {
      return null;
    }

    const sequence = ++requestSequence.current;
    setIsReloading(true);
    setLoadError(null);
    try {
      const response = await fetch(apiHref, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmBusinessPlanPerformanceResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw createSharedHttpError(response, payload, getBackendErrorMessage(payload));
      }
      if (signal?.aborted || sequence !== requestSequence.current) return null;
      setCurrentData(payload.data);
      return payload.data;
    } catch (error) {
      if (signal?.aborted || sequence !== requestSequence.current) {
        return null;
      }
      setLoadError(error instanceof Error ? error.message : '사업계획대비실적 preview 조회에 실패했습니다.');
      return null;
    } finally {
      if (!signal?.aborted && sequence === requestSequence.current) {
        setIsReloading(false);
      }
    }
  }, [accessToken, apiHref]);

  const saveDirectActual = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    const payload: CrmBusinessPlanPerformanceActualInputRequest = {
      ownerOrganizationId: query.ownerOrganizationId || undefined,
      year: query.year,
      businessType: directActualDraft.businessType.trim(),
      industryLine: directActualDraft.industryLine.trim(),
      ownerName: directActualDraft.ownerName.trim(),
      region: directActualDraft.region,
      wbsCode: directActualDraft.wbsCode.trim() || undefined,
      monthlyRevenueAmounts: directActualDraft.monthlyRevenueAmounts,
      monthlyCostAmounts: directActualDraft.monthlyCostAmounts,
      memo: directActualDraft.memo.trim() || undefined,
    };
    if (!payload.businessType || !payload.industryLine || !payload.ownerName) {
      setDirectActualError('사업구분, 계열/산업, 담당자를 입력해야 합니다.');
      setDirectActualMessage(null);
      return;
    }
    setIsDirectActualSaving(true);
    setDirectActualError(null);
    setDirectActualMessage(null);
    try {
      const response = await fetch('/api/crm/business-plan/performance-actual/monthly', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null) as BackendSuccessResponse<CrmBusinessPlanPerformanceActualInputResult> | BackendErrorResponse | null;
      if (!response.ok || result?.success !== true) {
        throw createSharedHttpError(response, result, getBackendErrorMessage(result));
      }
      setDirectActualMessage(`직접 실적 ${formatWon(result.data.input.revenueAmountTotal)} / 원가 ${formatWon(result.data.input.costAmountTotal)} 저장`);
      await loadPreview();
    } catch (error) {
      setDirectActualError(error instanceof Error ? error.message : '직접 실적 저장에 실패했습니다.');
    } finally {
      setIsDirectActualSaving(false);
    }
  }, [accessToken, directActualDraft, loadPreview, query.ownerOrganizationId, query.year]);

  useEffect(() => {
    if (!active) return;
    const abortController = new AbortController();
    void loadPreview(abortController.signal);
    return () => { abortController.abort(); requestSequence.current += 1; };
  }, [active, loadPreview]);

  if (query.mode === 'source-compatible') {
    return (
      <main className="h-full min-h-0 min-w-0 overflow-auto bg-ssoo-content-bg p-4" data-source-surface="business-plan-performance">
        <div className="mx-auto w-full min-w-0" style={{ maxWidth: SSOO_CONTENT_PAGE_METRICS.landscapeContentWidthPx }}>
          <h1 className="text-xl font-semibold text-foreground">사업계획대비실적 (월별)</h1>
          <p className="mt-1 text-sm text-muted-foreground">확정 사업계획 대비 계약 청구계획 실적을 조회합니다.</p>
          <form action="/business-plan-performance" className="mt-6 flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); updateQuery({ ownerOrganizationId: String(form.get('ownerOrganizationId') ?? '') }); void loadPreview(); }}>
            <BusinessOrganizationField purpose="filter" autoSelect={false} name="ownerOrganizationId" value={query.ownerOrganizationId ?? ''} onChange={(ownerOrganizationId) => updateQuery({ ownerOrganizationId })} />
            <Input type="hidden" name="mode" value="source-compatible" />
            <SourceBprField label="사업년도 *" htmlFor="bpr-year"><NativeSelect id="bpr-year" name="year" value={String(query.year)} onChange={(event) => updateQuery({ year: Number(event.target.value) })}>{yearOptions.map((year) => <option key={year} value={year}>{year}년</option>)}</NativeSelect></SourceBprField>
            <SourceBprField label="사업구분" htmlFor="bpr-biz-type"><NativeSelect id="bpr-biz-type" name="businessType" value={query.businessType} onChange={(event) => updateQuery({ businessType: event.target.value })}><option value="">전체</option>{businessTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</NativeSelect></SourceBprField>
            <SourceBprField label="계열구분" htmlFor="bpr-group-type"><NativeSelect id="bpr-group-type" name="industryLine" value={query.industryLine} onChange={(event) => updateQuery({ industryLine: event.target.value })}><option value="">전체</option>{industryLineOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</NativeSelect></SourceBprField>
            <SourceBprField label="국내/해외" htmlFor="bpr-domestic"><NativeSelect id="bpr-domestic" name="region" value={query.region} onChange={(event) => updateQuery({ region: event.target.value as CrmBusinessPlanPreviewRegion })}>{Object.entries(regionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></SourceBprField>
            <Button type="submit" variant="outline">조회</Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">{currentData.summary.confirmedPlanAvailable ? `사업계획 ${query.year}년 ${currentData.summary.confirmedPlanVersion ?? '-'}차 (확정) 기준` : '확정된 사업계획이 없습니다.'}</p>
          {loadError ? <SsooErrorNotice className="mt-3 px-4 py-3" error={loadError} actions={[{ label: '다시 조회', onClick: () => void loadPreview() }]} /> : null}
          {commonCodes.error ? <SsooErrorNotice error={commonCodes.error} actions={[{ label: '공통코드 다시 조회', onClick: commonCodes.reload }]} /> : null}
          <div className="mt-5 overflow-x-auto rounded-xl border bg-card">
            <PerformanceTable rows={currentData.rows} months={currentData.months} isLoading={isReloading} sourceCompatible />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">단위: 억원 · {currentData.summary.rowCount}개 WBS그룹 · {query.year}년 계획 vs 확정계약 청구계획</p>
        </div>
      </main>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-ssoo-content-bg">
      <header className="border-b bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">CRM Business Plan Performance</p>
            <h1 className="mt-1 text-xl font-semibold text-foreground">사업계획대비실적 Preview</h1>
          </div>
          <Button variant="outline" size="sm" type="button" onClick={() => void loadPreview()} disabled={isReloading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{currentData.summary.boundaryNotice}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="secondary">{currentData.summary.planBasisLabel}</Badge>
          <Badge variant={currentData.summary.mode === 'source-compatible' ? 'default' : 'secondary'}>{performanceModeLabels[currentData.summary.mode]}</Badge>
          <Badge variant="secondary">실적: {currentData.summary.actualBasisLabel}</Badge>
          <Badge variant="secondary">{currentData.summary.costBasisLabel}</Badge>
          {currentData.summary.confirmedPlanCode ? (
            <Badge variant="outline">{currentData.summary.confirmedPlanCode} · {currentData.summary.confirmedPlanName}</Badge>
          ) : null}
          {currentData.summary.confirmedCostInputCount > 0 ? (
            <Badge variant="outline">
              확정원가 {currentData.summary.confirmedCostInputCount}개 · 내부 {currentData.summary.confirmedInternalCostInputCount} · AMS {currentData.summary.confirmedAmsExternalCostInputCount}
            </Badge>
          ) : null}
          {currentData.summary.directActualInputCount > 0 ? (
            <Badge variant="outline">
              직접실적 {currentData.summary.directActualInputCount}개 · 매출 {formatWon(currentData.summary.directActualRevenueTotal)}
            </Badge>
          ) : null}
          {currentData.summary.amsExternalCostAdjustedWbsCount > 0 ? (
            <Badge variant="outline">
              AMS 중복조정 {currentData.summary.amsExternalCostAdjustedWbsCount} WBS · 계약 외부원가 제외 {formatWon(currentData.summary.amsExternalCostAdjustedActualAmountTotal)}
            </Badge>
          ) : null}
          {currentData.summary.unavailableActions.map((action) => (
            <Badge key={action} variant="outline">{action}</Badge>
          ))}
        </div>
      </header>

      <main className="mx-auto min-h-0 w-full min-w-0 flex-1 overflow-auto p-4" style={{ maxWidth: SSOO_CONTENT_PAGE_METRICS.landscapeContentWidthPx + SSOO_PAGE_CHROME_METRICS.stackPaddingPx * 2 }}>
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <Metric label="기준년도" value={`${currentData.summary.year}년`} sub={`${currentData.summary.rowCount}개 후보`} />
          <Metric label="계획 매출" value={formatEok(currentData.summary.planRevenueTotal)} sub={formatWon(currentData.summary.planRevenueTotal)} />
          <Metric label="실적 매출" value={formatEok(currentData.summary.actualRevenueTotal)} sub={formatWon(currentData.summary.actualRevenueTotal)} />
          {currentData.summary.mode === 'extended-actual' ? (
            <Metric label="직접 실적" value={`${currentData.summary.directActualInputCount}개`} sub={`매출 ${formatWon(currentData.summary.directActualRevenueTotal)} · 원가 ${formatWon(currentData.summary.directActualCostTotal)}`} />
          ) : null}
          <Metric label="매출 차이" value={formatEok(currentData.summary.revenueGapTotal)} sub={formatWon(currentData.summary.revenueGapTotal)} />
          <Metric label="손익 차이" value={formatEok(currentData.summary.marginGapTotal)} sub={formatWon(currentData.summary.marginGapTotal)} />
        </section>

        {currentData.summary.mode === 'extended-actual' ? (
          <DirectActualInputPanel
            canWrite={canWriteBusinessPlan}
            draft={directActualDraft}
            businessTypeOptions={currentData.summary.businessTypeOptions}
            industryLineOptions={currentData.summary.industryLineOptions}
            isSaving={isDirectActualSaving}
            message={directActualMessage}
            error={directActualError}
            onDraftChange={setDirectActualDraft}
            onSave={() => void saveDirectActual()}
          />
        ) : null}

        <section className="mt-4 min-w-0 rounded-md border bg-card">
          <form action="/business-plan-performance" className="flex flex-wrap items-end gap-3 border-b p-4">
            <BusinessOrganizationFilter value={query.ownerOrganizationId} />
            <label className="w-[220px] text-sm font-medium text-muted-foreground">
              비교 기준
              <NativeSelect name="mode" defaultValue={query.mode} className="mt-1">
                {Object.entries(performanceModeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </NativeSelect>
            </label>
            <label className="w-[132px] text-sm font-medium text-muted-foreground">
              기준년도
              <NativeSelect name="year" defaultValue={String(query.year)} className="mt-1">
                {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
              </NativeSelect>
            </label>
            <label className="w-[172px] text-sm font-medium text-muted-foreground">
              사업구분
              <NativeSelect name="businessType" defaultValue={query.businessType} className="mt-1">
                <option value="">전체</option>
                {currentData.summary.businessTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </NativeSelect>
            </label>
            <label className="w-[172px] text-sm font-medium text-muted-foreground">
              계열/산업
              <NativeSelect name="industryLine" defaultValue={query.industryLine} className="mt-1">
                <option value="">전체</option>
                {currentData.summary.industryLineOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </NativeSelect>
            </label>
            <label className="w-[132px] text-sm font-medium text-muted-foreground">
              국내/해외
              <NativeSelect name="region" defaultValue={query.region} className="mt-1">
                {Object.entries(regionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </NativeSelect>
            </label>
            <label className="min-w-[220px] flex-1 text-sm font-medium text-muted-foreground">
              검색
              <SsooSearchInput id="crm-business-plan-performance-search-input" name="search" ariaLabel="사업계획 대비 실적 검색" intent="data-filter" defaultValue={query.search} placeholder="고객, 건명, 담당자, WBS" className="mt-1" />
            </label>
            <Button type="submit">
              <Search className="mr-2 h-4 w-4" />
              조회
            </Button>
          </form>

          {loadError ? (
            <SsooErrorNotice className="gap-2 px-4 py-3">
              <AlertCircle className="h-4 w-4" />
              {loadError}
            </SsooErrorNotice>
          ) : null}

          <div className="border-b px-4 py-2 text-xs text-muted-foreground">
            단위: 억원 · 계획은 {currentData.summary.confirmedPlanAvailable ? '확정 사업계획 차수의 월별 매출·외부원가 우선, 미입력 line은 월 균등 배분' : currentData.summary.mode === 'source-compatible' ? '확정 사업계획 없음' : 'pipeline 후보와 확정 계약 청구계획'} 기준 · 실적은 {currentData.summary.actualBasisLabel} 기준 · 원가는 {currentData.summary.costBasisLabel} 기준
            {currentData.summary.amsExternalCostAdjustedWbsCount > 0 ? ` · AMS 확정 WBS ${currentData.summary.amsExternalCostAdjustedWbsCount}개는 계약 외부원가 실적 ${formatWon(currentData.summary.amsExternalCostAdjustedActualAmountTotal)}를 제외` : ''}
          </div>
          <MonthSummary months={currentData.months} />
          <PerformanceTable rows={currentData.rows} months={currentData.months} isLoading={isReloading} />
          <div className="border-t px-4 py-3 text-xs text-muted-foreground">
            {currentData.summary.rowCount}개 후보 · {currentData.summary.mode === 'source-compatible' ? '원천 기준: 확정 계약 청구계획을 실적으로 비교' : `확정원가 ${currentData.summary.confirmedCostInputCount}개 · AMS 조정 WBS ${currentData.summary.amsExternalCostAdjustedWbsCount}개`} · {currentData.summary.confirmedPlanAvailable ? '확정 사업계획 차수 기준 읽기 전용 비교' : '확정 사업계획 차수 없이 읽기 전용 후보 비교'}
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  const valueTone = value.startsWith('-') ? 'text-ssoo-danger' : 'text-foreground';
  return (
    <div className="rounded-md border bg-card px-4 py-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${valueTone}`}>{value}</div>
      <div className="mt-1 truncate text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function SourceBprField({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return <div className="w-[160px]"><label htmlFor={htmlFor} className="mb-1 block text-sm text-muted-foreground">{label}</label>{children}</div>;
}

function DirectActualInputPanel({
  canWrite,
  draft,
  businessTypeOptions,
  industryLineOptions,
  isSaving,
  message,
  error,
  onDraftChange,
  onSave,
}: {
  canWrite: boolean;
  draft: DirectActualDraft;
  businessTypeOptions: string[];
  industryLineOptions: string[];
  isSaving: boolean;
  message: string | null;
  error: string | null;
  onDraftChange: (draft: DirectActualDraft) => void;
  onSave: () => void;
}) {
  const revenueTotal = draft.monthlyRevenueAmounts.reduce((sum, amount) => sum + amount, 0);
  const costTotal = draft.monthlyCostAmounts.reduce((sum, amount) => sum + amount, 0);
  const canSave = Boolean(canWrite && draft.businessType.trim() && draft.industryLine.trim() && draft.ownerName.trim() && !isSaving);
  const updateField = <K extends keyof DirectActualDraft>(key: K, value: DirectActualDraft[K]) => {
    onDraftChange({ ...draft, [key]: value });
  };
  const updateMonth = (
    key: 'monthlyRevenueAmounts' | 'monthlyCostAmounts',
    index: number,
    value: string,
  ) => {
    const next = [...draft[key]];
    next[index] = toInputAmount(value);
    onDraftChange({ ...draft, [key]: next });
  };

  return (
    <fieldset disabled={!canWrite} className="mt-4 min-w-0 rounded-md border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">실적 직접 입력</h2>
          <p className="mt-1 text-xs text-muted-foreground">별도 manual-actual row · 매출 {formatWon(revenueTotal)} · 원가 {formatWon(costTotal)}</p>
        </div>
        <Button type="button" size="sm" onClick={onSave} disabled={!canSave}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? '저장 중' : '직접 실적 저장'}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 border-b p-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <label className="text-sm font-medium text-muted-foreground">
          사업구분
          <Input
            value={draft.businessType}
            list="crm-business-plan-performance-business-types"
            onChange={(event) => updateField('businessType', event.target.value)}
            className="mt-1"
          />
        </label>
        <label className="text-sm font-medium text-muted-foreground">
          계열/산업
          <Input
            value={draft.industryLine}
            list="crm-business-plan-performance-industry-lines"
            onChange={(event) => updateField('industryLine', event.target.value)}
            className="mt-1"
          />
        </label>
        <label className="text-sm font-medium text-muted-foreground">
          담당자
          <Input value={draft.ownerName} onChange={(event) => updateField('ownerName', event.target.value)} className="mt-1" />
        </label>
        <label className="text-sm font-medium text-muted-foreground">
          국내/해외
          <NativeSelect value={draft.region} onChange={(event) => updateField('region', event.target.value === 'unspecified' ? 'unspecified' : event.target.value === 'overseas' ? 'overseas' : 'domestic')} className="mt-1">
            <option value="unspecified">미선택</option><option value="domestic">국내</option>
            <option value="overseas">해외</option>
          </NativeSelect>
        </label>
        <label className="text-sm font-medium text-muted-foreground">
          WBS
          <Input value={draft.wbsCode} onChange={(event) => updateField('wbsCode', event.target.value)} className="mt-1" />
        </label>
        <label className="text-sm font-medium text-muted-foreground">
          메모
          <Input value={draft.memo} onChange={(event) => updateField('memo', event.target.value)} className="mt-1" />
        </label>
        <datalist id="crm-business-plan-performance-business-types">
          {businessTypeOptions.map((option) => <option key={option} value={option} />)}
        </datalist>
        <datalist id="crm-business-plan-performance-industry-lines">
          {industryLineOptions.map((option) => <option key={option} value={option} />)}
        </datalist>
      </div>
      <div className="grid grid-cols-1 gap-2 p-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {draft.monthlyRevenueAmounts.map((revenueAmount, index) => (
          <div key={index + 1} className="rounded-md border bg-ssoo-content-bg p-2">
            <div className="text-xs font-semibold text-foreground">{index + 1}월</div>
            <label className="mt-2 block text-caption-2xs font-medium text-muted-foreground">
              매출
              <Input
                type="number"
                min={0}
                value={revenueAmount || ''}
                onChange={(event) => updateMonth('monthlyRevenueAmounts', index, event.target.value)}
                className="mt-1"
              />
            </label>
            <label className="mt-2 block text-caption-2xs font-medium text-muted-foreground">
              원가
              <Input
                type="number"
                min={0}
                value={draft.monthlyCostAmounts[index] || ''}
                onChange={(event) => updateMonth('monthlyCostAmounts', index, event.target.value)}
                className="mt-1"
              />
            </label>
          </div>
        ))}
      </div>
      {message ? <div className="border-t px-4 py-3 text-sm text-ssoo-success">{message}</div> : null}
      {error ? (
        <SsooErrorNotice className="gap-2 px-4 py-3">
          <AlertCircle className="h-4 w-4" />
          {error}
        </SsooErrorNotice>
      ) : null}
    </fieldset>
  );
}

function MonthSummary({ months }: { months: CrmBusinessPlanPerformanceMonth[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 border-b p-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {months.map((month) => (
        <div key={month.month} className="rounded-md border bg-ssoo-content-bg px-3 py-2">
          <div className="text-xs font-semibold text-foreground">{month.month}월</div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>계획</span>
            <span className="font-medium text-foreground">{formatEok(month.planRevenueAmount)}</span>
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>실적</span>
            <span className="font-medium text-foreground">{formatEok(month.actualRevenueAmount)}</span>
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>차이</span>
            <span className={`font-medium ${month.revenueGapAmount < 0 ? 'text-ssoo-danger' : 'text-ssoo-info'}`}>{formatEok(month.revenueGapAmount)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PerformanceTable({
  rows,
  months,
  isLoading,
  sourceCompatible = false,
}: {
  rows: CrmBusinessPlanPerformanceRow[];
  months: CrmBusinessPlanPerformanceMonth[];
  isLoading: boolean;
  sourceCompatible?: boolean;
}) {
  const columnCount = (sourceCompatible ? 6 : 5) + ((months.length + 1) * 3);
  return (
    <div className="overflow-auto">
      <Table className={sourceCompatible ? 'w-[3044px] min-w-[3044px] table-fixed text-xs' : 'w-full min-w-[2920px] text-xs'}>
        <TableHeader className="sticky top-0 z-10 bg-ssoo-content-bg text-left text-muted-foreground shadow-sm">
          <TableRow>
            <TableHead className={sourceCompatible ? 'px-2 py-2 lg:sticky lg:z-20 bg-ssoo-content-bg' : 'w-[150px] px-2 py-2'} style={sourceCompatible ? { left: 0, width: 72 } : undefined} rowSpan={2}>사업구분</TableHead>
            <TableHead className={sourceCompatible ? 'px-2 py-2 lg:sticky lg:z-20 bg-ssoo-content-bg' : 'w-[150px] px-2 py-2'} style={sourceCompatible ? { left: 72, width: 80 } : undefined} rowSpan={2}>{sourceCompatible ? '계열구분' : '계열/산업'}</TableHead>
            {sourceCompatible ? <>
              <TableHead className={sourceCompatible ? 'px-2 py-2 lg:sticky lg:z-20 bg-ssoo-content-bg' : 'w-[100px] px-2 py-2'} style={sourceCompatible ? { left: 152, width: 60 } : undefined} rowSpan={2}>국내/해외</TableHead>
              <TableHead className={sourceCompatible ? 'px-2 py-2 lg:sticky lg:z-20 bg-ssoo-content-bg' : 'w-[220px] px-2 py-2'} style={sourceCompatible ? { left: 212, width: 200 } : undefined} rowSpan={2}>사업명</TableHead>
              <TableHead className={sourceCompatible ? 'px-2 py-2 lg:sticky lg:z-20 bg-ssoo-content-bg' : 'w-[140px] px-2 py-2'} style={sourceCompatible ? { left: 412, width: 90 } : undefined} rowSpan={2}>WBS코드</TableHead>
            </> : <>
              <TableHead className="w-[220px] px-2 py-2" rowSpan={2}>사업/WBS</TableHead>
              <TableHead className="w-[88px] px-2 py-2" rowSpan={2}>출처</TableHead>
            </>}
            <TableHead className={sourceCompatible ? 'px-2 py-2 lg:sticky lg:z-20 bg-ssoo-content-bg' : 'w-[56px] px-2 py-2'} style={sourceCompatible ? { left: 502, width: 46 } : undefined} rowSpan={2}>구분</TableHead>
            {months.map((month) => (
              <TableHead key={month.month} className="px-2 py-2 text-center" colSpan={3}>{month.month}월</TableHead>
            ))}
            <TableHead className="px-2 py-2 text-center" colSpan={3}>합계</TableHead>
          </TableRow>
          <TableRow>
            {[...months, { month: 0 }].map((month) => (
              <AmountHeads key={month.month} sourceCompatible={sourceCompatible} />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border">
          {isLoading ? (
            <TableRow>
              <TableCell className="px-3 py-5 text-left text-ssoo-info" colSpan={columnCount}>사업계획대비실적 preview를 불러오는 중입니다.</TableCell>
            </TableRow>
          ) : null}
          {!isLoading && rows.length === 0 ? (
            <TableRow>
              <TableCell className="px-3 py-5 text-left text-muted-foreground" colSpan={columnCount}>조회된 사업계획대비실적 후보가 없습니다.</TableCell>
            </TableRow>
          ) : null}
          {!isLoading ? rows.map((row) => <PerformanceRows key={row.key} row={row} months={months} sourceCompatible={sourceCompatible} />) : null}
          {!isLoading && rows.length > 0 ? <PerformanceRows row={createTotalRow(months)} months={months} sourceCompatible={sourceCompatible} total /> : null}
        </TableBody>
      </Table>
    </div>
  );
}

function AmountHeads({ sourceCompatible = false }: { sourceCompatible?: boolean }) {
  return (
    <>
      <TableHead className="px-2 py-2 text-right" style={{ width: sourceCompatible ? 64 : 70 }}>매출</TableHead>
      <TableHead className="px-2 py-2 text-right" style={{ width: sourceCompatible ? 64 : 70 }}>원가</TableHead>
      <TableHead className="px-2 py-2 text-right" style={{ width: sourceCompatible ? 64 : 70 }}>손익</TableHead>
    </>
  );
}

function PerformanceRows({
  row,
  months,
  sourceCompatible = false,
  total = false,
}: {
  row: CrmBusinessPlanPerformanceRow;
  months: CrmBusinessPlanPerformanceMonth[];
  sourceCompatible?: boolean;
  total?: boolean;
}) {
  const rowKinds: PerformanceRowKind[] = ['plan', 'actual', 'gap'];
  return (
    <>
      {rowKinds.map((kind) => (
        <TableRow data-performance-key={row.key} data-row-kind={kind} data-total={total ? true : undefined} key={`${row.key}-${kind}`} className={kind === 'gap' ? 'bg-ssoo-warning-bg' : kind === 'actual' ? 'bg-ssoo-info-bg' : undefined}>
          <TableCell style={sourceCompatible ? { left: 0 } : undefined} className={`px-2 py-2 font-medium text-foreground ${sourceCompatible ? 'lg:sticky lg:z-10 bg-card' : ''}`}>{kind === 'plan' ? row.businessType : ''}</TableCell>
          <TableCell style={sourceCompatible ? { left: 72 } : undefined} className={`px-2 py-2 text-muted-foreground ${sourceCompatible ? 'lg:sticky lg:z-10 bg-card' : ''}`}>{kind === 'plan' ? row.industryLine : ''}</TableCell>
          {sourceCompatible ? <>
            <TableCell style={sourceCompatible ? { left: 152 } : undefined} className={`px-2 py-2 text-muted-foreground ${sourceCompatible ? 'lg:sticky lg:z-10 bg-card' : ''}`}>{kind === 'plan' && !total ? regionLabels[row.region] : ''}</TableCell>
            <TableCell style={sourceCompatible ? { left: 212 } : undefined} className={`px-2 py-2 font-medium text-foreground ${sourceCompatible ? 'lg:sticky lg:z-10 bg-card' : ''}`}>{kind === 'plan' ? row.label : ''}</TableCell>
            <TableCell style={sourceCompatible ? { left: 412 } : undefined} className={`px-2 py-2 text-muted-foreground ${sourceCompatible ? 'lg:sticky lg:z-10 bg-card' : ''}`}>{kind === 'plan' && !total ? row.wbsCode || '-' : ''}</TableCell>
          </> : <>
            <TableCell className="px-2 py-2 text-muted-foreground">
              {kind === 'plan' && !total ? <div><div className="font-medium text-foreground">{row.label}</div><div className="mt-0.5 text-caption-2xs text-muted-foreground">{row.wbsCode || 'WBS 미지정'} · {row.ownerName} · {regionLabels[row.region]}</div></div> : null}
            </TableCell>
            <TableCell className="px-2 py-2">{kind === 'plan' && !total ? <SourceBadge value={row.source} /> : null}</TableCell>
          </>}
          <TableCell style={sourceCompatible ? { left: 502 } : undefined} className={`px-2 py-2 font-medium text-muted-foreground ${sourceCompatible ? 'lg:sticky lg:z-10 bg-card' : ''}`}>{rowKindLabels[kind]}</TableCell>
          {months.map((month) => <AmountCells sourceCompatible={sourceCompatible} key={month.month} month={getMonthForKind(row.months[month.month - 1], kind)} kind={kind} />)}
          <AmountCells sourceCompatible={sourceCompatible} month={getMonthForKind(row.total, kind)} kind={kind} isTotal />
        </TableRow>
      ))}
    </>
  );
}

function createTotalRow(months: CrmBusinessPlanPerformanceMonth[]): CrmBusinessPlanPerformanceRow {
  const total = months.reduce((sum, month) => ({
    month: 0,
    planRevenueAmount: sum.planRevenueAmount + month.planRevenueAmount, planCostAmount: sum.planCostAmount + month.planCostAmount,
    planMarginAmount: sum.planMarginAmount + month.planMarginAmount, actualRevenueAmount: sum.actualRevenueAmount + month.actualRevenueAmount,
    actualCostAmount: sum.actualCostAmount + month.actualCostAmount, actualMarginAmount: sum.actualMarginAmount + month.actualMarginAmount,
    revenueGapAmount: sum.revenueGapAmount + month.revenueGapAmount, costGapAmount: sum.costGapAmount + month.costGapAmount, marginGapAmount: sum.marginGapAmount + month.marginGapAmount,
  }), { month: 0, planRevenueAmount: 0, planCostAmount: 0, planMarginAmount: 0, actualRevenueAmount: 0, actualCostAmount: 0, actualMarginAmount: 0, revenueGapAmount: 0, costGapAmount: 0, marginGapAmount: 0 });
  return { key: '__total__', label: '', businessType: '합계', industryLine: '', ownerName: '', region: 'unspecified', source: 'mixed', months, total };
}

function SourceBadge({ value }: { value: CrmBusinessPlanPerformanceSource }) {
  const variant = value === 'pipeline' ? 'outline' : value === 'contract' || value === 'confirmed-cost' ? 'secondary' : 'default';
  return <Badge variant={variant}>{sourceLabels[value]}</Badge>;
}

function getMonthForKind(month: CrmBusinessPlanPerformanceMonth | undefined, kind: PerformanceRowKind): Pick<CrmBusinessPlanPerformanceMonth, 'planRevenueAmount' | 'planCostAmount' | 'planMarginAmount'> {
  const value = month ?? {
    month: 0,
    planRevenueAmount: 0,
    planCostAmount: 0,
    planMarginAmount: 0,
    actualRevenueAmount: 0,
    actualCostAmount: 0,
    actualMarginAmount: 0,
    revenueGapAmount: 0,
    costGapAmount: 0,
    marginGapAmount: 0,
  };
  if (kind === 'actual') {
    return {
      planRevenueAmount: value.actualRevenueAmount,
      planCostAmount: value.actualCostAmount,
      planMarginAmount: value.actualMarginAmount,
    };
  }
  if (kind === 'gap') {
    return {
      planRevenueAmount: value.revenueGapAmount,
      planCostAmount: value.costGapAmount,
      planMarginAmount: value.marginGapAmount,
    };
  }
  return value;
}

function AmountCells({
  month,
  kind,
  isTotal = false,
  sourceCompatible = false,
}: {
  month: Pick<CrmBusinessPlanPerformanceMonth, 'planRevenueAmount' | 'planCostAmount' | 'planMarginAmount'>;
  kind: PerformanceRowKind;
  isTotal?: boolean;
  sourceCompatible?: boolean;
}) {
  const weight = isTotal ? 'font-semibold' : 'font-normal';
  const tone = kind === 'gap' && month.planRevenueAmount < 0 ? 'text-ssoo-danger' : kind === 'gap' && month.planRevenueAmount > 0 ? 'text-ssoo-info' : 'text-muted-foreground';
  return (
    <>
      <TableCell className={`px-2 py-2 text-right ${tone} ${weight}`}>{formatTableAmount(month.planRevenueAmount, sourceCompatible)}</TableCell>
      <TableCell className={`px-2 py-2 text-right text-muted-foreground ${weight}`}>{formatTableAmount(month.planCostAmount, sourceCompatible)}</TableCell>
      <TableCell className={`px-2 py-2 text-right ${month.planMarginAmount < 0 ? 'text-ssoo-danger' : month.planMarginAmount > 0 ? 'text-ssoo-info' : 'text-muted-foreground'} ${weight}`}>{formatTableAmount(month.planMarginAmount, sourceCompatible)}</TableCell>
    </>
  );
}
