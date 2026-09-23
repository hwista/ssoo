'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, Plus, RefreshCw, RotateCcw, Save, Search, Trash2 } from 'lucide-react';
import type {
  CrmBusinessPlan,
  CrmBusinessPlanListResponse,
  CrmBusinessPlanPreviewRegion,
  CrmBusinessPlanPreviewResponse,
  CrmBusinessPlanPreviewRow,
  CrmBusinessPlanPreviewYear,
} from '@ssoo/types/crm';
import { Badge, Button, Input, NativeSelect, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';
import { SSOO_CONTENT_PAGE_METRICS, SSOO_PAGE_CHROME_METRICS, SsooSearchInput } from '@ssoo/web-shell';
import { useAuthStore } from '@/stores/auth.store';
import { useCrmBusinessYearOptions } from '@/lib/crmCommonCodeOptions';
import { useCrmDomainAccess } from '@/lib/useCrmDomainAccess';
import {
  normalizeBusinessPlanPreviewQuery,
  toRequiredBusinessPlanPreviewQuery,
  type BusinessPlanPreviewWorkspaceQuery,
} from './businessPlanPreviewQuery';
import {
  applyBusinessPlanGridPaste,
  createEmptyBusinessPlanGridDraft,
  toBusinessPlanGridDraft,
  toBusinessPlanRowRequest,
  type BusinessPlanGridDraft,
} from './businessPlanGrid';

export { normalizeBusinessPlanPreviewQuery } from './businessPlanPreviewQuery';

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

const regionLabels: Record<CrmBusinessPlanPreviewRegion, string> = {
  all: '전체',
  domestic: '국내',
  overseas: '해외',
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

function buildApiHref(query: BusinessPlanPreviewWorkspaceQuery) {
  const params = new URLSearchParams();
  params.set('baseYear', String(query.baseYear));
  if (query.businessType) params.set('businessType', query.businessType);
  if (query.industryLine) params.set('industryLine', query.industryLine);
  if (query.region !== 'all') params.set('region', query.region);
  if (query.search) params.set('search', query.search);
  return `/api/crm/business-plan/preview?${params.toString()}`;
}

function buildPlansApiHref(query: BusinessPlanPreviewWorkspaceQuery) {
  const params = new URLSearchParams();
  params.set('baseYear', String(query.baseYear));
  return `/api/crm/business-plan/plans?${params.toString()}`;
}

function getBackendErrorMessage(responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null): string {
  if (!responseBody || responseBody.success === true) {
    return '사업계획 preview 조회 중 오류가 발생했습니다.';
  }

  return responseBody.error?.message || responseBody.message || '사업계획 preview 조회 중 오류가 발생했습니다.';
}

function getYearOptions(baseYear: number) {
  const currentYear = new Date().getFullYear();
  return [...new Set([baseYear, currentYear - 1, currentYear, currentYear + 1, currentYear + 2])]
    .sort((left, right) => left - right);
}

export function BusinessPlanPreviewWorkspaceClient({
  data,
  query,
}: {
  data: CrmBusinessPlanPreviewResponse;
  query: BusinessPlanPreviewWorkspaceQuery;
}) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const { access: domainAccess, error: domainAccessError } = useCrmDomainAccess(accessToken);
  const canWriteBusinessPlan = domainAccess?.features.canWriteBusinessPlan === true;
  const canConfirmBusinessPlan = domainAccess?.features.canConfirmBusinessPlan === true;
  const canDeleteBusinessPlan = domainAccess?.features.canDeleteBusinessPlan === true;
  const [currentData, setCurrentData] = useState(data);
  const [planData, setPlanData] = useState<CrmBusinessPlanListResponse | null>(null);
  const [isReloading, setIsReloading] = useState(data.rows.length === 0);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [isSnapshotSaving, setIsSnapshotSaving] = useState(false);
  const [isCarryForwardSaving, setIsCarryForwardSaving] = useState(false);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planNotice, setPlanNotice] = useState<string | null>(null);
  const apiHref = useMemo(() => buildApiHref(query), [query]);
  const plansApiHref = useMemo(() => buildPlansApiHref(query), [query]);
  const businessYears = useCrmBusinessYearOptions(query.baseYear, getYearOptions(query.baseYear));
  const yearOptions = businessYears.years;

  useEffect(() => {
    setCurrentData(data);
    if (data.rows.length > 0) {
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
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmBusinessPlanPreviewResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setCurrentData(payload.data);
      return payload.data;
    } catch (error) {
      if (signal?.aborted) {
        return null;
      }
      setLoadError(error instanceof Error ? error.message : '사업계획 preview 조회에 실패했습니다.');
      return null;
    } finally {
      if (!signal?.aborted) {
        setIsReloading(false);
      }
    }
  }, [accessToken, apiHref]);

  const loadPlans = useCallback(async (signal?: AbortSignal) => {
    if (!accessToken) {
      return null;
    }

    setIsPlanLoading(true);
    setPlanError(null);
    try {
      const response = await fetch(plansApiHref, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmBusinessPlanListResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setPlanData(payload.data);
      return payload.data;
    } catch (error) {
      if (signal?.aborted) {
        return null;
      }
      setPlanError(error instanceof Error ? error.message : '사업계획 차수 조회에 실패했습니다.');
      return null;
    } finally {
      if (!signal?.aborted) {
        setIsPlanLoading(false);
      }
    }
  }, [accessToken, plansApiHref]);

  const saveSnapshot = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setIsSnapshotSaving(true);
    setPlanError(null);
    setPlanNotice(null);
    try {
      const response = await fetch('/api/crm/business-plan/plans/snapshot', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...toRequiredBusinessPlanPreviewQuery(query),
          planName: `${query.baseYear} CRM 사업계획 Snapshot`,
          memo: 'CRM preview에서 저장한 사업계획 차수입니다.',
        }),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmBusinessPlan> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      await loadPlans();
      setPlanNotice('최초 사업계획 차수가 생성되었습니다.');
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : '사업계획 차수 저장에 실패했습니다.');
    } finally {
      setIsSnapshotSaving(false);
    }
  }, [accessToken, loadPlans, query]);

  const carryForwardSnapshot = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    setIsCarryForwardSaving(true);
    setPlanError(null);
    setPlanNotice(null);
    try {
      const response = await fetch('/api/crm/business-plan/plans/carry-forward', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...toRequiredBusinessPlanPreviewQuery(query),
          sourceBaseYear: query.baseYear - 1,
          planName: `${query.baseYear} CRM 사업계획 전년 이월`,
          memo: `${query.baseYear - 1}년 확정 사업계획을 ${query.baseYear}년 draft 차수로 이월했습니다.`,
        }),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmBusinessPlan> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      await loadPlans();
      setPlanNotice('전년 이월실적 불러오기 확인');
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : '전년 사업계획 이월에 실패했습니다.');
    } finally {
      setIsCarryForwardSaving(false);
    }
  }, [accessToken, loadPlans, query]);

  const runPlanWorkflow = useCallback(async (plan: CrmBusinessPlan, action: 'confirm' | 'reopen') => {
    if (!accessToken) {
      return;
    }
    setBusyPlanId(plan.id);
    setPlanError(null);
    setPlanNotice(null);
    try {
      const response = await fetch(`/api/crm/business-plan/plans/${encodeURIComponent(plan.id)}/${action}`, {
        method: 'POST',
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmBusinessPlan> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      await loadPlans();
      setPlanNotice(action === 'confirm' ? '사업계획이 확정되었습니다.' : '사업계획 확정이 해제되었습니다.');
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : '사업계획 차수 상태 변경에 실패했습니다.');
    } finally {
      setBusyPlanId(null);
    }
  }, [accessToken, loadPlans]);

  useEffect(() => {
    const abortController = new AbortController();
    void loadPreview(abortController.signal);
    void loadPlans(abortController.signal);
    return () => abortController.abort();
  }, [loadPlans, loadPreview]);

  if (query.mode === 'source-compatible') {
    return (
      <main className="h-full min-h-0 min-w-0 overflow-auto bg-ssoo-content-bg p-4" data-source-surface="business-plan">
        <div className="mx-auto w-full min-w-0" style={{ maxWidth: SSOO_CONTENT_PAGE_METRICS.landscapeContentWidthPx }}>
          <h1 className="text-xl font-semibold text-foreground">사업계획 등록</h1>
          <p className="mt-1 text-sm text-muted-foreground">년도별 사업계획을 입력합니다.</p>
          <BusinessPlanLedgerPanel
            canWrite={canWriteBusinessPlan}
            canConfirm={canConfirmBusinessPlan}
            canDelete={canDeleteBusinessPlan}
            planData={planData}
            isLoading={isPlanLoading}
            isSnapshotSaving={isSnapshotSaving}
            isCarryForwardSaving={isCarryForwardSaving}
            busyPlanId={busyPlanId}
            error={planError}
            notice={planNotice}
            accessToken={accessToken}
            previewRowCount={currentData.rows.length}
            onReload={() => loadPlans()}
            onSaveSnapshot={() => void saveSnapshot()}
            onCarryForward={() => void carryForwardSnapshot()}
            onConfirm={(plan) => void runPlanWorkflow(plan, 'confirm')}
            onReopen={(plan) => void runPlanWorkflow(plan, 'reopen')}
            sourceCompatible
            baseYear={query.baseYear}
            yearOptions={yearOptions}
          />
        </div>
      </main>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-ssoo-content-bg">
      <header className="border-b bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">CRM Business Plan Preview</p>
            <h1 className="mt-1 text-xl font-semibold text-foreground">사업계획 Preview</h1>
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
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Metric label="Preview 범위" value={`${currentData.summary.baseYear}~${currentData.summary.baseYear + currentData.summary.yearCount - 1}`} sub={`${currentData.summary.rowCount}개 사업/계열 후보`} />
          <Metric label="Pipeline 후보" value={formatEok(currentData.summary.pipelineAmountTotal)} sub={formatWon(currentData.summary.pipelineAmountTotal)} />
          <Metric label="계약 계획" value={formatEok(currentData.summary.contractPlanAmountTotal)} sub={formatWon(currentData.summary.contractPlanAmountTotal)} />
          <Metric label="계약 실적" value={formatEok(currentData.summary.contractActualAmountTotal)} sub={formatWon(currentData.summary.contractActualAmountTotal)} />
          <Metric label="실적 Gap" value={formatEok(currentData.summary.actualGapAmountTotal)} sub={formatWon(currentData.summary.actualGapAmountTotal)} />
        </section>

        <BusinessPlanLedgerPanel
          canWrite={canWriteBusinessPlan}
          canConfirm={canConfirmBusinessPlan}
          canDelete={canDeleteBusinessPlan}
          planData={planData}
          isLoading={isPlanLoading}
          isSnapshotSaving={isSnapshotSaving}
          isCarryForwardSaving={isCarryForwardSaving}
          busyPlanId={busyPlanId}
          error={planError}
          notice={planNotice}
          accessToken={accessToken}
          previewRowCount={currentData.rows.length}
          onReload={() => loadPlans()}
          onSaveSnapshot={() => void saveSnapshot()}
          onCarryForward={() => void carryForwardSnapshot()}
          onConfirm={(plan) => void runPlanWorkflow(plan, 'confirm')}
          onReopen={(plan) => void runPlanWorkflow(plan, 'reopen')}
        />

        <section className="mt-4 rounded-md border bg-card">
          <form action="/business-plan" className="flex flex-wrap items-end gap-3 border-b p-4">
            <label className="w-[132px] text-sm font-medium text-muted-foreground">
              기준년도
              <NativeSelect name="baseYear" defaultValue={String(query.baseYear)} className="mt-1">
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
              <SsooSearchInput id="crm-business-plan-search-input" name="search" ariaLabel="사업계획 검색" intent="data-filter" defaultValue={query.search} placeholder="고객, 건명, 담당자, WBS" className="mt-1" />
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
          {domainAccess && !canWriteBusinessPlan ? (
            <div className="border-b bg-ssoo-warning-bg px-4 py-3 text-sm text-ssoo-warning">사업계획 변경 권한이 없어 조회 전용으로 표시합니다.</div>
          ) : null}
          {domainAccessError ? (
            <div className="border-b bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger">{domainAccessError}</div>
          ) : null}

          <div className="border-b px-4 py-2 text-xs text-muted-foreground">
            단위: 억원 · Pipeline은 실주/보류 제외 영업기회, 계약 계획/실적은 확정 계약 청구 read model 기준
          </div>
          <YearSummary years={currentData.years} />
          <BusinessPlanTable rows={currentData.rows} years={currentData.years} isLoading={isReloading} />
          <div className="border-t px-4 py-3 text-xs text-muted-foreground">
            {currentData.summary.rowCount}개 후보 · 저장 차수에서 3개년 매출·외부원가, 행 CRUD, 붙여넣기, 확정·해제를 관리합니다.
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

function BusinessPlanLedgerPanel({
  canWrite,
  canConfirm,
  canDelete,
  planData,
  isLoading,
  isSnapshotSaving,
  isCarryForwardSaving,
  busyPlanId,
  error,
  notice,
  accessToken,
  previewRowCount,
  onReload,
  onSaveSnapshot,
  onCarryForward,
  onConfirm,
  onReopen,
  sourceCompatible = false,
  baseYear,
  yearOptions = [],
}: {
  canWrite: boolean;
  canConfirm: boolean;
  canDelete: boolean;
  planData: CrmBusinessPlanListResponse | null;
  isLoading: boolean;
  isSnapshotSaving: boolean;
  isCarryForwardSaving: boolean;
  busyPlanId: string | null;
  error: string | null;
  notice: string | null;
  accessToken: string | null;
  previewRowCount: number;
  onReload: () => Promise<unknown>;
  onSaveSnapshot: () => void;
  onCarryForward: () => void;
  onConfirm: (plan: CrmBusinessPlan) => void;
  onReopen: (plan: CrmBusinessPlan) => void;
  sourceCompatible?: boolean;
  baseYear?: number;
  yearOptions?: number[];
}) {
  const plans = useMemo(() => planData?.items ?? [], [planData]);
  const latestPlan = plans[0];
  const confirmedPlan = plans.find((plan) => plan.confirmed) ?? null;
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const [versionBusy, setVersionBusy] = useState(false);
  useEffect(() => {
    if (plans.length === 0) {
      setSelectedPlanId('');
      return;
    }
    if (!selectedPlanId || !plans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(plans[0]?.id ?? '');
    }
  }, [plans, selectedPlanId]);
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? latestPlan ?? null;
  const selectedIsLatest = Boolean(selectedPlan && latestPlan?.id === selectedPlan.id);
  const selectedEditable = Boolean(canWrite && selectedPlan && selectedIsLatest && !selectedPlan.confirmed);
  const canCreateInitial = canWrite && plans.length === 0 && previewRowCount > 0 && !isSnapshotSaving;
  const canCarryForward = canWrite && plans.length === 0 && !isCarryForwardSaving && !isSnapshotSaving;

  const runVersionMutation = async (method: 'POST' | 'DELETE', href: string) => {
    if (!accessToken) return;
    setVersionBusy(true);
    setLocalError(null);
    setLocalNotice(null);
    try {
      const response = await fetch(href, {
        method,
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<unknown> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      const mutationData = 'data' in payload ? payload.data : null;
      const createdId = method === 'POST' && mutationData && typeof mutationData === 'object' && 'id' in mutationData
        ? (mutationData as { id?: unknown }).id
        : null;
      await onReload();
      if (typeof createdId === 'string') setSelectedPlanId(createdId);
      setLocalNotice(method === 'POST' ? '차수 추가가 완료되었습니다.' : '차수 삭제가 완료되었습니다.');
    } catch (mutationError) {
      setLocalError(mutationError instanceof Error ? mutationError.message : '사업계획 차수 처리에 실패했습니다.');
    } finally {
      setVersionBusy(false);
    }
  };

  if (sourceCompatible) {
    return (
      <section className="mt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <form action="/business-plan" className="flex flex-wrap items-end gap-3">
            <Input type="hidden" name="mode" value="source-compatible" />
            <div className="w-[160px]">
              <label className="mb-1 block text-sm text-muted-foreground">사업년도 *</label>
              <NativeSelect id="bp-year" name="baseYear" defaultValue={String(baseYear)}>{yearOptions.map((year) => <option key={year} value={year}>{year}년</option>)}</NativeSelect>
            </div>
            <div className="w-[140px]">
              <label className="mb-1 block text-sm text-muted-foreground">차수</label>
              <NativeSelect id="bp-version" value={selectedPlan?.id ?? ''} onChange={(event) => setSelectedPlanId(event.target.value)}>
                {plans.length === 0 ? <option value="">차수 없음</option> : plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.version}차 {plan.confirmed ? '✓' : ''}</option>)}
              </NativeSelect>
            </div>
            <Button type="submit" variant="outline">조회</Button>
          </form>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" type="button" onClick={onCarryForward} disabled={!canCarryForward}>↩ 전년이월실적 불러오기</Button>
            <Button variant="outline" type="button" disabled={!latestPlan?.confirmed || !canWrite || versionBusy} onClick={() => latestPlan ? void runVersionMutation('POST', `/api/crm/business-plan/plans/${encodeURIComponent(latestPlan.id)}/versions`) : undefined}>+ 차수 추가</Button>
            {latestPlan && !latestPlan.confirmed ? (
              <Button
                variant="outline"
                type="button"
                disabled={!canDelete || versionBusy}
                onClick={() => {
                  if (window.confirm(`${latestPlan.baseYear}년 ${latestPlan.version}차의 모든 행을 삭제하시겠습니까?`)) {
                    void runVersionMutation('DELETE', `/api/crm/business-plan/plans/${encodeURIComponent(latestPlan.id)}`);
                  }
                }}
              >
                최신 차수 삭제
              </Button>
            ) : null}
            {selectedPlan?.confirmed ? <Button variant="outline" type="button" onClick={() => onReopen(selectedPlan)} disabled={!canConfirm || busyPlanId === selectedPlan.id}>확정해제</Button> : selectedPlan ? <Button type="button" onClick={() => onConfirm(selectedPlan)} disabled={!canConfirm || busyPlanId === selectedPlan.id || selectedPlan.rows.length === 0}>확정</Button> : <Button type="button" onClick={onSaveSnapshot} disabled={!canCreateInitial}>최초 차수 생성</Button>}
          </div>
        </div>

        {selectedPlan ? (
          <div className={`mt-4 rounded-md border px-4 py-3 text-sm ${selectedPlan.confirmed ? 'border-ssoo-info/30 bg-ssoo-info-bg text-ssoo-info' : 'border-ssoo-warning/30 bg-ssoo-warning-bg text-ssoo-warning'}`}>
            {selectedPlan.confirmed ? `⚠ 확정 완료 — 담당자: 관리자 | 확정일시: ${selectedPlan.confirmedAt ? formatDateTime(selectedPlan.confirmedAt) : '-'}` : '작성 중인 사업계획 차수입니다.'}
          </div>
        ) : null}
        {notice || localNotice ? <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-foreground px-4 py-3 text-sm text-background shadow-lg" role="status">{notice ?? localNotice}</div> : null}
        {error || localError ? <div className="mt-3 rounded-md bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger">{error ?? localError}</div> : null}
        {isLoading ? <div className="mt-4 text-sm text-ssoo-info">사업계획 차수를 불러오는 중입니다.</div> : null}
        {!isLoading && !selectedPlan ? <div className="mt-4 rounded-md border bg-card px-4 py-5 text-sm text-muted-foreground">저장된 차수가 없습니다. 최초 차수를 생성하거나 전년이월실적을 불러오세요.</div> : null}
        {selectedPlan ? <div className="mt-5 overflow-hidden rounded-xl border bg-card"><BusinessPlanSourceGrid plan={selectedPlan} editable={selectedEditable} accessToken={accessToken} onReload={onReload} sourceCompatible /></div> : null}
      </section>
    );
  }

  return (
    <section className="mt-4 rounded-md border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-foreground">사업계획 차수 원장</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {planData?.summary.boundaryNotice ?? '현재 preview를 기준년도별 draft 차수로 저장하고 확정 상태를 관리합니다.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" type="button" onClick={onReload} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            차수 새로고침
          </Button>
          <Button variant="outline" size="sm" type="button" onClick={onCarryForward} disabled={!canCarryForward}>
            <Copy className="mr-2 h-4 w-4" />
            전년 이월
          </Button>
          {latestPlan?.confirmed ? (
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={!canWrite || versionBusy}
              onClick={() => void runVersionMutation('POST', `/api/crm/business-plan/plans/${encodeURIComponent(latestPlan.id)}/versions`)}
            >
              <Copy className="mr-2 h-4 w-4" />
              다음 차수 추가
            </Button>
          ) : null}
          {latestPlan && !latestPlan.confirmed ? (
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={!canDelete || versionBusy}
              onClick={() => {
                if (window.confirm(`${latestPlan.baseYear}년 ${latestPlan.version}차의 모든 행을 삭제하시겠습니까?`)) {
                  void runVersionMutation('DELETE', `/api/crm/business-plan/plans/${encodeURIComponent(latestPlan.id)}`);
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              최신 차수 삭제
            </Button>
          ) : null}
          <Button size="sm" type="button" onClick={onSaveSnapshot} disabled={!canCreateInitial}>
            <Save className="mr-2 h-4 w-4" />
            최초 차수 생성
          </Button>
        </div>
      </div>

      {error || localError ? (
        <div className="flex items-center gap-2 border-b bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger">
          <AlertCircle className="h-4 w-4" />
          {error ?? localError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-3">
        <LedgerMetric label="저장 차수" value={`${planData?.summary.rowCount ?? 0}개`} sub={`draft ${planData?.summary.draftCount ?? 0} · confirmed ${planData?.summary.confirmedCount ?? 0}`} />
        <LedgerMetric label="최신 차수" value={latestPlan ? `v${latestPlan.version}` : '-'} sub={latestPlan?.planName ?? '저장된 차수가 없습니다.'} />
        <LedgerMetric label="확정 차수" value={confirmedPlan ? `v${confirmedPlan.version}` : '-'} sub={confirmedPlan?.planName ?? '확정된 차수가 없습니다.'} />
      </div>

      <div className="border-t px-4 py-3">
        {isLoading ? (
          <div className="text-sm text-ssoo-info">사업계획 차수를 불러오는 중입니다.</div>
        ) : plans.length === 0 ? (
          <div className="text-sm text-muted-foreground">현재 기준년도에 저장된 사업계획 차수가 없습니다.</div>
        ) : (
          <div className="grid min-w-0 grid-cols-1 gap-2">
            <label className="w-full min-w-0 max-w-[360px] text-xs font-medium text-muted-foreground">
              조회 차수
              <NativeSelect value={selectedPlan?.id ?? ''} onChange={(event) => setSelectedPlanId(event.target.value)} className="mt-1">
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>v{plan.version} · {plan.confirmed ? '확정' : 'draft'} · {plan.planName}</option>
                ))}
              </NativeSelect>
            </label>
            {plans.map((plan, index) => (
              <div key={plan.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-left ${selectedPlan?.id === plan.id ? 'border-primary bg-primary/5' : 'bg-ssoo-content-bg'}`}>
                <Button
                  type="button"
                  variant="ghost"
                  size="plain"
                  onClick={() => setSelectedPlanId(plan.id)}
                  className="min-w-0 flex-[1_1_240px] justify-start whitespace-normal break-words p-0 text-left hover:bg-transparent"
                  aria-pressed={selectedPlan?.id === plan.id}
                >
                  <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 font-medium text-foreground">{plan.planName}</span>
                    <Badge variant={plan.confirmed ? 'default' : 'outline'}>{plan.confirmed ? '확정' : 'draft'}</Badge>
                    <span className="min-w-0 text-xs text-muted-foreground">{plan.code}</span>
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    v{plan.version} · {plan.baseYear} 기준 · 매출 {formatEok(plan.planCandidateAmountTotal)} · 외부원가 {formatEok(plan.planExternalCostAmountTotal)} · {plan.rows.length}행
                  </span>
                  </span>
                </Button>
                <div className="flex flex-wrap gap-2">
                  {index === 0 && plan.confirmed ? (
                    <Button variant="outline" size="sm" type="button" onClick={(event) => { event.stopPropagation(); onReopen(plan); }} disabled={!canConfirm || busyPlanId === plan.id}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      확정 해제
                    </Button>
                  ) : index === 0 ? (
                    <Button variant="outline" size="sm" type="button" onClick={(event) => { event.stopPropagation(); onConfirm(plan); }} disabled={!canConfirm || busyPlanId === plan.id || plan.rows.length === 0}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      확정
                    </Button>
                  ) : <Badge variant="outline">읽기 전용</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPlan ? (
        <BusinessPlanSourceGrid
          plan={selectedPlan}
          editable={selectedEditable}
          accessToken={accessToken}
          onReload={onReload}
        />
      ) : null}
    </section>
  );
}

function BusinessPlanSourceGrid({
  plan,
  editable,
  accessToken,
  onReload,
  sourceCompatible = false,
}: {
  plan: CrmBusinessPlan;
  editable: boolean;
  accessToken: string | null;
  onReload: () => void;
  sourceCompatible?: boolean;
}) {
  const [drafts, setDrafts] = useState<BusinessPlanGridDraft[]>(() => (
    plan.rows.map((row) => toBusinessPlanGridDraft(row, plan.baseYear))
  ));
  const [busy, setBusy] = useState(false);
  const [gridError, setGridError] = useState<string | null>(null);
  const [gridNotice, setGridNotice] = useState<string | null>(null);
  useEffect(() => {
    setDrafts(plan.rows.map((row) => toBusinessPlanGridDraft(row, plan.baseYear)));
    setGridError(null);
    setGridNotice(null);
  }, [plan]);

  const updateDraft = <K extends keyof BusinessPlanGridDraft>(index: number, key: K, value: BusinessPlanGridDraft[K]) => {
    setDrafts((current) => current.map((draft, draftIndex) => (
      draftIndex === index ? { ...draft, [key]: value } : draft
    )));
  };

  const saveRows = async () => {
    if (!accessToken || !editable) return;
    setBusy(true);
    setGridError(null);
    setGridNotice(null);
    try {
      for (const [index, draft] of drafts.entries()) {
        let body;
        try {
          body = toBusinessPlanRowRequest(draft);
        } catch (validationError) {
          throw new Error(`${index + 1}행: ${validationError instanceof Error ? validationError.message : '입력값을 확인해 주세요.'}`);
        }
        const href = draft.rowCode
          ? `/api/crm/business-plan/plans/${encodeURIComponent(plan.id)}/rows/${encodeURIComponent(draft.rowCode)}`
          : `/api/crm/business-plan/plans/${encodeURIComponent(plan.id)}/rows`;
        const response = await fetch(href, {
          method: draft.rowCode ? 'PUT' : 'POST',
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        const payload = await response.json().catch(() => null) as BackendSuccessResponse<unknown> | BackendErrorResponse | null;
        if (!response.ok || payload?.success !== true) {
          throw new Error(`${index + 1}행: ${getBackendErrorMessage(payload)}`);
        }
      }
      setGridNotice(`${drafts.length}개 사업계획 행을 저장했습니다.`);
      onReload();
    } catch (saveError) {
      setGridError(saveError instanceof Error ? saveError.message : '사업계획 행 저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const deleteRow = async (index: number) => {
    const draft = drafts[index];
    if (!draft || !editable || !accessToken) return;
    if (!draft.rowCode) {
      setDrafts((current) => current.filter((_, currentIndex) => currentIndex !== index));
      return;
    }
    if (!window.confirm(`${index + 1}행 '${draft.businessName}'을 삭제하시겠습니까?`)) return;
    setBusy(true);
    setGridError(null);
    try {
      const response = await fetch(
        `/api/crm/business-plan/plans/${encodeURIComponent(plan.id)}/rows/${encodeURIComponent(draft.rowCode)}`,
        { method: 'DELETE', cache: 'no-store', headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<unknown> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) throw new Error(getBackendErrorMessage(payload));
      setGridNotice('사업계획 행을 삭제했습니다.');
      onReload();
    } catch (deleteError) {
      setGridError(deleteError instanceof Error ? deleteError.message : '사업계획 행 삭제에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const saveConfirmedWbs = async (index: number) => {
    const draft = drafts[index];
    if (!draft?.rowCode || editable || !accessToken) return;
    setBusy(true);
    setGridError(null);
    setGridNotice(null);
    try {
      const response = await fetch(
        `/api/crm/business-plan/plans/${encodeURIComponent(plan.id)}/rows/${encodeURIComponent(draft.rowCode)}/wbs`,
        {
          method: 'PUT',
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ wbsCode: draft.wbsCode }),
        },
      );
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<unknown> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) throw new Error(getBackendErrorMessage(payload));
      setGridNotice(`${index + 1}행 WBS 코드를 저장했습니다.`);
      onReload();
    } catch (wbsError) {
      setGridError(wbsError instanceof Error ? wbsError.message : 'WBS 코드 저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const periodLabels = [
    ...Array.from({ length: 12 }, (_, index) => `${index + 1}월`),
    `${plan.baseYear + 1}년`,
    `${plan.baseYear + 2}년`,
  ];

  if (sourceCompatible) {
    const monthlyLabels = Array.from({ length: 12 }, (_, index) => `${index + 1}월`);
    const amount = (value: string) => Number(value.replace(/,/g, '')) || 0;
    return (
      <div>
        {gridError ? <div className="border-b bg-ssoo-danger-bg px-4 py-2 text-sm text-ssoo-danger">{gridError}</div> : null}
        {gridNotice ? <div className="border-b bg-ssoo-success-bg px-4 py-2 text-sm text-ssoo-success">{gridNotice}</div> : null}
        {editable ? (
          <div className="flex justify-end gap-2 border-b px-4 py-3">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setDrafts((current) => [...current, createEmptyBusinessPlanGridDraft()])}>+ 행 추가</Button>
            <Button type="button" disabled={busy || drafts.length === 0} onClick={() => void saveRows()}>{busy ? '저장 중' : '저장'}</Button>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <Table className="min-w-[4700px] text-xs">
            <TableHeader className="bg-muted/60 text-muted-foreground">
              <TableRow>
                <TableHead rowSpan={3} className="w-[132px] px-2">사업구분</TableHead>
                <TableHead rowSpan={3} className="w-[132px] px-2">계열구분</TableHead>
                <TableHead rowSpan={3} className="w-[100px] px-2">국내/해외</TableHead>
                <TableHead rowSpan={3} className="w-[180px] px-2">사업명</TableHead>
                <TableHead rowSpan={3} className="w-[140px] px-2">WBS코드</TableHead>
                <TableHead colSpan={36} className="text-center">{plan.baseYear}년 (월별)</TableHead>
                <TableHead colSpan={3} className="text-center">{plan.baseYear}년 합계</TableHead>
                <TableHead colSpan={3} className="text-center">{plan.baseYear + 1}년 (연간)</TableHead>
                <TableHead colSpan={3} className="text-center">{plan.baseYear + 2}년 (연간)</TableHead>
              </TableRow>
              <TableRow>
                {monthlyLabels.map((label) => <TableHead key={label} colSpan={3} className="text-center">{label}</TableHead>)}
                <TableHead colSpan={3} className="text-center">{plan.baseYear}년 합계</TableHead>
                <TableHead colSpan={3} className="text-center">{plan.baseYear + 1}년 합계</TableHead>
                <TableHead colSpan={3} className="text-center">{plan.baseYear + 2}년 합계</TableHead>
              </TableRow>
              <TableRow>
                {Array.from({ length: 15 }, (_, index) => <Fragment key={index}><TableHead className="w-[98px] text-right">매출</TableHead><TableHead className="w-[98px] text-right">외부원가</TableHead><TableHead className="w-[98px] text-right">손익</TableHead></Fragment>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {drafts.length === 0 ? <TableRow><TableCell colSpan={50} className="px-3 py-8 text-left text-muted-foreground">등록된 사업계획 행이 없습니다.</TableCell></TableRow> : drafts.map((draft, rowIndex) => {
                const monthPairs = Array.from({ length: 12 }, (_, index) => [draft.amounts[index * 2] ?? '', draft.amounts[index * 2 + 1] ?? ''] as const);
                const totalRevenue = monthPairs.reduce((sum, pair) => sum + amount(pair[0]), 0);
                const totalCost = monthPairs.reduce((sum, pair) => sum + amount(pair[1]), 0);
                const annualPairs = [
                  [String(totalRevenue), String(totalCost)] as const,
                  [draft.amounts[24] ?? '', draft.amounts[25] ?? ''] as const,
                  [draft.amounts[26] ?? '', draft.amounts[27] ?? ''] as const,
                ];
                return (
                  <TableRow key={draft.rowCode ?? `new-${rowIndex}`}>
                    <TableCell className="px-1"><Input disabled={!editable} value={draft.businessType} onChange={(event) => updateDraft(rowIndex, 'businessType', event.target.value)} /></TableCell>
                    <TableCell className="px-1"><Input disabled={!editable} value={draft.industryLine} onChange={(event) => updateDraft(rowIndex, 'industryLine', event.target.value)} /></TableCell>
                    <TableCell className="px-1"><NativeSelect disabled={!editable} value={draft.region} onChange={(event) => updateDraft(rowIndex, 'region', event.target.value as 'domestic' | 'overseas')}><option value="domestic">국내</option><option value="overseas">해외</option></NativeSelect></TableCell>
                    <TableCell className="px-1"><Input disabled={!editable} value={draft.businessName} onChange={(event) => updateDraft(rowIndex, 'businessName', event.target.value)} /></TableCell>
                    <TableCell className="px-1"><Input disabled={busy || (!editable && !draft.rowCode)} value={draft.wbsCode} placeholder="WBS코드" onChange={(event) => updateDraft(rowIndex, 'wbsCode', event.target.value)} onBlur={() => void saveConfirmedWbs(rowIndex)} /></TableCell>
                    {monthPairs.map((pair, periodIndex) => <SourceBusinessPlanAmountCells key={periodIndex} pair={pair} editable={editable} onChange={(offset, value) => { const amounts = [...draft.amounts]; amounts[periodIndex * 2 + offset] = value; updateDraft(rowIndex, 'amounts', amounts); }} onPaste={(offset, pasted) => {
                      const result = applyBusinessPlanGridPaste(drafts, rowIndex, (periodIndex * 2) + offset, pasted);
                      setDrafts(result.drafts);
                      setGridError(result.invalidCells.length > 0 ? `숫자로 해석할 수 없는 셀: ${result.invalidCells.join(', ')}` : null);
                      setGridNotice(result.invalidCells.length === 0 ? '붙여넣기 값을 그리드에 반영했습니다. 저장 전 검토해 주세요.' : null);
                    }} />)}
                    {annualPairs.map((pair, periodIndex) => <SourceBusinessPlanAmountCells key={`annual-${periodIndex}`} pair={pair} editable={editable && periodIndex > 0} onChange={(offset, value) => { if (periodIndex === 0) return; const amounts = [...draft.amounts]; const baseIndex = 24 + ((periodIndex - 1) * 2); amounts[baseIndex + offset] = value; updateDraft(rowIndex, 'amounts', amounts); }} onPaste={periodIndex === 0 ? undefined : (offset, pasted) => {
                      const result = applyBusinessPlanGridPaste(drafts, rowIndex, 24 + ((periodIndex - 1) * 2) + offset, pasted);
                      setDrafts(result.drafts);
                      setGridError(result.invalidCells.length > 0 ? `숫자로 해석할 수 없는 셀: ${result.invalidCells.join(', ')}` : null);
                      setGridNotice(result.invalidCells.length === 0 ? '붙여넣기 값을 그리드에 반영했습니다. 저장 전 검토해 주세요.' : null);
                    }} />)}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-foreground">원본 호환 3개년 입력 그리드</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {plan.baseYear}년은 12개월 매출·외부원가, 이후 2개년은 연간 매출·외부원가입니다. 숫자 셀에서 탭/줄바꿈 표를 붙여넣을 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editable ? (
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setDrafts((current) => [...current, createEmptyBusinessPlanGridDraft()])}>
              <Plus className="mr-2 h-4 w-4" />
              행 추가
            </Button>
          ) : <Badge variant="outline">확정 또는 이전 차수 · WBS만 편집 가능</Badge>}
          <Button type="button" size="sm" disabled={!editable || busy || drafts.length === 0} onClick={() => void saveRows()}>
            <Save className="mr-2 h-4 w-4" />
            전체 행 저장
          </Button>
        </div>
      </div>
      {gridError ? <div className="border-t bg-ssoo-danger-bg px-4 py-2 text-sm text-ssoo-danger">{gridError}</div> : null}
      {gridNotice ? <div className="border-t bg-ssoo-success-bg px-4 py-2 text-sm text-ssoo-success">{gridNotice}</div> : null}
      <div className="overflow-auto border-t">
        <Table className="min-w-[4300px] text-xs">
          <TableHeader>
            <TableRow>
              <TableHead rowSpan={2} className="w-[68px] px-2">작업</TableHead>
              <TableHead rowSpan={2} className="w-[140px] px-2">사업구분 *</TableHead>
              <TableHead rowSpan={2} className="w-[140px] px-2">계열/산업 *</TableHead>
              <TableHead rowSpan={2} className="w-[120px] px-2">담당자 *</TableHead>
              <TableHead rowSpan={2} className="w-[100px] px-2">국내/해외 *</TableHead>
              <TableHead rowSpan={2} className="w-[190px] px-2">사업명 *</TableHead>
              <TableHead rowSpan={2} className="w-[130px] px-2">WBS</TableHead>
              {periodLabels.map((label) => <TableHead key={label} colSpan={2} className="text-center">{label}</TableHead>)}
            </TableRow>
            <TableRow>
              {periodLabels.flatMap((label) => [
                <TableHead key={`${label}-revenue`} className="w-[112px] text-right">매출</TableHead>,
                <TableHead key={`${label}-cost`} className="w-[112px] text-right">외부원가</TableHead>,
              ])}
            </TableRow>
          </TableHeader>
          <TableBody>
            {drafts.length === 0 ? (
              <TableRow><TableCell colSpan={35} className="px-3 py-6 text-left text-muted-foreground"><span className="block w-[220px]">저장된 행이 없습니다. 최신 draft 차수에서 행을 추가해 주세요.</span></TableCell></TableRow>
            ) : drafts.map((draft, rowIndex) => (
              <TableRow key={draft.rowCode ?? `new-${rowIndex}`}>
                <TableCell className="px-2">
                  <Button type="button" variant="ghost" size="sm" disabled={!editable || busy} onClick={() => void deleteRow(rowIndex)} aria-label={`${rowIndex + 1}행 삭제`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
                <TableCell className="px-1"><Input disabled={!editable} value={draft.businessType} onChange={(event) => updateDraft(rowIndex, 'businessType', event.target.value)} /></TableCell>
                <TableCell className="px-1"><Input disabled={!editable} value={draft.industryLine} onChange={(event) => updateDraft(rowIndex, 'industryLine', event.target.value)} /></TableCell>
                <TableCell className="px-1"><Input disabled={!editable} value={draft.ownerName} onChange={(event) => updateDraft(rowIndex, 'ownerName', event.target.value)} /></TableCell>
                <TableCell className="px-1">
                  <NativeSelect disabled={!editable} value={draft.region} onChange={(event) => updateDraft(rowIndex, 'region', event.target.value as 'domestic' | 'overseas')}>
                    <option value="domestic">국내</option><option value="overseas">해외</option>
                  </NativeSelect>
                </TableCell>
                <TableCell className="px-1"><Input disabled={!editable} value={draft.businessName} onChange={(event) => updateDraft(rowIndex, 'businessName', event.target.value)} /></TableCell>
                <TableCell className="px-1">
                  <Input
                    disabled={busy || (!editable && !draft.rowCode)}
                    value={draft.wbsCode}
                    onChange={(event) => updateDraft(rowIndex, 'wbsCode', event.target.value)}
                    onBlur={() => void saveConfirmedWbs(rowIndex)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !editable) event.currentTarget.blur();
                    }}
                    aria-label={`${rowIndex + 1}행 WBS`}
                  />
                </TableCell>
                {draft.amounts.map((value, cellIndex) => (
                  <TableCell key={cellIndex} className="px-1">
                    <Input
                      disabled={!editable}
                      inputMode="decimal"
                      value={value}
                      className="min-w-[108px] text-right tabular-nums"
                      onChange={(event) => {
                        const amounts = [...draft.amounts];
                        amounts[cellIndex] = event.target.value;
                        updateDraft(rowIndex, 'amounts', amounts);
                      }}
                      onPaste={(event) => {
                        if (!editable) return;
                        const pasted = event.clipboardData.getData('text');
                        if (!pasted.includes('\t') && !pasted.includes('\n') && !pasted.includes('\r')) return;
                        event.preventDefault();
                        const result = applyBusinessPlanGridPaste(drafts, rowIndex, cellIndex, pasted);
                        setDrafts(result.drafts);
                        setGridError(result.invalidCells.length > 0 ? `숫자로 해석할 수 없는 셀: ${result.invalidCells.join(', ')}` : null);
                        if (result.invalidCells.length === 0) setGridNotice('붙여넣기 값을 그리드에 반영했습니다. 저장 전 검토해 주세요.');
                      }}
                      aria-label={`${rowIndex + 1}행 ${Math.floor(cellIndex / 2) + 1}${cellIndex % 2 === 0 ? ' 매출' : ' 외부원가'}`}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SourceBusinessPlanAmountCells({
  pair,
  editable,
  onChange,
  onPaste,
}: {
  pair: readonly [string, string];
  editable: boolean;
  onChange: (offset: number, value: string) => void;
  onPaste?: (offset: number, text: string) => void;
}) {
  const revenue = Number(pair[0].replace(/,/g, '')) || 0;
  const cost = Number(pair[1].replace(/,/g, '')) || 0;
  return (
    <>
      <TableCell className="px-1"><Input disabled={!editable} value={pair[0]} placeholder="0.00" className="min-w-[94px] text-right" onChange={(event) => onChange(0, event.target.value)} onPaste={(event) => {
        if (!editable || !onPaste) return;
        const pasted = event.clipboardData.getData('text');
        if (!pasted.includes('\t') && !pasted.includes('\n') && !pasted.includes('\r')) return;
        event.preventDefault();
        onPaste(0, pasted);
      }} /></TableCell>
      <TableCell className="px-1"><Input disabled={!editable} value={pair[1]} placeholder="0.00" className="min-w-[94px] text-right" onChange={(event) => onChange(1, event.target.value)} onPaste={(event) => {
        if (!editable || !onPaste) return;
        const pasted = event.clipboardData.getData('text');
        if (!pasted.includes('\t') && !pasted.includes('\n') && !pasted.includes('\r')) return;
        event.preventDefault();
        onPaste(1, pasted);
      }} /></TableCell>
      <TableCell className="px-2 text-right font-medium text-ssoo-info">{(revenue - cost).toLocaleString('ko-KR')}</TableCell>
    </>
  );
}

function LedgerMetric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border bg-ssoo-content-bg px-4 py-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
      <div className="mt-1 truncate text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function YearSummary({ years }: { years: CrmBusinessPlanPreviewYear[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 border-b p-4 lg:grid-cols-3">
      {years.map((year) => (
        <div key={year.year} className="rounded-md border bg-ssoo-content-bg px-4 py-3">
          <div className="text-sm font-semibold text-foreground">{year.year}년 후보</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span>Pipeline</span>
            <span className="text-right font-medium text-foreground">{formatEok(year.pipelineAmount)}</span>
            <span>계약 계획</span>
            <span className="text-right font-medium text-foreground">{formatEok(year.contractPlanAmount)}</span>
            <span>계약 실적</span>
            <span className="text-right font-medium text-foreground">{formatEok(year.contractActualAmount)}</span>
            <span>실적 Gap</span>
            <span className={`text-right font-medium ${year.actualGapAmount < 0 ? 'text-ssoo-danger' : 'text-ssoo-info'}`}>{formatEok(year.actualGapAmount)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function BusinessPlanTable({
  rows,
  years,
  isLoading,
}: {
  rows: CrmBusinessPlanPreviewRow[];
  years: CrmBusinessPlanPreviewYear[];
  isLoading: boolean;
}) {
  const columnCount = 4 + (years.length * 4) + 4;
  return (
    <div className="overflow-auto">
      <Table className="w-full min-w-[1840px] text-xs">
        <TableHeader className="sticky top-0 z-10 bg-ssoo-content-bg text-left text-muted-foreground shadow-sm">
          <TableRow>
            <TableHead className="w-[190px] px-2 py-2" rowSpan={2}>사업구분</TableHead>
            <TableHead className="w-[170px] px-2 py-2" rowSpan={2}>계열/산업</TableHead>
            <TableHead className="w-[120px] px-2 py-2" rowSpan={2}>담당자</TableHead>
            <TableHead className="w-[82px] px-2 py-2" rowSpan={2}>지역</TableHead>
            {years.map((year) => (
              <TableHead key={year.year} className="px-2 py-2 text-center" colSpan={4}>{year.year}</TableHead>
            ))}
            <TableHead className="px-2 py-2 text-center" colSpan={4}>합계</TableHead>
          </TableRow>
          <TableRow>
            {[...years, { year: 0 }].map((year) => (
              <AmountHeads key={year.year} />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border">
          {isLoading ? (
            <TableRow>
              <TableCell className="px-3 py-5 text-left text-ssoo-info" colSpan={columnCount}>사업계획 preview를 불러오는 중입니다.</TableCell>
            </TableRow>
          ) : null}
          {!isLoading && rows.length === 0 ? (
            <TableRow>
              <TableCell className="px-3 py-5 text-left text-muted-foreground" colSpan={columnCount}>조회된 사업계획 후보가 없습니다.</TableCell>
            </TableRow>
          ) : null}
          {!isLoading ? rows.map((row) => <BusinessPlanRow key={row.key} row={row} years={years} />) : null}
        </TableBody>
      </Table>
    </div>
  );
}

function AmountHeads() {
  return (
    <>
      <TableHead className="w-[70px] px-2 py-2 text-right">Pipeline</TableHead>
      <TableHead className="w-[70px] px-2 py-2 text-right">계획</TableHead>
      <TableHead className="w-[70px] px-2 py-2 text-right">실적</TableHead>
      <TableHead className="w-[70px] px-2 py-2 text-right">Gap</TableHead>
    </>
  );
}

function BusinessPlanRow({
  row,
  years,
}: {
  row: CrmBusinessPlanPreviewRow;
  years: CrmBusinessPlanPreviewYear[];
}) {
  return (
    <TableRow>
      <TableCell className="px-2 py-2 font-medium text-foreground">{row.businessType}</TableCell>
      <TableCell className="px-2 py-2 text-muted-foreground">{row.industryLine}</TableCell>
      <TableCell className="px-2 py-2 text-muted-foreground">{row.ownerName}</TableCell>
      <TableCell className="px-2 py-2 text-muted-foreground">{regionLabels[row.region]}</TableCell>
      {years.map((year) => {
        const value = row.years.find((item) => item.year === year.year) ?? {
          year: year.year,
          pipelineAmount: 0,
          contractPlanAmount: 0,
          contractActualAmount: 0,
          planCandidateAmount: 0,
          actualGapAmount: 0,
        };
        return <AmountCells key={year.year} value={value} />;
      })}
      <AmountCells value={{
        year: 0,
        pipelineAmount: row.pipelineAmount,
        contractPlanAmount: row.contractPlanAmount,
        contractActualAmount: row.contractActualAmount,
        planCandidateAmount: row.planCandidateAmount,
        actualGapAmount: row.actualGapAmount,
      }} isTotal />
    </TableRow>
  );
}

function AmountCells({ value, isTotal = false }: { value: CrmBusinessPlanPreviewYear; isTotal?: boolean }) {
  const weight = isTotal ? 'font-semibold' : 'font-normal';
  const gapTone = value.actualGapAmount < 0 ? 'text-ssoo-danger' : value.actualGapAmount > 0 ? 'text-ssoo-info' : 'text-muted-foreground';
  return (
    <>
      <TableCell className={`px-2 py-2 text-right text-muted-foreground ${weight}`}>{formatTableAmount(value.pipelineAmount)}</TableCell>
      <TableCell className={`px-2 py-2 text-right text-muted-foreground ${weight}`}>{formatTableAmount(value.contractPlanAmount)}</TableCell>
      <TableCell className={`px-2 py-2 text-right text-muted-foreground ${weight}`}>{formatTableAmount(value.contractActualAmount)}</TableCell>
      <TableCell className={`px-2 py-2 text-right ${gapTone} ${weight}`}>{formatTableAmount(value.actualGapAmount)}</TableCell>
    </>
  );
}
