'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  LockKeyhole,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Trash2,
  UnlockKeyhole,
} from 'lucide-react';
import type {
  CrmContract,
  CrmContractBillingActualResponse,
  CrmContractBillingPlanLine,
  CrmContractDmsDocumentDraft,
  CrmContractDmsDocumentLifecycleExecutionResult,
  CrmContractDmsDocumentPreview,
  CrmContractLine,
  CrmContractListResponse,
  CrmContractPmsHandoffPreview,
  CrmContractSort,
  CrmContractStatus,
  CrmOpportunityLineCategory,
  CrmOpportunityServiceType,
} from '@ssoo/types/crm';
import { Button, Input, NativeSelect, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';
import { SSOO_CONTENT_PAGE_METRICS, SSOO_PAGE_CHROME_METRICS, SsooSearchInput } from '@ssoo/web-shell';
import { useAuthStore } from '@/stores/auth.store';
import { useCrmDomainAccess } from '@/lib/useCrmDomainAccess';
import { ContractApprovalInbox, ContractApprovalPanel } from './ContractApprovalPanel';
import { ContractUpsertPanel } from './ContractUpsertPanel';

export interface ContractWorkspaceQuery {
  search: string;
  status: CrmContractStatus | 'all';
  sort: CrmContractSort;
  selected: string;
  sourceSurface: 'list' | 'form' | 'billing-actual' | '';
  billingView: 'list' | 'detail';
  create: boolean;
}

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

interface BillingActualDraftLine {
  id: string;
  billingYm: string;
  revenueAmount: string;
  externalCostAmount: string;
}

type DmsLifecycleExecutionGovernance = CrmContractDmsDocumentLifecycleExecutionResult['dmsExecution']['governance'];

const statusLabels: Record<CrmContractStatus, string> = {
  review: '검토',
  active: '계약중',
  completed: '계약완료',
  terminated: '해지',
};

const statusTone: Record<CrmContractStatus, string> = {
  review: 'bg-ssoo-warning-bg text-ssoo-warning',
  active: 'bg-ssoo-success-bg text-ssoo-success',
  completed: 'bg-ssoo-info-bg text-ssoo-info',
  terminated: 'bg-ssoo-danger-bg text-ssoo-danger',
};

const sortLabels: Record<CrmContractSort, string> = {
  'updated-desc': '최근 수정순',
  'revenue-desc': '매출 높은순',
  'margin-desc': '손익률 높은순',
  'start-asc': '계약 시작일순',
};

const regionLabels: Record<CrmContract['region'], string> = {
  domestic: '국내',
  overseas: '해외',
};

const lineCategoryLabels: Record<CrmOpportunityLineCategory, string> = {
  product: '상품',
  service: '용역',
  'internal-cost': '내부원가',
  'external-cost': '외부원가',
};

const serviceTypeLabels: Record<CrmOpportunityServiceType, string> = {
  internal: '내부',
  external: '외부',
};

function formatCurrency(value: number) {
  return `${Math.round(value / 100000000).toLocaleString('ko-KR')}억`;
}

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

function getSourceContractRevenue(item: CrmContract) {
  return item.revenueLines.reduce((sum, line) => sum + line.amount, 0);
}

function getSourceContractCost(item: CrmContract) {
  return item.costLines.reduce((sum, line) => sum + line.amount, 0);
}

function formatSignedWon(value: number) {
  const normalized = Math.round(value);
  if (normalized === 0) {
    return '0원';
  }
  return `${normalized > 0 ? '+' : '-'}${Math.abs(normalized).toLocaleString('ko-KR')}원`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100) / 100}%`;
}

function formatDate(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ko-KR');
}

function formatDateTime(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ko-KR');
}

function createBillingActualDraftLine(): BillingActualDraftLine {
  return {
    id: `billing-actual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    billingYm: '',
    revenueAmount: '',
    externalCostAmount: '',
  };
}

function toBillingActualDraftLines(data: CrmContractBillingActualResponse | null): BillingActualDraftLine[] {
  if (!data || data.actualLines.length === 0) {
    return [createBillingActualDraftLine()];
  }

  return data.actualLines.map((line) => ({
    id: line.id,
    billingYm: line.billingYm,
    revenueAmount: String(line.revenueAmount),
    externalCostAmount: String(line.externalCostAmount),
  }));
}

function parseMoneyInput(value: string): number | null {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) {
    return 0;
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Math.round(parsed);
}

function getBillingAchievementRate(actual: number, plan: number) {
  if (plan <= 0) {
    return 0;
  }
  return Math.round((actual / plan) * 10000) / 100;
}

function buildHref(query: ContractWorkspaceQuery, patch: Partial<ContractWorkspaceQuery>) {
  const params = new URLSearchParams();
  const next = { ...query, ...patch };
  if (next.sourceSurface) params.set('sourceSurface', next.sourceSurface);
  if (next.sourceSurface === 'billing-actual' && next.billingView === 'list') params.set('view', 'list');
  if (next.create) params.set('create', 'contract');
  if (next.search) params.set('search', next.search);
  if (next.status && next.status !== 'all') params.set('status', next.status);
  if (next.sort && next.sort !== 'updated-desc') params.set('sort', next.sort);
  if (next.selected) params.set('selected', next.selected);
  const suffix = params.toString();
  return suffix ? `/contracts?${suffix}` : '/contracts';
}

function buildApiHref(query: ContractWorkspaceQuery) {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.status && query.status !== 'all') params.set('status', query.status);
  if (query.sort && query.sort !== 'updated-desc') params.set('sort', query.sort);
  const suffix = params.toString();
  return suffix ? `/api/crm/contracts?${suffix}` : '/api/crm/contracts';
}

function getBackendErrorMessage(responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null): string {
  if (!responseBody || responseBody.success === true) {
    return 'CRM 계약 처리 중 오류가 발생했습니다.';
  }

  return responseBody.error?.message || responseBody.message || 'CRM 계약 처리 중 오류가 발생했습니다.';
}

export function ContractWorkspaceClient({
  data,
  query,
  active = true,
}: {
  data: CrmContractListResponse;
  query: ContractWorkspaceQuery;
  active?: boolean;
}) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const { access: domainAccess, error: domainAccessError } = useCrmDomainAccess(accessToken);
  const canWriteContract = domainAccess?.features.canWriteContract === true;
  const canConfirmContract = domainAccess?.features.canConfirmContract === true;
  const router = useRouter();
  const [currentData, setCurrentData] = useState(data);
  const [isReloading, setIsReloading] = useState(data.items.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [pendingWorkflow, setPendingWorkflow] = useState<'confirm' | 'reopen' | null>(null);
  const [billingActual, setBillingActual] = useState<CrmContractBillingActualResponse | null>(null);
  const [isBillingActualLoading, setIsBillingActualLoading] = useState(false);
  const [billingActualError, setBillingActualError] = useState<string | null>(null);
  const [pmsHandoffPreview, setPmsHandoffPreview] = useState<CrmContractPmsHandoffPreview | null>(null);
  const [isPmsHandoffPreviewLoading, setIsPmsHandoffPreviewLoading] = useState(false);
  const [pmsHandoffPreviewError, setPmsHandoffPreviewError] = useState<string | null>(null);
  const [dmsDocumentPreview, setDmsDocumentPreview] = useState<CrmContractDmsDocumentPreview | null>(null);
  const [isDmsDocumentPreviewLoading, setIsDmsDocumentPreviewLoading] = useState(false);
  const [dmsDocumentPreviewError, setDmsDocumentPreviewError] = useState<string | null>(null);
  const [dmsDocumentDraft, setDmsDocumentDraft] = useState<CrmContractDmsDocumentDraft | null>(null);
  const [isDmsDocumentDraftSaving, setIsDmsDocumentDraftSaving] = useState(false);
  const [dmsDocumentDraftError, setDmsDocumentDraftError] = useState<string | null>(null);
  const [dmsDocumentLifecycleExecution, setDmsDocumentLifecycleExecution] = useState<CrmContractDmsDocumentLifecycleExecutionResult | null>(null);
  const [isDmsDocumentLifecycleExecuting, setIsDmsDocumentLifecycleExecuting] = useState(false);
  const [dmsDocumentLifecycleExecutionError, setDmsDocumentLifecycleExecutionError] = useState<string | null>(null);
  const apiHref = useMemo(() => buildApiHref(query), [query]);
  const sourceContracts = currentData.items;
  const selected = useMemo(() => (
    query.sourceSurface === 'form' && query.create
      ? null
      : sourceContracts.find((item) => item.id === query.selected || item.code === query.selected)
        ?? sourceContracts[0]
        ?? null
  ), [query.create, query.selected, query.sourceSurface, sourceContracts]);

  useEffect(() => {
    setCurrentData(data);
    if (data.items.length > 0) {
      setIsReloading(false);
    }
  }, [data]);

  const loadContracts = useCallback(async (signal?: AbortSignal) => {
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
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmContractListResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setCurrentData(payload.data);
      return payload.data;
    } catch (error) {
      if (signal?.aborted) {
        return null;
      }
      setLoadError(error instanceof Error ? error.message : 'CRM 계약 조회에 실패했습니다.');
      return null;
    } finally {
      if (!signal?.aborted) {
        setIsReloading(false);
      }
    }
  }, [accessToken, apiHref]);

  const loadBillingActual = useCallback(async (contractId: string, signal?: AbortSignal) => {
    if (!accessToken || !contractId) {
      setBillingActual(null);
      setBillingActualError(null);
      return null;
    }

    setIsBillingActualLoading(true);
    setBillingActualError(null);
    try {
      const response = await fetch(`/api/crm/contracts/${encodeURIComponent(contractId)}/billing-actual`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmContractBillingActualResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setBillingActual(payload.data);
      return payload.data;
    } catch (error) {
      if (signal?.aborted) {
        return null;
      }
      setBillingActual(null);
      setBillingActualError(error instanceof Error ? error.message : '청구실적 조회에 실패했습니다.');
      return null;
    } finally {
      if (!signal?.aborted) {
        setIsBillingActualLoading(false);
      }
    }
  }, [accessToken]);

  const loadPmsHandoffPreview = useCallback(async (contractId: string, signal?: AbortSignal) => {
    if (!accessToken || !contractId) {
      setPmsHandoffPreview(null);
      setPmsHandoffPreviewError(null);
      return null;
    }

    setIsPmsHandoffPreviewLoading(true);
    setPmsHandoffPreviewError(null);
    try {
      const response = await fetch(`/api/crm/contracts/${encodeURIComponent(contractId)}/pms-handoff-preview`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmContractPmsHandoffPreview> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setPmsHandoffPreview(payload.data);
      return payload.data;
    } catch (error) {
      if (signal?.aborted) {
        return null;
      }
      setPmsHandoffPreview(null);
      setPmsHandoffPreviewError(error instanceof Error ? error.message : 'PMS 인계 후보 조회에 실패했습니다.');
      return null;
    } finally {
      if (!signal?.aborted) {
        setIsPmsHandoffPreviewLoading(false);
      }
    }
  }, [accessToken]);

  const loadDmsDocumentPreview = useCallback(async (contractId: string, signal?: AbortSignal) => {
    if (!accessToken || !contractId) {
      setDmsDocumentPreview(null);
      setDmsDocumentPreviewError(null);
      setDmsDocumentDraft(null);
      setDmsDocumentDraftError(null);
      setDmsDocumentLifecycleExecution(null);
      setDmsDocumentLifecycleExecutionError(null);
      return null;
    }

    setIsDmsDocumentPreviewLoading(true);
    setDmsDocumentPreviewError(null);
    setDmsDocumentDraftError(null);
    setDmsDocumentLifecycleExecutionError(null);
    try {
      const response = await fetch(`/api/crm/contracts/${encodeURIComponent(contractId)}/dms-document-preview`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmContractDmsDocumentPreview> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setDmsDocumentPreview(payload.data);
      return payload.data;
    } catch (error) {
      if (signal?.aborted) {
        return null;
      }
      setDmsDocumentPreview(null);
      setDmsDocumentPreviewError(error instanceof Error ? error.message : 'DMS 문서 패킷 조회에 실패했습니다.');
      setDmsDocumentDraft(null);
      setDmsDocumentLifecycleExecution(null);
      return null;
    } finally {
      if (!signal?.aborted) {
        setIsDmsDocumentPreviewLoading(false);
      }
    }
  }, [accessToken]);

  const createDmsDocumentDraft = useCallback(async (templateKey: string) => {
    if (!selected || !accessToken) {
      setDmsDocumentDraftError('로그인 세션을 확인해 주세요.');
      return;
    }

    const activePreview = dmsDocumentPreview?.contractId === selected.id ? dmsDocumentPreview : null;
    if (!activePreview || activePreview.readiness !== 'ready') {
      setDmsDocumentDraftError('DMS 문서 패킷이 준비된 계약만 초안을 저장할 수 있습니다.');
      return;
    }

    if (!window.confirm('DMS markdown 초안을 저장하시겠습니까? 템플릿 검토와 Word/PDF 산출은 DMS에서 이어서 처리합니다.')) {
      return;
    }

    setIsDmsDocumentDraftSaving(true);
    setDmsDocumentDraftError(null);
    try {
      const response = await fetch(`/api/crm/contracts/${encodeURIComponent(selected.id)}/dms-document-draft`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          templateKey,
          memo: 'CRM 계약 원장에서 생성한 DMS markdown 초안',
        }),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmContractDmsDocumentDraft> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setDmsDocumentDraft(payload.data);
      setDmsDocumentPreview(payload.data.preview);
      await loadContracts();
    } catch (error) {
      setDmsDocumentDraftError(error instanceof Error ? error.message : 'DMS markdown 초안 저장에 실패했습니다.');
    } finally {
      setIsDmsDocumentDraftSaving(false);
    }
  }, [accessToken, dmsDocumentPreview, loadContracts, selected]);

  const executeDmsDocumentLifecycle = useCallback(async () => {
    if (!selected || !accessToken) {
      setDmsDocumentLifecycleExecutionError('로그인 세션을 확인해 주세요.');
      return;
    }

    const activePreview = dmsDocumentPreview?.contractId === selected.id ? dmsDocumentPreview : null;
    const activeDraft = dmsDocumentDraft?.contractId === selected.id ? dmsDocumentDraft : null;
    const latestHandoff = activeDraft?.handoff ?? activePreview?.latestHandoff;
    if (!activePreview || !latestHandoff) {
      setDmsDocumentLifecycleExecutionError('DMS markdown 초안 handoff가 있어야 lifecycle 산출을 실행할 수 있습니다.');
      return;
    }

    if (!window.confirm('DMS가 템플릿 검토 기록, 첨부 확인/확정 원장, Word/PDF artifact, 역할별 생성 기록과 결재선 원장을 생성하고 CRM handoff에 evidence를 반영합니다. 담당자별 검토·승인 결과가 아닙니다. 계속하시겠습니까?')) {
      return;
    }

    setIsDmsDocumentLifecycleExecuting(true);
    setDmsDocumentLifecycleExecutionError(null);
    try {
      const response = await fetch(`/api/crm/contracts/${encodeURIComponent(selected.id)}/dms-document-lifecycle-execution`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ memo: 'CRM 계약 handoff 기반 DMS lifecycle artifact 실행' }),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmContractDmsDocumentLifecycleExecutionResult> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setDmsDocumentLifecycleExecution(payload.data);
      setDmsDocumentPreview(payload.data.preview);
      await loadContracts();
    } catch (error) {
      setDmsDocumentLifecycleExecutionError(error instanceof Error ? error.message : 'DMS lifecycle 산출 실행에 실패했습니다.');
    } finally {
      setIsDmsDocumentLifecycleExecuting(false);
    }
  }, [accessToken, dmsDocumentDraft, dmsDocumentPreview, loadContracts, selected]);

  useEffect(() => {
    if (!active) {
      return undefined;
    }
    const abortController = new AbortController();
    void loadContracts(abortController.signal);
    return () => abortController.abort();
  }, [active, loadContracts]);

  useEffect(() => {
    if (!active || !selected?.id || !accessToken) {
      setBillingActual(null);
      setBillingActualError(null);
      setIsBillingActualLoading(false);
      return undefined;
    }

    const abortController = new AbortController();
    void loadBillingActual(selected.id, abortController.signal);
    return () => abortController.abort();
  }, [accessToken, active, loadBillingActual, selected?.id]);

  useEffect(() => {
    if (!active || !selected?.id || !accessToken) {
      setPmsHandoffPreview(null);
      setPmsHandoffPreviewError(null);
      setIsPmsHandoffPreviewLoading(false);
      return undefined;
    }

    const abortController = new AbortController();
    void loadPmsHandoffPreview(selected.id, abortController.signal);
    return () => abortController.abort();
  }, [accessToken, active, loadPmsHandoffPreview, selected?.id, selected?.updatedAt]);

  useEffect(() => {
    if (!active || !selected?.id || !accessToken) {
      setDmsDocumentPreview(null);
      setDmsDocumentPreviewError(null);
      setDmsDocumentDraft(null);
      setDmsDocumentDraftError(null);
      setDmsDocumentLifecycleExecution(null);
      setDmsDocumentLifecycleExecutionError(null);
      setIsDmsDocumentPreviewLoading(false);
      setIsDmsDocumentDraftSaving(false);
      setIsDmsDocumentLifecycleExecuting(false);
      return undefined;
    }

    const abortController = new AbortController();
    void loadDmsDocumentPreview(selected.id, abortController.signal);
    return () => abortController.abort();
  }, [accessToken, active, loadDmsDocumentPreview, selected?.id, selected?.updatedAt]);

  const refreshWorkspace = useCallback(async () => {
    const refreshed = await loadContracts();
    const refreshedSelected = refreshed?.items.find((item) => item.id === query.selected || item.code === query.selected)
      ?? refreshed?.items[0]
      ?? selected;
    if (!refreshedSelected?.id) {
      return;
    }
    await Promise.all([
      loadBillingActual(refreshedSelected.id),
      loadPmsHandoffPreview(refreshedSelected.id),
      loadDmsDocumentPreview(refreshedSelected.id),
    ]);
  }, [loadBillingActual, loadContracts, loadDmsDocumentPreview, loadPmsHandoffPreview, query.selected, selected]);

  const runWorkflow = useCallback(async (action: 'confirm' | 'reopen') => {
    if (!selected || !accessToken) {
      setWorkflowError('로그인 세션을 확인해 주세요.');
      return;
    }
    if (!canConfirmContract) {
      setWorkflowError('CRM 계약을 확정하거나 확정 해제할 권한이 없습니다.');
      return;
    }

    const message = action === 'confirm'
      ? '이 계약을 확정하시겠습니까? 확정 후에는 수정할 수 없습니다.'
      : '계약 확정을 해제하시겠습니까?';
    if (!window.confirm(message)) {
      return;
    }

    setPendingWorkflow(action);
    setWorkflowError(null);
    try {
      const response = await fetch(`/api/crm/contracts/${encodeURIComponent(selected.id)}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmContract> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      await loadContracts();
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : '계약 상태 처리에 실패했습니다.');
    } finally {
      setPendingWorkflow(null);
    }
  }, [accessToken, canConfirmContract, loadContracts, selected]);

  const handleContractSaved = useCallback(async (contract: CrmContract) => {
    await loadContracts();
    router.replace(buildHref(query, { selected: contract.id, create: false }));
  }, [loadContracts, query, router]);

  const handleContractDeleted = useCallback(async () => {
    await loadContracts();
    router.replace(buildHref(query, { selected: '' }));
  }, [loadContracts, query, router]);

  const handleBillingActualSaved = useCallback(async (next: CrmContractBillingActualResponse) => {
    setBillingActual(next);
    await loadContracts();
  }, [loadContracts]);

  if (query.sourceSurface === 'list') {
    return (
      <SourceContractListSurface
        data={currentData}
        query={query}
        selectedId={selected?.id ?? ''}
        isLoading={isReloading}
        loadError={loadError}
      />
    );
  }

  if (query.sourceSurface === 'form') {
    return (
      <main className="h-full min-h-0 min-w-0 overflow-auto bg-ssoo-content-bg p-4" data-source-surface="contract-form">
        <div className="mx-auto w-full min-w-0" style={{ maxWidth: SSOO_CONTENT_PAGE_METRICS.mainContentWidthPx }}>
          <Link className="text-sm text-muted-foreground hover:text-foreground" href="/contracts?sourceSurface=list">
            ← 계약현황으로 돌아가기
          </Link>
          <div className="mt-5">
            <ContractUpsertPanel
              selected={selected}
              accessToken={accessToken}
              canWrite={canWriteContract}
              onSaved={handleContractSaved}
              onDeleted={handleContractDeleted}
              variant="source"
              canConfirm={canConfirmContract}
              onWorkflow={runWorkflow}
              workflowPending={pendingWorkflow !== null}
              onCancel={() => router.push('/contracts?sourceSurface=list')}
            />
          </div>
        </div>
        {domainAccessError ? <div className="sr-only" role="status">{domainAccessError}</div> : null}
      </main>
    );
  }

  if (query.sourceSurface === 'billing-actual') {
    if (query.billingView === 'list') {
      return (
        <SourceBillingActualListSurface
          items={sourceContracts}
          query={query}
          isLoading={isReloading}
          loadError={loadError}
        />
      );
    }
    return (
      <SourceBillingActualSurface
        item={selected}
        data={billingActual}
        isLoading={isBillingActualLoading}
        error={billingActualError}
        accessToken={accessToken}
        canWrite={canWriteContract}
        onSaved={handleBillingActualSaved}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-ssoo-content-bg">
      <header className="border-b bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">CRM Contract Ledger</p>
            <h1 className="mt-1 text-xl font-semibold text-foreground">계약 원장</h1>
          </div>
          <Button variant="outline" size="sm" type="button" onClick={() => void refreshWorkspace()} disabled={isReloading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{currentData.summary.boundaryNotice}</p>
      </header>

      <main className="mx-auto min-h-0 w-full min-w-0 flex-1 overflow-auto p-4" style={{ maxWidth: SSOO_CONTENT_PAGE_METRICS.landscapeContentWidthPx + SSOO_PAGE_CHROME_METRICS.stackPaddingPx * 2 }}>
        <ContractApprovalInbox />
        <section className="grid gap-3 md:grid-cols-5">
          <Metric label="조회 계약" value={`${currentData.summary.filteredCount}건`} sub={`전체 ${currentData.summary.totalCount}건`} />
          <Metric label="검토" value={`${currentData.summary.reviewCount}건`} sub="확정 전" />
          <Metric label="계약중" value={`${currentData.summary.activeCount}건`} sub="확정 원장" />
          <Metric label="최종 매출" value={formatCurrency(currentData.summary.totalRevenue)} sub={formatWon(currentData.summary.totalRevenue)} />
          <Metric label="손익률" value={`${currentData.summary.grossMarginRate}%`} sub={`손익 ${formatCurrency(currentData.summary.totalMargin)}`} />
        </section>

        <section className="mt-4 rounded-md border bg-card">
          <form action="/contracts" className="flex flex-wrap items-end gap-3 border-b p-4">
            <label className="min-w-[220px] flex-1 text-sm font-medium text-muted-foreground">
              검색
              <SsooSearchInput id="crm-contract-search-input" name="search" ariaLabel="계약 검색" intent="data-filter" defaultValue={query.search} placeholder="고객사, 계약명, 담당자, WBS" className="mt-1" />
            </label>
            <label className="w-[160px] text-sm font-medium text-muted-foreground">
              상태
              <NativeSelect name="status" defaultValue={query.status} className="mt-1">
                <option value="all">전체</option>
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </NativeSelect>
            </label>
            <label className="w-[180px] text-sm font-medium text-muted-foreground">
              정렬
              <NativeSelect name="sort" defaultValue={query.sort} className="mt-1">
                {Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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

          <div className="overflow-auto">
            <ContractTable items={currentData.items} query={query} selectedId={selected?.id ?? ''} isLoading={isReloading} />
          </div>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <ContractDetail item={selected} canConfirm={canConfirmContract} workflowError={workflowError} pendingWorkflow={pendingWorkflow} onWorkflow={runWorkflow} />
          <div className="min-w-0 space-y-4">
            <BillingPlanPanel item={selected} />
            <PmsHandoffPreviewPanel
              item={selected}
              preview={pmsHandoffPreview}
              isLoading={isPmsHandoffPreviewLoading}
              error={pmsHandoffPreviewError}
            />
            <DmsDocumentPreviewPanel
              item={selected}
              preview={dmsDocumentPreview}
              isLoading={isDmsDocumentPreviewLoading}
              error={dmsDocumentPreviewError}
              draft={dmsDocumentDraft}
              isDraftSaving={isDmsDocumentDraftSaving}
              draftError={dmsDocumentDraftError}
              lifecycleExecution={dmsDocumentLifecycleExecution}
              isLifecycleExecuting={isDmsDocumentLifecycleExecuting}
              lifecycleExecutionError={dmsDocumentLifecycleExecutionError}
              canWrite={canWriteContract}
              onCreateDraft={createDmsDocumentDraft}
              onExecuteLifecycle={executeDmsDocumentLifecycle}
            />
            {selected && <ContractApprovalPanel key={selected.id} contractCode={selected.id} revision={JSON.stringify([selected.updatedAt, dmsDocumentDraft, dmsDocumentLifecycleExecution])} />}
            <BillingActualPanel
              item={selected}
              data={billingActual}
              isLoading={isBillingActualLoading}
              error={billingActualError}
              accessToken={accessToken}
              canWrite={canWriteContract}
              onSaved={handleBillingActualSaved}
            />
          </div>
        </section>

        <div className="mt-4">
          <ContractUpsertPanel
            selected={selected}
            accessToken={accessToken}
            canWrite={canWriteContract}
            onSaved={handleContractSaved}
            onDeleted={handleContractDeleted}
          />
        </div>
      </main>
      {domainAccessError ? <div className="sr-only" role="status">{domainAccessError}</div> : null}
    </div>
  );
}

function formatSourceAmount(value: number) {
  const rounded = Math.round(value);
  if (Math.abs(rounded) >= 100000000) {
    return `${(rounded / 100000000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억`;
  }
  if (Math.abs(rounded) >= 10000) {
    return `${Math.round(rounded / 10000).toLocaleString('ko-KR')}만`;
  }
  return rounded.toLocaleString('ko-KR');
}

function formatSourceDate(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

function SourceContractListSurface({
  data,
  query,
  selectedId,
  isLoading,
  loadError,
}: {
  data: CrmContractListResponse;
  query: ContractWorkspaceQuery;
  selectedId: string;
  isLoading: boolean;
  loadError: string | null;
}) {
  const sourceItems = data.items;
  const totalRevenue = sourceItems.reduce((sum, item) => sum + getSourceContractRevenue(item), 0);
  const totalCost = sourceItems.reduce((sum, item) => sum + getSourceContractCost(item), 0);
  const totalMargin = totalRevenue - totalCost;
  const averageMarginRate = sourceItems.length > 0
    ? Math.round(sourceItems.reduce((sum, item) => {
      const revenue = getSourceContractRevenue(item);
      const margin = revenue - getSourceContractCost(item);
      return sum + (revenue > 0 ? margin / revenue * 100 : 0);
    }, 0) / sourceItems.length)
    : 0;

  return (
    <main className="h-full min-h-0 min-w-0 overflow-auto bg-ssoo-content-bg p-4" data-source-surface="contract-list">
      <div className="mx-auto w-full min-w-0" style={{ maxWidth: SSOO_CONTENT_PAGE_METRICS.landscapeContentWidthPx }}>
        <ContractApprovalInbox />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">계약현황</h1>
            <p className="mt-1 text-sm text-muted-foreground">등록된 계약을 조회합니다.</p>
          </div>
          <Button asChild size="sm" className="bg-foreground text-background hover:bg-foreground/90">
            <Link href="/contracts?sourceSurface=form&create=contract">+ 계약등록</Link>
          </Button>
        </div>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SourceContractMetric label="전체 건수" value={`${sourceItems.length}건`} sub="조회 기준" />
          <SourceContractMetric label="매출액" value={formatSourceAmount(totalRevenue)} sub={formatWon(totalRevenue)} />
          <SourceContractMetric label="이익" value={formatSourceAmount(totalMargin)} sub={formatWon(totalMargin)} accent />
          <SourceContractMetric label="평균 이익률" value={`${averageMarginRate}%`} sub="조회 기준" />
        </section>

        <form action="/contracts" className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Input type="hidden" name="sourceSurface" value="list" />
          <SsooSearchInput
            id="ct-list-search"
            name="search"
            ariaLabel="계약 검색"
            intent="data-filter"
            defaultValue={query.search}
            placeholder="고객사, 계약명, 담당자 검색"
            className="min-w-0 flex-1"
          />
          <NativeSelect id="ct-list-status" name="status" defaultValue={query.status} className="sm:w-[144px]" onChange={(event) => event.currentTarget.form?.requestSubmit()}>
            <option value="all">전체 상태</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </NativeSelect>
          <NativeSelect id="ct-list-sort" name="sort" defaultValue={query.sort} className="sm:w-[144px]" onChange={(event) => event.currentTarget.form?.requestSubmit()}>
            {Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </NativeSelect>
          <Button type="submit" className="hidden">조회</Button>
        </form>

        {loadError ? (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-ssoo-danger/20 bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger">
            <AlertCircle className="h-4 w-4" />
            {loadError}
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto rounded-xl border bg-card">
          <Table className="w-full min-w-[1060px] text-sm">
            <TableHeader className="bg-muted/50 text-muted-foreground">
              <TableRow>
                <TableHead className="px-3 py-2">고객사</TableHead>
                <TableHead className="px-3 py-2">계약명</TableHead>
                <TableHead className="px-3 py-2">담당자</TableHead>
                <TableHead className="px-3 py-2 text-right">매출액</TableHead>
                <TableHead className="px-3 py-2 text-right">원가</TableHead>
                <TableHead className="px-3 py-2 text-right">이익</TableHead>
                <TableHead className="px-3 py-2 text-right">이익률</TableHead>
                <TableHead className="px-3 py-2">계약기간</TableHead>
                <TableHead className="px-3 py-2">상태</TableHead>
                <TableHead className="w-12 px-3 py-2" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="px-3 py-8 text-center text-ssoo-info">계약을 불러오는 중입니다.</TableCell></TableRow>
              ) : null}
              {!isLoading && sourceItems.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="px-3 py-8 text-center text-muted-foreground">조회된 계약이 없습니다.</TableCell></TableRow>
              ) : null}
              {sourceItems.map((item) => {
                const ownerInitial = item.ownerName.trim().slice(0, 2);
                const revenueTotal = getSourceContractRevenue(item);
                const costTotal = getSourceContractCost(item);
                const marginTotal = revenueTotal - costTotal;
                const marginRate = revenueTotal > 0 ? Math.round(marginTotal / revenueTotal * 100) : 0;
                const rowText = `${item.customerName} ${item.contractName} ${ownerInitial} ${item.ownerName} ${formatSourceAmount(revenueTotal)} ${formatSourceAmount(costTotal)} ${formatSourceAmount(marginTotal)} ${marginRate}% ${formatSourceDate(item.contractStartDate)}~${formatSourceDate(item.contractEndDate)} ${statusLabels[item.status]} `;
                return (
                  <TableRow key={item.id} className={item.id === selectedId ? 'bg-ssoo-info-bg/40' : undefined}>
                    <TableCell className="px-3 py-3 font-medium text-foreground">{item.customerName}</TableCell>
                    <TableCell className="px-3 py-3 text-foreground">{item.contractName}</TableCell>
                    <TableCell className="px-3 py-3 text-muted-foreground"><span className="mr-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ssoo-success-bg text-xs text-ssoo-success">{ownerInitial}</span>{item.ownerName}</TableCell>
                    <TableCell className="px-3 py-3 text-right font-medium">{formatSourceAmount(revenueTotal)}</TableCell>
                    <TableCell className="px-3 py-3 text-right">{formatSourceAmount(costTotal)}</TableCell>
                    <TableCell className="px-3 py-3 text-right text-ssoo-info">{formatSourceAmount(marginTotal)}</TableCell>
                    <TableCell className="px-3 py-3 text-right text-ssoo-info">{marginRate}%</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-3 text-muted-foreground">{formatSourceDate(item.contractStartDate)}~{formatSourceDate(item.contractEndDate)}</TableCell>
                    <TableCell className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs ${statusTone[item.status]}`}>{statusLabels[item.status]}</span></TableCell>
                    <TableCell className="px-3 py-3 text-right">
                      <Link href={`/contracts?sourceSurface=form&selected=${encodeURIComponent(item.id)}`} className="text-muted-foreground hover:text-foreground">
                        <span className="sr-only">{rowText}</span>→
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{sourceItems.length}건 표시 중</p>
      </div>
    </main>
  );
}

function SourceContractMetric({ label, value, sub, accent = false }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-4">
      <label className="text-xs text-muted-foreground">{label}</label>
      <p className={`mt-2 text-xl font-semibold ${accent ? 'text-ssoo-info' : 'text-foreground'}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function SourceBillingActualSurface({
  item,
  data,
  isLoading,
  error,
  accessToken,
  canWrite,
  onSaved,
}: {
  item: CrmContract | null;
  data: CrmContractBillingActualResponse | null;
  isLoading: boolean;
  error: string | null;
  accessToken: string | null;
  canWrite: boolean;
  onSaved: (data: CrmContractBillingActualResponse) => Promise<void>;
}) {
  return (
    <main className="h-full min-h-0 min-w-0 overflow-auto bg-ssoo-content-bg p-4" data-source-surface="billing-actual">

      <div className="mx-auto w-full min-w-0" style={{ maxWidth: SSOO_CONTENT_PAGE_METRICS.mainContentWidthPx }}>
        <Link className="text-sm text-muted-foreground hover:text-foreground" href="/contracts?sourceSurface=billing-actual&view=list">
          ← 계약청구실적 목록으로 돌아가기
        </Link>
        <h1 className="mt-6 text-xl font-semibold text-foreground">계약청구실적 입력</h1>
        {item ? (
          <p className="mt-1 text-sm text-muted-foreground">[{item.customerName}] {item.contractName} · 사업구분: {item.businessType} · 담당: {item.ownerName} · WBS: {item.wbsCode ?? '-'} · {formatSourceDate(item.contractStartDate)}~{formatSourceDate(item.contractEndDate)}</p>
        ) : null}
        <div className="mt-6">
          <BillingActualPanel
            item={item}
            data={data}
            isLoading={isLoading}
            error={error}
            accessToken={accessToken}
            canWrite={canWrite}
            onSaved={onSaved}
            variant="source"
          />
        </div>
      </div>
    </main>
  );
}

function SourceBillingActualListSurface({
  items,
  query,
  isLoading,
  loadError,
}: {
  items: CrmContract[];
  query: ContractWorkspaceQuery;
  isLoading: boolean;
  loadError: string | null;
}) {
  const confirmedItems = items.filter((item) => item.confirmed);

  return (
    <main className="h-full min-h-0 min-w-0 overflow-auto bg-ssoo-content-bg p-4" data-source-surface="billing-actual-list">

      <div className="mx-auto w-full min-w-0" style={{ maxWidth: SSOO_CONTENT_PAGE_METRICS.landscapeContentWidthPx }}>
        <div>
          <h1 className="text-xl font-semibold text-foreground">계약청구실적</h1>
          <p className="mt-1 text-sm text-muted-foreground">확정된 계약을 선택하세요.</p>
        </div>

        <form action="/contracts" className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Input type="hidden" name="sourceSurface" value="billing-actual" />
          <Input type="hidden" name="view" value="list" />
          <SsooSearchInput
            id="ba-list-search"
            name="search"
            ariaLabel="계약청구실적 계약 검색"
            intent="data-filter"
            defaultValue={query.search}
            placeholder="고객사, 계약명, 담당자 검색"
            className="min-w-0 flex-1"
          />
          <NativeSelect id="ba-list-sort" name="sort" defaultValue={query.sort} className="sm:w-[144px]" onChange={(event) => event.currentTarget.form?.requestSubmit()}>
            <option value="updated-desc">최근등록순</option>
            <option value="revenue-desc">매출 높은순</option>
            <option value="start-asc">계약 시작일순</option>
          </NativeSelect>
          <Button type="submit" className="hidden">조회</Button>
        </form>

        {loadError ? (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-ssoo-danger/20 bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger">
            <AlertCircle className="h-4 w-4" />
            {loadError}
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto rounded-xl border bg-card">
          <Table className="w-full min-w-[1020px] text-sm">
            <TableHeader className="bg-muted/50 text-muted-foreground">
              <TableRow>
                <TableHead className="px-3 py-2">고객사</TableHead>
                <TableHead className="px-3 py-2">계약명</TableHead>
                <TableHead className="px-3 py-2">사업구분</TableHead>
                <TableHead className="px-3 py-2">담당자</TableHead>
                <TableHead className="px-3 py-2 text-right">매출액</TableHead>
                <TableHead className="px-3 py-2">계약기간</TableHead>
                <TableHead className="px-3 py-2">WBS 코드</TableHead>
                <TableHead className="px-3 py-2">청구계획</TableHead>
                <TableHead className="w-12 px-3 py-2" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="px-3 py-8 text-center text-ssoo-info">계약을 불러오는 중입니다.</TableCell></TableRow>
              ) : null}
              {!isLoading && confirmedItems.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="px-3 py-8 text-center text-muted-foreground">조회된 확정 계약이 없습니다.</TableCell></TableRow>
              ) : null}
              {confirmedItems.map((item) => {
                const ownerInitial = item.ownerName.trim().slice(0, 2);
                const revenueTotal = getSourceContractRevenue(item);
                const detailHref = buildHref(query, { billingView: 'detail', selected: item.id });
                const rowText = `${item.customerName} ${item.contractName} ${item.businessType} ${ownerInitial} ${item.ownerName} ${formatSourceAmount(revenueTotal)} ${formatSourceDate(item.contractStartDate)}~${formatSourceDate(item.contractEndDate)} ${item.wbsCode ?? '-'} ${item.billingPlan.length}건`;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="px-3 py-3 font-medium text-foreground">{item.customerName}</TableCell>
                    <TableCell className="px-3 py-3 text-foreground">{item.contractName}</TableCell>
                    <TableCell className="px-3 py-3 text-muted-foreground">{item.businessType}</TableCell>
                    <TableCell className="px-3 py-3 text-muted-foreground"><span className="mr-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ssoo-success-bg text-xs text-ssoo-success">{ownerInitial}</span>{item.ownerName}</TableCell>
                    <TableCell className="px-3 py-3 text-right font-medium">{formatSourceAmount(revenueTotal)}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-3 text-muted-foreground">{formatSourceDate(item.contractStartDate)}~{formatSourceDate(item.contractEndDate)}</TableCell>
                    <TableCell className="px-3 py-3 text-muted-foreground">{item.wbsCode ?? '-'}</TableCell>
                    <TableCell className="px-3 py-3"><span className="rounded-full bg-ssoo-info-bg px-2 py-1 text-xs text-ssoo-info">{item.billingPlan.length}건</span></TableCell>
                    <TableCell className="px-3 py-3 text-right">
                      <Link href={detailHref} className="text-muted-foreground hover:text-foreground">
                        <span className="sr-only">{rowText}</span>→
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{confirmedItems.length}건 (확정 계약)</p>
      </div>
    </main>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border bg-card px-4 py-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
      <div className="mt-1 truncate text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function ContractTable({
  items,
  query,
  selectedId,
  isLoading,
}: {
  items: CrmContract[];
  query: ContractWorkspaceQuery;
  selectedId: string;
  isLoading: boolean;
}) {
  return (
    <Table className="w-full min-w-[1120px] text-sm">
      <TableHeader className="sticky top-0 z-10 bg-ssoo-content-bg text-left text-sm font-medium text-muted-foreground shadow-sm [&_tr]:border-b">
        <TableRow className="h-9">
          <TableHead className="w-[130px] px-2 py-2">계약번호</TableHead>
          <TableHead className="w-[260px] px-2 py-2">계약명</TableHead>
          <TableHead className="w-[180px] px-2 py-2">고객사</TableHead>
          <TableHead className="w-[96px] px-2 py-2">상태</TableHead>
          <TableHead className="w-[120px] px-2 py-2">담당자</TableHead>
          <TableHead className="w-[120px] px-2 py-2 text-right">최종 매출</TableHead>
          <TableHead className="w-[120px] px-2 py-2 text-right">원가</TableHead>
          <TableHead className="w-[92px] px-2 py-2 text-right">손익률</TableHead>
          <TableHead className="w-[130px] px-2 py-2">계약기간</TableHead>
          <TableHead className="w-[72px] px-2 py-2"><span className="sr-only">상세</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="divide-y divide-border">
        {isLoading ? (
          <TableRow>
            <TableCell className="h-9 px-2 py-2 text-center text-ssoo-info" colSpan={10}>계약 원장을 불러오는 중입니다.</TableCell>
          </TableRow>
        ) : null}
        {!isLoading && items.length === 0 ? (
          <TableRow>
            <TableCell className="h-9 px-2 py-2 text-center text-muted-foreground" colSpan={10}>조회된 계약이 없습니다.</TableCell>
          </TableRow>
        ) : null}
        {items.map((item) => (
          <ContractTableRow key={item.id} item={item} query={query} selected={item.id === selectedId} />
        ))}
      </TableBody>
    </Table>
  );
}

function ContractTableRow({ item, query, selected }: { item: CrmContract; query: ContractWorkspaceQuery; selected: boolean }) {
  const href = buildHref(query, { selected: item.id });
  const linkClass = `block h-9 px-2 py-2 ${selected ? 'bg-ssoo-info-bg' : 'hover:bg-muted'}`;
  return (
    <TableRow className="h-9 border-b bg-card">
      <TableCell className="whitespace-nowrap p-0 font-medium text-foreground"><Link className={linkClass} href={href}>{item.code}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-foreground"><Link className={linkClass} href={href}>{item.contractName}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-muted-foreground"><Link className={linkClass} href={href}>{item.customerName}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0"><Link className={linkClass} href={href}><span className={`rounded px-2 py-1 text-xs font-medium ${statusTone[item.status]}`}>{statusLabels[item.status]}</span></Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-muted-foreground"><Link className={linkClass} href={href}>{item.ownerName}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-right font-medium text-foreground"><Link className={linkClass} href={href}>{formatCurrency(item.revenueTotal)}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-right text-muted-foreground"><Link className={linkClass} href={href}>{formatCurrency(item.costTotal)}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-right font-medium text-ssoo-secondary"><Link className={linkClass} href={href}>{item.marginRate}%</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-muted-foreground"><Link className={linkClass} href={href}>{formatDate(item.contractStartDate)} - {formatDate(item.contractEndDate)}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0">
        <Link className={`${linkClass} text-center text-ssoo-info`} href={href}>
          <Eye className="mx-auto h-4 w-4" />
        </Link>
      </TableCell>
    </TableRow>
  );
}

function ContractDetail({
  item,
  canConfirm,
  workflowError,
  pendingWorkflow,
  onWorkflow,
}: {
  item: CrmContract | null;
  canConfirm: boolean;
  workflowError: string | null;
  pendingWorkflow: 'confirm' | 'reopen' | null;
  onWorkflow: (action: 'confirm' | 'reopen') => void;
}) {
  if (!item) {
    return <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">선택된 계약이 없습니다.</div>;
  }

  const canStartConfirm = canConfirm && !item.confirmed;
  return (
    <div className="rounded-md border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`rounded px-2 py-1 text-xs font-medium ${statusTone[item.status]}`}>{statusLabels[item.status]}</span>
            {item.confirmed ? (
              <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                <LockKeyhole className="h-3 w-3" />
                확정
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-ssoo-warning-bg px-2 py-1 text-xs font-medium text-ssoo-warning">
                <UnlockKeyhole className="h-3 w-3" />
                검토
              </span>
            )}
          </div>
          <h2 className="mt-2 text-lg font-semibold text-foreground">{item.contractName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{item.customerName} · {item.ownerName} · {regionLabels[item.region]}</p>
        </div>
        {!item.confirmed ? (
          <Button size="sm" type="button" onClick={() => onWorkflow('confirm')} disabled={!canStartConfirm || pendingWorkflow !== null} title={canStartConfirm ? '계약 확정' : '계약 확정 권한이 없습니다.'}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {pendingWorkflow === 'confirm' ? '처리 중' : '확정'}
          </Button>
        ) : (
          <Button variant="outline" size="sm" type="button" onClick={() => onWorkflow('reopen')} disabled={!canConfirm || pendingWorkflow !== null} title={canConfirm ? '계약 확정 해제' : '계약 확정 해제 권한이 없습니다.'}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {pendingWorkflow === 'reopen' ? '처리 중' : '확정 해제'}
          </Button>
        )}
      </div>

      {workflowError ? (
        <div className="flex items-center gap-2 border-b bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger">
          <AlertCircle className="h-4 w-4" />
          {workflowError}
        </div>
      ) : null}

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <InfoList
          items={[
            ['계약번호', item.code],
            ['원천 영업기회', item.sourceOpportunityCode ?? '-'],
            ['고객사 담당자', item.clientContactName ?? '-'],
            ['담당 사용자 ID', item.ownerUserId ?? '-'],
            ['사업구분', item.businessType],
            ['계열/산업', item.industryLine],
            ['WBS', item.wbsCode ?? '-'],
            ['수금조건', item.paymentTermCode ?? '-'],
          ]}
        />
        <InfoList
          items={[
            ['계약기간', `${formatDate(item.contractStartDate)} - ${formatDate(item.contractEndDate)}`],
            ['매출 subtotal', formatWon(item.revenueSubtotal)],
            ['Special DC', item.specialDiscountAmount > 0 ? `-${formatWon(item.specialDiscountAmount)}` : '0원'],
            ['최종 매출', formatWon(item.revenueTotal)],
            ['원가', formatWon(item.costTotal)],
            ['외부원가', formatWon(item.externalCostTotal)],
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 border-t p-4 xl:grid-cols-2">
        <LineTable title="매출 라인" lines={item.revenueLines} />
        <LineTable title="원가 라인" lines={item.costLines} />
      </div>
    </div>
  );
}

function InfoList({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-y-2 text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 truncate font-medium text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function LineTable({ title, lines }: { title: string; lines: CrmContractLine[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      <div className="overflow-auto rounded-md border">
        <Table className="w-full min-w-[520px] text-xs">
          <TableHeader className="bg-ssoo-content-bg text-left text-muted-foreground">
            <TableRow>
              <TableHead className="px-3 py-2">구분/항목</TableHead>
              <TableHead className="w-[74px] px-3 py-2 text-right">수량</TableHead>
              <TableHead className="w-[104px] px-3 py-2 text-right">단가</TableHead>
              <TableHead className="w-[112px] px-3 py-2 text-right">금액</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell className="px-3 py-2 text-muted-foreground">
                  <div className="font-medium text-foreground">{line.label}</div>
                  <div>{lineCategoryLabels[line.category]}{line.serviceType ? ` · ${serviceTypeLabels[line.serviceType]}` : ''}</div>
                </TableCell>
                <TableCell className="px-3 py-2 text-right text-muted-foreground">{line.quantity ?? '-'}</TableCell>
                <TableCell className="px-3 py-2 text-right text-muted-foreground">{line.unitPrice ? formatWon(line.unitPrice) : '-'}</TableCell>
                <TableCell className="px-3 py-2 text-right font-medium text-foreground">{formatWon(line.amount)}</TableCell>
              </TableRow>
            ))}
            {lines.length === 0 ? (
              <TableRow>
                <TableCell className="px-3 py-4 text-center text-muted-foreground" colSpan={4}>내역 없음</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function BillingPlanPanel({ item }: { item: CrmContract | null }) {
  if (!item) {
    return <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">청구계획을 표시할 계약을 선택하세요.</div>;
  }

  const revenueTotal = item.billingPlan.reduce((sum, line) => sum + line.revenueAmount, 0);
  const externalCostTotal = item.billingPlan.reduce((sum, line) => sum + line.externalCostAmount, 0);
  return (
    <div className="rounded-md border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">청구계획</h2>
        <p className="mt-1 text-sm text-muted-foreground">매출 {formatWon(revenueTotal)} · 외부원가 {formatWon(externalCostTotal)}</p>
      </div>
      <BillingPlanTable lines={item.billingPlan} />
      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        계약 매출 차이 {formatWon(Math.abs(item.revenueTotal - revenueTotal))} · 외부원가 차이 {formatWon(Math.abs(item.externalCostTotal - externalCostTotal))}
      </div>
    </div>
  );
}

function PmsHandoffPreviewPanel({
  item,
  preview,
  isLoading,
  error,
}: {
  item: CrmContract | null;
  preview: CrmContractPmsHandoffPreview | null;
  isLoading: boolean;
  error: string | null;
}) {
  if (!item) {
    return <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">PMS 인계 후보를 표시할 계약을 선택하세요.</div>;
  }

  const activePreview = preview?.contractId === item.id ? preview : null;
  const readinessLabel = activePreview?.readiness === 'ready' ? '준비 완료' : '대기';
  const readinessClass = activePreview?.readiness === 'ready'
    ? 'bg-ssoo-success-bg text-ssoo-success'
    : 'bg-ssoo-warning-bg text-ssoo-warning';

  return (
    <div className="rounded-md border bg-card">
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">PMS 인계 후보</h2>
          <p className="mt-1 text-sm text-muted-foreground">{activePreview?.boundaryNotice ?? 'CRM 계약 원장 기준 읽기용 실행 스냅샷'}</p>
        </div>
        <span className={`rounded px-2 py-1 text-xs font-medium ${readinessClass}`}>{isLoading ? '조회 중' : readinessLabel}</span>
      </div>

      {error ? (
        <div className="flex items-center gap-2 border-b bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      {!activePreview && isLoading ? (
        <div className="px-4 py-5 text-sm text-muted-foreground">PMS 인계 후보를 조회하는 중입니다.</div>
      ) : null}

      {activePreview ? (
        <div className="space-y-3 p-4">
          <InfoList
            items={[
              ['계약번호', activePreview.contractCode],
              ['원천 영업기회', activePreview.sourceOpportunityCode ?? '-'],
              ['WBS', activePreview.wbsCode ?? '-'],
              ['계약기간', `${formatDate(activePreview.contractStartDate)} - ${formatDate(activePreview.contractEndDate)}`],
              ['매출', formatWon(activePreview.financials.revenueTotal)],
              ['외부원가', formatWon(activePreview.financials.externalCostTotal)],
              ['청구계획', `${activePreview.financials.billingPlanCount}건`],
              ['PMS 상태', activePreview.handoffStatus],
            ]}
          />
          {activePreview.blockedReasons.length > 0 ? (
            <div className="space-y-1 rounded-md border border-ssoo-warning-border bg-ssoo-warning-bg px-3 py-2 text-xs text-ssoo-warning">
              {activePreview.blockedReasons.map((reason) => (
                <div key={reason}>{reason}</div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-ssoo-success-border bg-ssoo-success-bg px-3 py-2 text-xs text-ssoo-success">
              {activePreview.nextAction}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function DmsDocumentPreviewPanel({
  item,
  canWrite,
  preview,
  isLoading,
  error,
  draft,
  isDraftSaving,
  draftError,
  lifecycleExecution,
  isLifecycleExecuting,
  lifecycleExecutionError,
  onCreateDraft,
  onExecuteLifecycle,
}: {
  item: CrmContract | null;
  canWrite: boolean;
  preview: CrmContractDmsDocumentPreview | null;
  isLoading: boolean;
  error: string | null;
  draft: CrmContractDmsDocumentDraft | null;
  isDraftSaving: boolean;
  draftError: string | null;
  lifecycleExecution: CrmContractDmsDocumentLifecycleExecutionResult | null;
  isLifecycleExecuting: boolean;
  lifecycleExecutionError: string | null;
  onCreateDraft: (templateKey: string) => void;
  onExecuteLifecycle: () => void;
}) {
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('');

  useEffect(() => {
    if (!item || preview?.contractId !== item.id) {
      setSelectedTemplateKey('');
      return;
    }
    setSelectedTemplateKey(preview.templateKey);
  }, [item, preview]);

  if (!item) {
    return <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">DMS 문서 패킷을 표시할 계약을 선택하세요.</div>;
  }

  const activePreview = preview?.contractId === item.id ? preview : null;
  const activeDraft = draft?.contractId === item.id ? draft : null;
  const activeLifecycleExecution = lifecycleExecution?.contractId === item.id ? lifecycleExecution : null;
  const latestHandoff = activeDraft?.handoff ?? activePreview?.latestHandoff;
  const savedDraftPath = activeDraft?.savedPath ?? activePreview?.savedDraftPath ?? latestHandoff?.draftPath;
  const readinessLabel = activePreview?.readiness === 'ready' ? '패킷 준비' : '보완 필요';
  const readinessClass = activePreview?.readiness === 'ready'
    ? 'bg-ssoo-success-bg text-ssoo-success'
    : 'bg-ssoo-warning-bg text-ssoo-warning';
  const canCreateDraft = activePreview?.readiness === 'ready';
  const selectedTemplate = activePreview?.templateOptions.find((option) => option.templateKey === selectedTemplateKey);
  const requiredVariables = activePreview?.variables.filter((variable) => variable.required).slice(0, 8) ?? [];
  const lifecycleSteps = activePreview?.lifecycle ?? [];
  const canExecuteLifecycle = Boolean(
    activePreview
    && latestHandoff
    && savedDraftPath
    && lifecycleSteps.some((step) => step.owner === 'dms' && step.status !== 'completed' && step.status !== 'blocked'),
  );
  const additionalVariableCount = activePreview
    ? Math.max(activePreview.variables.length - requiredVariables.length, 0)
    : 0;

  return (
    <div className="rounded-md border bg-card">
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <FileText className="h-4 w-4 text-muted-foreground" />
            DMS 문서 패킷
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{activePreview?.boundaryNotice ?? 'CRM 계약 원장 기준 읽기용 계약서 입력 패킷'}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`rounded px-2 py-1 text-xs font-medium ${readinessClass}`}>{isLoading ? '조회 중' : readinessLabel}</span>
          {activePreview?.readOnly ? <span className="rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">읽기 전용</span> : null}
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => onCreateDraft(selectedTemplateKey)}
            disabled={!canWrite || !canCreateDraft || isDraftSaving || !selectedTemplate?.selectable}
            className="mt-1"
          >
            <Save className="mr-2 h-4 w-4" />
            {isDraftSaving ? '저장 중' : savedDraftPath ? 'DMS 초안 갱신' : 'DMS 초안 저장'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={onExecuteLifecycle}
            disabled={!canWrite || !canExecuteLifecycle || isLifecycleExecuting}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {isLifecycleExecuting ? '실행 중' : 'DMS 산출 실행'}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 border-b bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      {draftError ? (
        <div className="flex items-center gap-2 border-b bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger">
          <AlertCircle className="h-4 w-4" />
          {draftError}
        </div>
      ) : null}

      {lifecycleExecutionError ? (
        <div className="flex items-center gap-2 border-b bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger">
          <AlertCircle className="h-4 w-4" />
          {lifecycleExecutionError}
        </div>
      ) : null}

      {!activePreview && isLoading ? (
        <div className="px-4 py-5 text-sm text-muted-foreground">DMS 문서 패킷을 조회하는 중입니다.</div>
      ) : null}

      {activePreview ? (
        <div className="space-y-4 p-4">
          {savedDraftPath ? (
            <div className="flex items-start gap-2 rounded-md border border-ssoo-success-border bg-ssoo-success-bg px-3 py-2 text-xs text-ssoo-success">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <div className="font-medium">DMS markdown 초안 저장됨</div>
                <div className="mt-1 break-all text-ssoo-success">{savedDraftPath}</div>
              </div>
            </div>
          ) : null}

          <label className="block space-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">DOCX 템플릿 선택</span>
            <NativeSelect
              value={selectedTemplateKey}
              disabled={isDraftSaving || activePreview.templateOptions.length === 0}
              onChange={(event) => setSelectedTemplateKey(event.target.value)}
            >
              {activePreview.templateOptions.map((option) => (
                <option key={option.templateKey} value={option.templateKey} disabled={!option.selectable}>
                  {option.templateName}{option.selectable ? '' : ` · ${option.unavailableReason ?? '사용 불가'}`}
                </option>
              ))}
            </NativeSelect>
            {selectedTemplate ? (
              <span className="block text-caption-2xs">
                {selectedTemplate.docxFileName ?? 'DOCX binary 없음'} · {selectedTemplate.docxOrigin === 'uploaded' ? '업로드 템플릿' : '자동 생성 템플릿'} · {selectedTemplate.reviewStatus === 'confirmed' ? '검토 확정' : '검토 대기'}
              </span>
            ) : null}
          </label>

          <InfoList
            items={[
              ['문서명', activePreview.documentTitle],
              ['템플릿', activePreview.templateKey],
              ['파일명 hint', activePreview.fileNameHint],
              ['폴더 hint', activePreview.folderHint],
              ['초안 경로', savedDraftPath ?? activePreview.draftPathHint],
              ['Handoff', latestHandoff ? `${latestHandoff.status} · ${formatDateTime(latestHandoff.savedAt)}` : '-'],
              ['Handoff ID', latestHandoff?.id ?? '-'],
              ['DMS 상태', activePreview.dmsLinkStatus],
              ['고객사 담당자', activePreview.clientContactName ?? '-'],
              ['담당 사용자 ID', activePreview.ownerUserId ?? '-'],
              ['공급자', `${activePreview.sellerName} · ${activePreview.sellerInfoStatus}`],
            ]}
          />

          {lifecycleSteps.length > 0 ? (
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">DMS Lifecycle</h3>
                <span className="text-xs text-muted-foreground">전체 {lifecycleSteps.length}단계</span>
              </div>
              <div className="divide-y rounded-md border text-xs">
                {lifecycleSteps.map((step) => (
                  <div key={step.key} className="grid gap-2 px-3 py-2 sm:grid-cols-[128px_76px_96px_minmax(0,1fr)]">
                    <div className="font-medium text-foreground">{step.key === 'approval' ? '역할별 생성 기록' : step.label}</div>
                    <div className="text-muted-foreground">{getLifecycleOwnerLabel(step.owner)}</div>
                    <div>
                      <span className={`rounded px-2 py-0.5 font-medium ${getLifecycleStatusClass(step.status)}`}>
                        {step.key === 'approval' && step.status === 'completed' ? '기록 완료' : getLifecycleStatusLabel(step.status)}
                      </span>
                    </div>
                    <div className="min-w-0 text-muted-foreground">
                      <div className="break-all">{step.evidencePath ?? step.evidenceLabel}</div>
                      <div className="mt-1 break-words">
                        {step.key === 'approval' ? '문서 생성 시 자동으로 남기는 역할별 기록입니다. 담당자별 검토·승인 결과가 아닙니다.' : step.note}
                      </div>
                      {(step.key === 'word-export' || step.key === 'pdf-export') && step.status === 'completed' ? (
                        <a
                          href={`/api/crm/contracts/${encodeURIComponent(item.id)}/dms-document-artifacts/${step.key}`}
                          download
                          className="mt-1 inline-flex items-center gap-1 font-medium text-ssoo-accent hover:underline"
                        >
                          <Download className="h-3 w-3" /> {step.key === 'word-export' ? 'DOCX 다운로드' : 'PDF 다운로드'}
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeLifecycleExecution ? (
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">DMS 산출물</h3>
                <span className="text-xs text-muted-foreground">{formatDateTime(activeLifecycleExecution.dmsExecution.executedAt)}</span>
              </div>
              <div className="divide-y rounded-md border text-xs">
                {activeLifecycleExecution.dmsExecution.artifacts.map((artifact) => (
                  <div key={`${artifact.kind}-${artifact.path}`} className="grid gap-2 px-3 py-2 sm:grid-cols-[132px_minmax(0,1fr)]">
                    <div className="font-medium text-foreground">{artifact.label}</div>
                    <div className="min-w-0 break-all text-muted-foreground">
                      <div>{artifact.storageUri ?? artifact.path}</div>
                      {(artifact.kind === 'word-export' || artifact.kind === 'pdf-export') ? (
                        <a
                          href={`/api/crm/contracts/${encodeURIComponent(item.id)}/dms-document-artifacts/${artifact.kind}`}
                          download
                          className="mt-1 inline-flex items-center gap-1 font-medium text-ssoo-accent hover:underline"
                        >
                          <Download className="h-3 w-3" /> {artifact.kind === 'word-export' ? 'DOCX 다운로드' : 'PDF 다운로드'}
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeLifecycleExecution ? (
            <DmsGovernanceEvidencePanel governance={activeLifecycleExecution.dmsExecution.governance} />
          ) : null}

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">필수 변수</h3>
              <span className="text-xs text-muted-foreground">전체 {activePreview.variables.length}개</span>
            </div>
            <div className="divide-y rounded-md border text-xs">
              {requiredVariables.map((variable) => (
                <div key={variable.key} className="grid grid-cols-[112px_minmax(0,1fr)] gap-2 px-3 py-2">
                  <div className="text-muted-foreground">{variable.label}</div>
                  <div className="min-w-0 break-words font-medium text-foreground">{variable.value}</div>
                </div>
              ))}
            </div>
            {additionalVariableCount > 0 ? (
              <div className="mt-2 text-xs text-muted-foreground">추가 변수 {additionalVariableCount}개는 DMS 템플릿 매핑 후보로만 전달됩니다.</div>
            ) : null}
          </div>

          <div className="space-y-2">
            {activePreview.attachments.map((attachment) => (
              <div key={attachment.key} className="rounded-md border px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{attachment.label}</span>
                  <span className={`rounded px-2 py-0.5 font-medium ${getAttachmentStatusClass(attachment.status)}`}>
                    {getAttachmentStatusLabel(attachment.status)}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">{attachment.note}</p>
                {attachment.referenceStatus ? (
                  <div className="mt-1">
                    <span className={`rounded px-2 py-0.5 font-medium ${getAttachmentReferenceStatusClass(attachment.referenceStatus)}`}>
                      CI 참조 {getAttachmentReferenceStatusLabel(attachment.referenceStatus)}
                    </span>
                    {attachment.referenceReason ? (
                      <span className="ml-2 break-words text-muted-foreground">{attachment.referenceReason}</span>
                    ) : null}
                  </div>
                ) : null}
                {attachment.evidencePath ? (
                  <div className="mt-1 break-all text-muted-foreground">
                    {attachment.evidenceLabel ? `${attachment.evidenceLabel}: ` : ''}
                    {attachment.evidencePath}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {activePreview.blockedReasons.length > 0 ? (
            <div className="space-y-1 rounded-md border border-ssoo-warning-border bg-ssoo-warning-bg px-3 py-2 text-xs text-ssoo-warning">
              {activePreview.blockedReasons.map((reason) => (
                <div key={reason}>{reason}</div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-ssoo-success-border bg-ssoo-success-bg px-3 py-2 text-xs text-ssoo-success">
              {activePreview.nextAction}
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t pt-3">
            {activePreview.unavailableActions.map((action) => (
              <span key={action} className="rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{action}</span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DmsGovernanceEvidencePanel({ governance }: { governance: DmsLifecycleExecutionGovernance }) {
  const templateVersion = governance.templateVersion;
  const exportPolicy = governance.exportPolicy;
  const templateChangeRequestLedger = governance.templateChangeRequestLedger;
  const attachmentFinalizationLedger = governance.attachmentFinalizationLedger;
  const approvalRoute = governance.approvalRoute;
  const approvalRouteLedger = governance.approvalRouteLedger;
  const approvalActors = governance.approvalActors;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">DMS Governance Evidence</h3>
        <span className="text-xs text-muted-foreground">{approvalRouteLedger.syncStatus}</span>
      </div>
      <div className="divide-y rounded-md border text-xs">
        <div className="grid gap-2 px-3 py-2 sm:grid-cols-[148px_minmax(0,1fr)]">
          <div className="font-medium text-foreground">템플릿 버전</div>
          <div className="min-w-0 text-muted-foreground">
            <div className="break-all">{templateVersion.versionId}</div>
            <div className="mt-1 break-all">{templateVersion.sourcePath ?? templateVersion.templateName}</div>
          </div>
        </div>
        <div className="grid gap-2 px-3 py-2 sm:grid-cols-[148px_minmax(0,1fr)]">
          <div className="font-medium text-foreground">산출 정책</div>
          <div className="min-w-0 text-muted-foreground">
            <div>{exportPolicy.policyKey} · {exportPolicy.policyVersion}</div>
            <div className="mt-1 break-words">scope: {exportPolicy.organizationScope} · {formatDateTime(exportPolicy.resolvedAt)}</div>
            <div className="mt-1 break-all">{exportPolicy.resolvedRecordPath}</div>
            <div className="mt-1 break-all">{exportPolicy.resolvedArtifactPath}</div>
          </div>
        </div>
        <div className="grid gap-2 px-3 py-2 sm:grid-cols-[148px_minmax(0,1fr)]">
          <div className="font-medium text-foreground">템플릿 변경 원장</div>
          <div className="min-w-0 text-muted-foreground">
            <div>{templateChangeRequestLedger.status} · {templateChangeRequestLedger.evidenceLabel}</div>
            <div className="mt-1 break-words">{templateChangeRequestLedger.reason}</div>
          </div>
        </div>
        <div className="grid gap-2 px-3 py-2 sm:grid-cols-[148px_minmax(0,1fr)]">
          <div className="font-medium text-foreground">첨부 확정 원장</div>
          <div className="min-w-0 text-muted-foreground">
            <div>
              {attachmentFinalizationLedger.status}
              {' · '}
              {attachmentFinalizationLedger.finalizedAttachmentCount}/{attachmentFinalizationLedger.attachmentCount}건 확정
              {attachmentFinalizationLedger.deferredAttachmentCount > 0 ? ` · ${attachmentFinalizationLedger.deferredAttachmentCount}건 보류` : ''}
            </div>
            <div className="mt-1 break-all">{attachmentFinalizationLedger.ledgerId}</div>
            <div className="mt-1 break-all">{attachmentFinalizationLedger.attachmentRecordPath}</div>
          </div>
        </div>
        <div className="grid gap-2 px-3 py-2 sm:grid-cols-[148px_minmax(0,1fr)]">
          <div className="font-medium text-foreground">결재선 원장</div>
          <div className="min-w-0 text-muted-foreground">
            <div>{approvalRoute.routeName} · 역할별 기록 {approvalRouteLedger.syncedActorCount}건 동기화</div>
            <div className="mt-1 break-all">{approvalRouteLedger.routeRecordPath}</div>
            <div className="mt-1 break-all">{approvalRouteLedger.workflowRecordPath}</div>
            <div className="mt-1 break-words">{approvalRouteLedger.directorySyncStatus} · {approvalRouteLedger.directorySource}</div>
          </div>
        </div>
      </div>

      {approvalActors.length > 0 ? (
        <div className="mt-2 divide-y rounded-md border text-xs">
          <p className="px-3 py-2 text-muted-foreground">역할별 생성 기록입니다. 같은 실행자가 여러 역할에 기록될 수 있으며, 담당자별 검토·승인 결과가 아닙니다.</p>
          {approvalActors.map((actor) => (
            <div key={`${actor.sequence}-${actor.role}-${actor.loginId}`} className="grid gap-2 px-3 py-2 sm:grid-cols-[148px_minmax(0,1fr)]">
              <div className="font-medium text-foreground">{actor.role}</div>
              <div className="min-w-0 text-muted-foreground">
                <div>{actor.displayName} · {actor.status === 'approved' ? '자동 생성 기록' : actor.status} · 생성 시각 {formatDateTime(actor.approvedAt)}</div>
                <div className="mt-1 break-words">{actor.note}</div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-2 break-words text-xs text-muted-foreground">{governance.boundaryNotice}</div>
    </div>
  );
}

function getAttachmentStatusLabel(status: CrmContractDmsDocumentPreview['attachments'][number]['status']) {
  if (status === 'ready') {
    return '준비';
  }
  if (status === 'planned') {
    return 'DMS 예정';
  }
  return '차단';
}

function getAttachmentStatusClass(status: CrmContractDmsDocumentPreview['attachments'][number]['status']) {
  if (status === 'ready') {
    return 'bg-ssoo-success-bg text-ssoo-success';
  }
  if (status === 'planned') {
    return 'bg-ssoo-info-bg text-ssoo-info';
  }
  return 'bg-ssoo-warning-bg text-ssoo-warning';
}

function getAttachmentReferenceStatusLabel(status: NonNullable<CrmContractDmsDocumentPreview['attachments'][number]['referenceStatus']>) {
  if (status === 'verified') {
    return '확인됨';
  }
  if (status === 'missing') {
    return '누락';
  }
  if (status === 'invalid') {
    return '형식 오류';
  }
  if (status === 'unverified') {
    return '미검증';
  }
  if (status === 'planned') {
    return '예정';
  }
  return '미설정';
}

function getAttachmentReferenceStatusClass(status: NonNullable<CrmContractDmsDocumentPreview['attachments'][number]['referenceStatus']>) {
  if (status === 'verified') {
    return 'bg-ssoo-success-bg text-ssoo-success';
  }
  if (status === 'missing' || status === 'invalid') {
    return 'bg-ssoo-warning-bg text-ssoo-warning';
  }
  return 'bg-ssoo-info-bg text-ssoo-info';
}

function getLifecycleOwnerLabel(owner: CrmContractDmsDocumentPreview['lifecycle'][number]['owner']) {
  return owner === 'crm' ? 'CRM' : 'DMS';
}

function getLifecycleStatusLabel(status: CrmContractDmsDocumentPreview['lifecycle'][number]['status']) {
  if (status === 'completed') {
    return '완료';
  }
  if (status === 'ready') {
    return '준비';
  }
  if (status === 'pending') {
    return 'DMS 대기';
  }
  return '차단';
}

function getLifecycleStatusClass(status: CrmContractDmsDocumentPreview['lifecycle'][number]['status']) {
  if (status === 'completed') {
    return 'bg-ssoo-success-bg text-ssoo-success';
  }
  if (status === 'ready') {
    return 'bg-ssoo-info-bg text-ssoo-info';
  }
  if (status === 'pending') {
    return 'bg-muted text-muted-foreground';
  }
  return 'bg-ssoo-warning-bg text-ssoo-warning';
}

function BillingActualPanel({
  item,
  canWrite,
  data,
  isLoading,
  error,
  accessToken,
  onSaved,
  variant = 'workspace',
}: {
  item: CrmContract | null;
  canWrite: boolean;
  data: CrmContractBillingActualResponse | null;
  isLoading: boolean;
  error: string | null;
  accessToken: string | null;
  onSaved: (data: CrmContractBillingActualResponse) => Promise<void>;
  variant?: 'workspace' | 'source';
}) {
  const [lines, setLines] = useState<BillingActualDraftLine[]>([createBillingActualDraftLine()]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const activeData = data?.contractId === item?.id ? data : null;

  useEffect(() => {
    setLines(
      variant === 'source' && activeData && activeData.actualLines.length === 0
        ? []
        : toBillingActualDraftLines(activeData),
    );
    setSaveError(null);
    setSaveSuccess(null);
  }, [activeData, item?.id, variant]);

  const planLines = activeData?.planLines ?? item?.billingPlan ?? [];
  const planRevenueTotal = planLines.reduce((sum, line) => sum + line.revenueAmount, 0);
  const planExternalCostTotal = planLines.reduce((sum, line) => sum + line.externalCostAmount, 0);
  const actualSummary = useMemo(() => {
    return lines.reduce((summary, line) => {
      const revenueAmount = parseMoneyInput(line.revenueAmount);
      const externalCostAmount = parseMoneyInput(line.externalCostAmount);
      return {
        revenueTotal: summary.revenueTotal + (revenueAmount ?? 0),
        externalCostTotal: summary.externalCostTotal + (externalCostAmount ?? 0),
        hasInvalidAmount: summary.hasInvalidAmount || revenueAmount === null || externalCostAmount === null,
      };
    }, { revenueTotal: 0, externalCostTotal: 0, hasInvalidAmount: false });
  }, [lines]);
  const revenueDelta = actualSummary.revenueTotal - planRevenueTotal;
  const externalCostDelta = actualSummary.externalCostTotal - planExternalCostTotal;
  const isReadOnly = !canWrite || !item?.confirmed;
  const canSave = Boolean(canWrite && item && item.confirmed && accessToken && !isSaving && !isLoading);

  const updateLine = (id: string, patch: Partial<Omit<BillingActualDraftLine, 'id'>>) => {
    setSaveSuccess(null);
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  };

  const addLine = () => {
    setSaveSuccess(null);
    setLines((current) => [...current, createBillingActualDraftLine()]);
  };

  const removeLine = (id: string) => {
    setSaveSuccess(null);
    setLines((current) => {
      const next = current.filter((line) => line.id !== id);
      return next.length > 0 || variant === 'source' ? next : [createBillingActualDraftLine()];
    });
  };

  const saveActual = async () => {
    if (!item || !accessToken) {
      setSaveError('로그인 세션을 확인해 주세요.');
      return;
    }
    if (!item.confirmed) {
      setSaveError('확정된 계약에서만 청구실적을 저장할 수 있습니다.');
      return;
    }

    const nextLines: Array<{ billingYm: string; revenueAmount: number; externalCostAmount: number }> = [];
    const seen = new Set<string>();
    for (const line of lines) {
      const billingYm = line.billingYm.trim();
      const revenueAmount = parseMoneyInput(line.revenueAmount);
      const externalCostAmount = parseMoneyInput(line.externalCostAmount);
      if (revenueAmount === null || externalCostAmount === null) {
        setSaveError('금액은 0 이상의 숫자로 입력해 주세요.');
        return;
      }
      if (!billingYm && revenueAmount === 0 && externalCostAmount === 0) {
        continue;
      }
      if (!/^\d{4}\/(0[1-9]|1[0-2])$/.test(billingYm)) {
        setSaveError('청구 실적월은 YYYY/MM 형식으로 입력해 주세요.');
        return;
      }
      if (seen.has(billingYm)) {
        setSaveError(`청구 실적월이 중복되었습니다: ${billingYm}`);
        return;
      }
      seen.add(billingYm);
      nextLines.push({ billingYm, revenueAmount, externalCostAmount });
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const response = await fetch(`/api/crm/contracts/${encodeURIComponent(item.id)}/billing-actual`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lines: nextLines }),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmContractBillingActualResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      await onSaved(payload.data);
      setSaveSuccess('청구실적이 저장되었습니다.');
    } catch (saveActualError) {
      setSaveError(saveActualError instanceof Error ? saveActualError.message : '청구실적 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!item) {
    return <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">청구실적을 입력할 계약을 선택하세요.</div>;
  }

  if (variant === 'source') {
    return (
      <div data-source-billing-actual-ready={!isLoading && activeData ? 'true' : 'false'}>
        {error ? (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger"><AlertCircle className="h-4 w-4" />{error}</div>
        ) : null}
        {saveError ? (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger" role="alert"><AlertCircle className="h-4 w-4" />{saveError}</div>
        ) : null}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SourceContractMetric label="계획 매출액" value={formatSourceAmount(planRevenueTotal)} sub={formatWon(planRevenueTotal)} />
          <SourceContractMetric label="실적 매출액" value={formatSourceAmount(actualSummary.revenueTotal)} sub={`달성률 ${formatPercent(getBillingAchievementRate(actualSummary.revenueTotal, planRevenueTotal))}`} accent />
          <SourceContractMetric label="계획 외부원가" value={formatSourceAmount(planExternalCostTotal)} sub={formatWon(planExternalCostTotal)} />
          <SourceContractMetric label="실적 외부원가" value={formatSourceAmount(actualSummary.externalCostTotal)} sub={`달성률 ${formatPercent(getBillingAchievementRate(actualSummary.externalCostTotal, planExternalCostTotal))}`} accent />
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground"><label>청구계획</label></h2>
            <div className="mt-3 overflow-x-auto rounded-md border"><BillingPlanTable lines={planLines} /></div>
            <div className="mt-2 bg-muted/50 px-3 py-2 text-right text-sm text-muted-foreground">계획 합계&nbsp;&nbsp; {formatWon(planRevenueTotal)} &nbsp;/&nbsp; {formatWon(planExternalCostTotal)}</div>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground"><label>청구실적 + 행 추가</label></h2>
              <Button size="sm" type="button" onClick={addLine} disabled={isReadOnly}>+ 행 추가</Button>
            </div>
            {!item.confirmed ? <p className="mt-3 rounded-md bg-ssoo-warning-bg px-3 py-2 text-sm text-ssoo-warning">확정 계약에서만 청구실적을 저장할 수 있습니다.</p> : null}
            <div className="mt-3 overflow-x-auto rounded-md border">
              <Table className="w-full min-w-[420px] text-xs">
                <TableHeader className="bg-muted/50 text-muted-foreground">
                  <TableRow><TableHead className="px-3 py-2">청구월</TableHead><TableHead className="px-3 py-2 text-right">매출액 (원)</TableHead><TableHead className="px-3 py-2 text-right">외부원가 (원)</TableHead><TableHead className="w-10 px-3 py-2"><span className="sr-only">삭제</span></TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? <TableRow><TableCell colSpan={4} className="px-3 py-4 text-center text-ssoo-info">청구실적을 불러오는 중입니다.</TableCell></TableRow> : null}
                  {!isLoading ? lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="px-3 py-2"><Input value={line.billingYm} placeholder="YYYY/MM" className="h-8" disabled={isReadOnly} onChange={(event) => updateLine(line.id, { billingYm: event.target.value })} /></TableCell>
                      <TableCell className="px-3 py-2"><Input value={line.revenueAmount} placeholder="0" inputMode="numeric" className="h-8 text-right" disabled={isReadOnly} onChange={(event) => updateLine(line.id, { revenueAmount: event.target.value })} /></TableCell>
                      <TableCell className="px-3 py-2"><Input value={line.externalCostAmount} placeholder="0" inputMode="numeric" className="h-8 text-right" disabled={isReadOnly} onChange={(event) => updateLine(line.id, { externalCostAmount: event.target.value })} /></TableCell>
                      <TableCell className="px-3 py-2"><Button variant="ghost" size="icon" type="button" title="실적 행 삭제" disabled={isReadOnly} onClick={() => removeLine(line.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  )) : null}
                  {!isLoading && lines.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="px-3 py-8 text-center text-muted-foreground">행 추가를 눌러 실적을 입력하세요.</TableCell></TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
            <div className="mt-2 bg-muted/50 px-3 py-2 text-right text-sm text-muted-foreground">실적 합계&nbsp;&nbsp; {formatWon(actualSummary.revenueTotal)} &nbsp;/&nbsp; {formatWon(actualSummary.externalCostTotal)}</div>
          </div>
        </section>
        <div className="mt-4 flex justify-end">
          <Button type="button" onClick={() => void saveActual()} disabled={!canSave || actualSummary.hasInvalidAmount}>
            <Save className="mr-2 h-4 w-4" />{isSaving ? '저장 중' : '실적 저장'}
          </Button>
        </div>
        {saveSuccess ? (
          <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-foreground px-4 py-3 text-sm text-background shadow-lg" role="status">{saveSuccess}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card">
      <div className="border-b px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-foreground">청구실적</h2>
            <p className="mt-1 text-sm text-muted-foreground">계획 대비 매출/외부원가 실적</p>
          </div>
          {item.confirmed ? (
            <span className="rounded bg-ssoo-success-bg px-2 py-1 text-xs font-medium text-ssoo-success">저장 가능</span>
          ) : (
            <span className="rounded bg-ssoo-warning-bg px-2 py-1 text-xs font-medium text-ssoo-warning">확정 전</span>
          )}
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 border-b bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}
      {saveError ? (
        <div className="flex items-center gap-2 border-b bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger">
          <AlertCircle className="h-4 w-4" />
          {saveError}
        </div>
      ) : null}
      {!item.confirmed ? (
        <div className="flex items-center gap-2 border-b bg-ssoo-warning-bg px-4 py-3 text-sm text-ssoo-warning">
          <LockKeyhole className="h-4 w-4" />
          확정 계약에서만 청구실적을 저장할 수 있습니다.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 border-b p-3">
        <BillingActualMetric
          label="매출 실적"
          value={formatWon(actualSummary.revenueTotal)}
          sub={`${formatPercent(getBillingAchievementRate(actualSummary.revenueTotal, planRevenueTotal))} · ${formatSignedWon(revenueDelta)}`}
        />
        <BillingActualMetric
          label="외부원가 실적"
          value={formatWon(actualSummary.externalCostTotal)}
          sub={`${formatPercent(getBillingAchievementRate(actualSummary.externalCostTotal, planExternalCostTotal))} · ${formatSignedWon(externalCostDelta)}`}
        />
      </div>

      <div className="overflow-auto">
        <Table className="w-full min-w-[420px] text-xs">
          <TableHeader className="bg-ssoo-content-bg text-left text-muted-foreground">
            <TableRow>
              <TableHead className="w-[92px] px-3 py-2">실적월</TableHead>
              <TableHead className="px-3 py-2 text-right">매출</TableHead>
              <TableHead className="px-3 py-2 text-right">외부원가</TableHead>
              <TableHead className="w-[44px] px-3 py-2"><span className="sr-only">삭제</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border">
            {isLoading ? (
              <TableRow>
                <TableCell className="px-3 py-4 text-center text-ssoo-info" colSpan={4}>청구실적을 불러오는 중입니다.</TableCell>
              </TableRow>
            ) : null}
            {!isLoading ? lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell className="px-3 py-2">
                  <Input
                    value={line.billingYm}
                    placeholder="2026/07"
                    className="h-8"
                    disabled={isReadOnly}
                    onChange={(event) => updateLine(line.id, { billingYm: event.target.value })}
                  />
                </TableCell>
                <TableCell className="px-3 py-2">
                  <Input
                    value={line.revenueAmount}
                    inputMode="numeric"
                    className="h-8 text-right"
                    disabled={isReadOnly}
                    onChange={(event) => updateLine(line.id, { revenueAmount: event.target.value })}
                  />
                </TableCell>
                <TableCell className="px-3 py-2">
                  <Input
                    value={line.externalCostAmount}
                    inputMode="numeric"
                    className="h-8 text-right"
                    disabled={isReadOnly}
                    onChange={(event) => updateLine(line.id, { externalCostAmount: event.target.value })}
                  />
                </TableCell>
                <TableCell className="px-3 py-2 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    title="실적 행 삭제"
                    disabled={isReadOnly}
                    onClick={() => removeLine(line.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            )) : null}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
        <div className="text-xs text-muted-foreground">
          계획 매출 {formatWon(planRevenueTotal)} · 계획 외부원가 {formatWon(planExternalCostTotal)}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" type="button" onClick={addLine} disabled={isReadOnly}>
            <Plus className="mr-2 h-4 w-4" />
            행 추가
          </Button>
          <Button size="sm" type="button" onClick={() => void saveActual()} disabled={!canSave || actualSummary.hasInvalidAmount}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? '저장 중' : '실적 저장'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function BillingActualMetric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-md border bg-ssoo-content-bg px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-foreground">{value}</div>
      <div className="mt-1 truncate text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function BillingPlanTable({ lines }: { lines: CrmContractBillingPlanLine[] }) {
  return (
    <div className="overflow-auto">
      <Table className="w-full text-sm">
        <TableHeader className="bg-ssoo-content-bg text-left text-muted-foreground">
          <TableRow>
            <TableHead className="px-3 py-2">예정월</TableHead>
            <TableHead className="px-3 py-2 text-right">매출</TableHead>
            <TableHead className="px-3 py-2 text-right">외부원가</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border">
          {lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell className="px-3 py-2 font-medium text-foreground">{line.billingYm}</TableCell>
              <TableCell className="px-3 py-2 text-right text-muted-foreground">{formatWon(line.revenueAmount)}</TableCell>
              <TableCell className="px-3 py-2 text-right text-muted-foreground">{formatWon(line.externalCostAmount)}</TableCell>
            </TableRow>
          ))}
          {lines.length === 0 ? (
            <TableRow>
              <TableCell className="px-3 py-4 text-center text-muted-foreground" colSpan={3}>청구계획 없음</TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
