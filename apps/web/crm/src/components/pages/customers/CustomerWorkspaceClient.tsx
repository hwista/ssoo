'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle2,
  Eye,
  Plus,
  RefreshCw,
  Save,
  Search,
  UserRound,
} from 'lucide-react';
import type {
  CrmCustomer,
  CrmCustomerAccessSnapshot,
  CrmCustomerActivity,
  CrmCustomerActivityCreateRequest,
  CrmCustomerActivityStatus,
  CrmCustomerActivityType,
  CrmCustomerGlobalAccessSnapshot,
  CrmCustomerListResponse,
  CrmCustomerRegion,
  CrmCustomerSort,
  CrmCustomerType,
  CrmCustomerUpsertRequest,
} from '@ssoo/types/crm';
import {
  Button,
  Input,
  NativeSelect,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '@ssoo/web-ui';
import { SSOO_CONTENT_PAGE_METRICS, SSOO_PAGE_CHROME_METRICS, SsooSearchInput } from '@ssoo/web-shell';
import { useAuthStore } from '@/stores/auth.store';

export interface CustomerWorkspaceQuery {
  search: string;
  type: CrmCustomerType | 'all';
  sort: CrmCustomerSort;
  selected: string;
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

interface CustomerDraft {
  customerName: string;
  type: CrmCustomerType;
  industryLine: string;
  region: CrmCustomerRegion;
  ownerName: string;
  ownerUserId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  latestOpportunityCode: string;
  lastInteractionSummary: string;
  nextAction: string;
}

interface ActivityDraft {
  type: CrmCustomerActivityType;
  status: CrmCustomerActivityStatus;
  subject: string;
  occurredAt: string;
  dueAt: string;
  ownerName: string;
  ownerUserId: string;
  summary: string;
  nextAction: string;
}

const customerTypeLabels: Record<CrmCustomerType, string> = {
  prospect: '잠재',
  active: '거래중',
  partner: '파트너',
  inactive: '비활성',
};

const customerTypeTone: Record<CrmCustomerType, string> = {
  prospect: 'bg-ssoo-info-bg text-ssoo-info',
  active: 'bg-ssoo-success-bg text-ssoo-success',
  partner: 'bg-ssoo-accent-bg text-ssoo-accent',
  inactive: 'bg-muted text-muted-foreground',
};

const regionLabels: Record<CrmCustomerRegion, string> = {
  domestic: '국내',
  overseas: '해외',
};

const sortLabels: Record<CrmCustomerSort, string> = {
  'updated-desc': '최근 수정순',
  'activity-desc': '최근 활동순',
  'name-asc': '고객명순',
};

const activityTypeLabels: Record<CrmCustomerActivityType, string> = {
  call: '통화',
  meeting: '미팅',
  email: '이메일',
  proposal: '제안',
  contract: '계약',
  support: '지원',
  'opportunity-next-action': '영업기회 후속',
};

const activityStatusLabels: Record<CrmCustomerActivityStatus, string> = {
  planned: '예정',
  done: '완료',
  cancelled: '취소',
};

const activityStatusTone: Record<CrmCustomerActivityStatus, string> = {
  planned: 'bg-ssoo-warning-bg text-ssoo-warning',
  done: 'bg-ssoo-success-bg text-ssoo-success',
  cancelled: 'bg-muted text-muted-foreground',
};

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('ko-KR');
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toDateTimeInputValue(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function emptyCustomerDraft(): CustomerDraft {
  return {
    customerName: '',
    type: 'prospect',
    industryLine: '',
    region: 'domestic',
    ownerName: '',
    ownerUserId: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    latestOpportunityCode: '',
    lastInteractionSummary: '',
    nextAction: '',
  };
}

function toCustomerDraft(customer: CrmCustomer | null): CustomerDraft {
  if (!customer) {
    return emptyCustomerDraft();
  }

  return {
    customerName: customer.customerName,
    type: customer.type,
    industryLine: customer.industryLine,
    region: customer.region,
    ownerName: customer.ownerName,
    ownerUserId: customer.ownerUserId ?? '',
    contactName: customer.contactName ?? '',
    contactEmail: customer.contactEmail ?? '',
    contactPhone: customer.contactPhone ?? '',
    latestOpportunityCode: customer.latestOpportunityCode ?? '',
    lastInteractionSummary: customer.lastInteractionSummary ?? '',
    nextAction: customer.nextAction,
  };
}

function emptyActivityDraft(customer: CrmCustomer | null): ActivityDraft {
  return {
    type: 'meeting',
    status: 'done',
    subject: '',
    occurredAt: toDateTimeInputValue(new Date().toISOString()),
    dueAt: '',
    ownerName: customer?.ownerName ?? '',
    ownerUserId: customer?.ownerUserId ?? '',
    summary: '',
    nextAction: customer?.nextAction ?? '',
  };
}

function optionalText(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function buildHref(query: CustomerWorkspaceQuery, patch: Partial<Record<'search' | 'type' | 'sort' | 'selected', string>>) {
  const params = new URLSearchParams();
  const next = { ...query, ...patch };
  if (next.search) params.set('search', next.search);
  if (next.type && next.type !== 'all') params.set('type', next.type);
  if (next.sort && next.sort !== 'updated-desc') params.set('sort', next.sort);
  if (next.selected) params.set('selected', next.selected);
  const suffix = params.toString();
  return suffix ? `/customers?${suffix}` : '/customers';
}

function buildApiHref(query: CustomerWorkspaceQuery) {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.type && query.type !== 'all') params.set('type', query.type);
  if (query.sort && query.sort !== 'updated-desc') params.set('sort', query.sort);
  const suffix = params.toString();
  return suffix ? `/api/crm/customers?${suffix}` : '/api/crm/customers';
}

function getBackendErrorMessage(responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null): string {
  if (!responseBody || responseBody.success === true) {
    return 'CRM 고객 처리 중 오류가 발생했습니다.';
  }

  return responseBody.error?.message || responseBody.message || 'CRM 고객 처리 중 오류가 발생했습니다.';
}

export function CustomerWorkspaceClient({ data, query }: { data: CrmCustomerListResponse; query: CustomerWorkspaceQuery }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const router = useRouter();
  const [currentData, setCurrentData] = useState(data);
  const [filters, setFilters] = useState(() => ({ search: query.search, type: query.type, sort: query.sort }));
  const [isReloading, setIsReloading] = useState(data.items.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [pendingWorkflow, setPendingWorkflow] = useState<'customer' | 'activity' | null>(null);
  const [globalAccess, setGlobalAccess] = useState<CrmCustomerGlobalAccessSnapshot | null>(null);
  const [customerAccess, setCustomerAccess] = useState<CrmCustomerAccessSnapshot | null>(null);
  const [isGlobalAccessLoading, setIsGlobalAccessLoading] = useState(false);
  const [isAccessLoading, setIsAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const apiHref = useMemo(() => buildApiHref(query), [query]);
  const selected = useMemo(() => (
    currentData.items.find((item) => item.id === query.selected || item.code === query.selected)
    ?? currentData.items[0]
    ?? null
  ), [currentData.items, query.selected]);
  const [customerDraft, setCustomerDraft] = useState<CustomerDraft>(() => toCustomerDraft(selected));
  const [activityDraft, setActivityDraft] = useState<ActivityDraft>(() => emptyActivityDraft(selected));

  useEffect(() => {
    setFilters({ search: query.search, type: query.type, sort: query.sort });
  }, [query.search, query.type, query.sort]);

  useEffect(() => {
    setCurrentData(data);
    if (data.items.length > 0) {
      setIsReloading(false);
    }
  }, [data]);

  useEffect(() => {
    setCustomerDraft(toCustomerDraft(selected));
    setActivityDraft(emptyActivityDraft(selected));
  }, [selected]);

  const loadCustomers = useCallback(async (signal?: AbortSignal) => {
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
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmCustomerListResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setCurrentData(payload.data);
      return payload.data;
    } catch (error) {
      if (signal?.aborted) {
        return null;
      }
      setLoadError(error instanceof Error ? error.message : 'CRM 고객 원장 조회에 실패했습니다.');
      return null;
    } finally {
      if (!signal?.aborted) {
        setIsReloading(false);
      }
    }
  }, [accessToken, apiHref]);

  useEffect(() => {
    const abortController = new AbortController();
    void loadCustomers(abortController.signal);
    return () => abortController.abort();
  }, [loadCustomers]);

  useEffect(() => {
    if (!accessToken) {
      setGlobalAccess(null);
      setAccessError(null);
      setIsGlobalAccessLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsGlobalAccessLoading(true);
    setAccessError(null);
    void (async () => {
      try {
        const response = await fetch('/api/crm/customers/access', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: abortController.signal,
        });
        const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmCustomerGlobalAccessSnapshot> | BackendErrorResponse | null;
        if (!response.ok || payload?.success !== true) {
          throw new Error(getBackendErrorMessage(payload));
        }
        setGlobalAccess(payload.data);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }
        setGlobalAccess(null);
        setAccessError(error instanceof Error ? error.message : 'CRM 고객 권한 조회에 실패했습니다.');
      } finally {
        if (!abortController.signal.aborted) {
          setIsGlobalAccessLoading(false);
        }
      }
    })();

    return () => abortController.abort();
  }, [accessToken]);

  useEffect(() => {
    if (!selected || !accessToken) {
      setCustomerAccess(null);
      setAccessError(null);
      setIsAccessLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsAccessLoading(true);
    setAccessError(null);
    void (async () => {
      try {
        const response = await fetch(`/api/crm/customers/${encodeURIComponent(selected.id)}/access`, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: abortController.signal,
        });
        const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmCustomerAccessSnapshot> | BackendErrorResponse | null;
        if (!response.ok || payload?.success !== true) {
          throw new Error(getBackendErrorMessage(payload));
        }
        setCustomerAccess(payload.data);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }
        setCustomerAccess(null);
        setAccessError(error instanceof Error ? error.message : 'CRM 고객 권한 조회에 실패했습니다.');
      } finally {
        if (!abortController.signal.aborted) {
          setIsAccessLoading(false);
        }
      }
    })();

    return () => abortController.abort();
  }, [accessToken, selected]);

  const selectedAccessMatches = Boolean(
    selected
    && customerAccess
    && (customerAccess.customerId === selected.id || customerAccess.customerCode === selected.code),
  );
  const selectedAccessFeatures = selectedAccessMatches ? customerAccess?.features ?? null : null;
  const canCreateCustomer = globalAccess?.features.canCreateCustomer === true;
  const canEditCustomer = selectedAccessFeatures?.canEditCustomer === true;
  const canViewCustomerActivity = selectedAccessFeatures?.canViewCustomerActivity === true;
  const canCreateCustomerActivity = selectedAccessFeatures?.canCreateCustomerActivity === true;
  const isCustomerGlobalAccessPending = Boolean(accessToken && !globalAccess && !accessError) || isGlobalAccessLoading;
  const isCustomerAccessPending = Boolean(accessToken && selected && !selectedAccessMatches && !accessError) || isAccessLoading;

  const saveCustomer = useCallback(async (mode: 'create' | 'update') => {
    if (!accessToken) {
      setWorkflowError('로그인 후 고객 원장을 저장할 수 있습니다.');
      return;
    }
    if (mode === 'create' && !globalAccess?.features.canCreateCustomer) {
      setWorkflowError('CRM 고객 등록 권한이 없습니다.');
      return;
    }
    if (mode === 'update' && !selected) {
      setWorkflowError('수정할 고객을 선택하세요.');
      return;
    }
    if (mode === 'update' && (!selectedAccessMatches || !customerAccess?.features.canEditCustomer)) {
      setWorkflowError('CRM 고객 수정 권한이 없습니다.');
      return;
    }

    const body: CrmCustomerUpsertRequest = {
      customerName: customerDraft.customerName.trim(),
      type: customerDraft.type,
      industryLine: customerDraft.industryLine.trim(),
      region: customerDraft.region,
      ownerName: customerDraft.ownerName.trim(),
      ownerUserId: optionalText(customerDraft.ownerUserId),
      contactName: optionalText(customerDraft.contactName),
      contactEmail: optionalText(customerDraft.contactEmail),
      contactPhone: optionalText(customerDraft.contactPhone),
      latestOpportunityCode: optionalText(customerDraft.latestOpportunityCode),
      lastInteractionSummary: optionalText(customerDraft.lastInteractionSummary),
      nextAction: customerDraft.nextAction.trim(),
    };

    setPendingWorkflow('customer');
    setWorkflowError(null);
    try {
      const response = await fetch(mode === 'create' ? '/api/crm/customers' : `/api/crm/customers/${selected?.id}`, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmCustomer> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      await loadCustomers();
      router.push(buildHref(query, { selected: payload.data.id }));
      router.refresh();
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : 'CRM 고객 저장에 실패했습니다.');
    } finally {
      setPendingWorkflow(null);
    }
  }, [accessToken, customerAccess, customerDraft, globalAccess, loadCustomers, query, router, selected, selectedAccessMatches]);

  const saveActivity = useCallback(async () => {
    if (!accessToken) {
      setWorkflowError('로그인 후 고객 활동을 등록할 수 있습니다.');
      return;
    }
    if (!selected) {
      setWorkflowError('활동을 등록할 고객을 선택하세요.');
      return;
    }
    if (!selectedAccessMatches || !customerAccess?.features.canCreateCustomerActivity) {
      setWorkflowError('CRM 고객 활동 등록 권한이 없습니다.');
      return;
    }

    const body: CrmCustomerActivityCreateRequest = {
      type: activityDraft.type,
      status: activityDraft.status,
      subject: activityDraft.subject.trim(),
      occurredAt: optionalText(activityDraft.occurredAt),
      dueAt: optionalText(activityDraft.dueAt),
      ownerName: activityDraft.ownerName.trim(),
      ownerUserId: optionalText(activityDraft.ownerUserId),
      summary: activityDraft.summary.trim(),
      nextAction: optionalText(activityDraft.nextAction),
    };

    setPendingWorkflow('activity');
    setWorkflowError(null);
    try {
      const response = await fetch(`/api/crm/customers/${selected.id}/activities`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmCustomerActivity> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      await loadCustomers();
      setActivityDraft(emptyActivityDraft(selected));
      router.refresh();
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : 'CRM 고객 활동 등록에 실패했습니다.');
    } finally {
      setPendingWorkflow(null);
    }
  }, [accessToken, activityDraft, customerAccess, loadCustomers, router, selected, selectedAccessMatches]);

  return (
    <div className="h-full min-h-0 min-w-0 overflow-auto bg-ssoo-content-bg">
      <main className="mx-auto w-full min-w-0 p-4" style={{ maxWidth: SSOO_CONTENT_PAGE_METRICS.landscapeContentWidthPx + SSOO_PAGE_CHROME_METRICS.stackPaddingPx * 2 }}>
        <section className="min-w-0 rounded-md border bg-card">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-ssoo-primary">
                <Building2 className="h-4 w-4" />
                고객 원장
              </div>
              <h1 className="mt-1 text-xl font-semibold text-foreground">고객/활동 Workspace</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                opportunity seed/backfill 기반 고객 원장과 활동 원장을 조회하고 저장합니다.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadCustomers()} disabled={isReloading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {isReloading ? '조회 중' : '새로고침'}
            </Button>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-3 border-b bg-ssoo-content-bg px-4 py-3 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="전체 고객" value={`${currentData.summary.totalCount.toLocaleString('ko-KR')}건`} sub={`조회 ${currentData.summary.filteredCount.toLocaleString('ko-KR')}건`} />
            <Metric label="거래중" value={`${currentData.summary.activeCount.toLocaleString('ko-KR')}건`} sub={`잠재 ${currentData.summary.prospectCount.toLocaleString('ko-KR')}건`} />
            <Metric label="파트너" value={`${currentData.summary.partnerCount.toLocaleString('ko-KR')}건`} sub={`비활성 ${currentData.summary.inactiveCount.toLocaleString('ko-KR')}건`} />
            <Metric label="Backfill 활동" value={`${currentData.summary.activityBackfillCount.toLocaleString('ko-KR')}건`} sub="영업기회 next action 기반" />
          </div>

          <form action="/customers" className="flex flex-wrap items-end gap-3 border-b px-4 py-3">
            <label className="min-w-0 flex-[1_1_240px] text-xs font-medium text-muted-foreground">
              검색
              <SsooSearchInput id="crm-customer-search-input" name="search" ariaLabel="고객과 활동 검색" intent="data-filter" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="고객명, 산업, 담당자, 활동 요약" className="mt-1 min-w-0" />
            </label>
            <label className="w-40 text-xs font-medium text-muted-foreground">
              유형
              <NativeSelect name="type" value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value as CustomerWorkspaceQuery['type'] }))} className="mt-1 min-w-0">
                <option value="all">전체</option>
                {Object.entries(customerTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </NativeSelect>
            </label>
            <label className="w-44 text-xs font-medium text-muted-foreground">
              정렬
              <NativeSelect name="sort" value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value as CrmCustomerSort }))} className="mt-1 min-w-0">
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

          {accessError ? (
            <div className="flex items-center gap-2 border-b bg-ssoo-warning-bg px-4 py-3 text-sm text-ssoo-warning">
              <AlertCircle className="h-4 w-4" />
              {accessError}
            </div>
          ) : null}

          <div className="overflow-auto">
            <CustomerTable items={currentData.items} query={query} selectedId={selected?.id ?? ''} isLoading={isReloading} />
          </div>
        </section>

        {workflowError ? (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-ssoo-danger-border bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger">
            <AlertCircle className="h-4 w-4" />
            {workflowError}
          </div>
        ) : null}

        <section className="mt-4 grid min-w-0 grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0 space-y-4">
            <CustomerDetail customer={selected} />
            <ActivityPanel
              customer={selected}
              draft={activityDraft}
              onDraftChange={setActivityDraft}
              onSave={() => void saveActivity()}
              pending={pendingWorkflow === 'activity'}
              disabled={!accessToken || isCustomerAccessPending}
              canView={canViewCustomerActivity}
              canCreate={canCreateCustomerActivity}
              isAccessLoading={isCustomerAccessPending}
            />
          </div>
          <CustomerEditor
            selected={selected}
            draft={customerDraft}
            onDraftChange={setCustomerDraft}
            onCreate={() => void saveCustomer('create')}
            onUpdate={() => void saveCustomer('update')}
            pending={pendingWorkflow === 'customer'}
            disabled={!accessToken || isCustomerGlobalAccessPending || isCustomerAccessPending}
            canCreate={canCreateCustomer}
            canUpdate={canEditCustomer}
            isAccessLoading={isCustomerGlobalAccessPending || isCustomerAccessPending}
            isAuthenticated={Boolean(accessToken)}
          />
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0 rounded-md border bg-card px-4 py-3">
      <div className="min-w-0 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-lg font-semibold text-foreground">{value}</div>
      <div className="mt-1 break-words text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function CustomerTable({
  items,
  query,
  selectedId,
  isLoading,
}: {
  items: CrmCustomer[];
  query: CustomerWorkspaceQuery;
  selectedId: string;
  isLoading: boolean;
}) {
  return (
    <Table className="w-full min-w-[1060px] text-sm">
      <TableHeader className="sticky top-0 z-10 bg-ssoo-content-bg text-left text-sm font-medium text-muted-foreground shadow-sm [&_tr]:border-b">
        <TableRow className="h-9">
          <TableHead className="w-[136px] px-2 py-2">고객코드</TableHead>
          <TableHead className="w-[240px] px-2 py-2">고객명</TableHead>
          <TableHead className="w-[96px] px-2 py-2">유형</TableHead>
          <TableHead className="w-[148px] px-2 py-2">담당자</TableHead>
          <TableHead className="w-[160px] px-2 py-2">산업</TableHead>
          <TableHead className="w-[132px] px-2 py-2">최근 활동</TableHead>
          <TableHead className="px-2 py-2">다음 액션</TableHead>
          <TableHead className="w-[72px] px-2 py-2"><span className="sr-only">상세</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="divide-y divide-border">
        {isLoading ? (
          <TableRow>
            <TableCell className="h-9 px-2 py-2 text-left text-ssoo-info" colSpan={8}>고객 원장을 불러오는 중입니다.</TableCell>
          </TableRow>
        ) : null}
        {!isLoading && items.length === 0 ? (
          <TableRow>
            <TableCell className="h-9 px-2 py-2 text-left text-muted-foreground" colSpan={8}>조회된 고객이 없습니다.</TableCell>
          </TableRow>
        ) : null}
        {items.map((item) => (
          <CustomerTableRow key={item.id} item={item} query={query} selected={item.id === selectedId} />
        ))}
      </TableBody>
    </Table>
  );
}

function CustomerTableRow({ item, query, selected }: { item: CrmCustomer; query: CustomerWorkspaceQuery; selected: boolean }) {
  const href = buildHref(query, { selected: item.id });
  const linkClass = `block h-9 px-2 py-2 ${selected ? 'bg-ssoo-info-bg' : 'hover:bg-muted'}`;
  return (
    <TableRow className="h-9 border-b bg-card">
      <TableCell className="whitespace-nowrap p-0 font-medium text-foreground"><Link className={linkClass} href={href}>{item.code}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-foreground"><Link className={linkClass} href={href}>{item.customerName}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0"><Link className={linkClass} href={href}><span className={`rounded px-2 py-1 text-xs font-medium ${customerTypeTone[item.type]}`}>{customerTypeLabels[item.type]}</span></Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-muted-foreground"><Link className={linkClass} href={href}>{item.ownerName}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-muted-foreground"><Link className={linkClass} href={href}>{item.industryLine}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-muted-foreground"><Link className={linkClass} href={href}>{formatDate(item.latestActivityAt)}</Link></TableCell>
      <TableCell className="min-w-[260px] p-0 text-muted-foreground"><Link className={`${linkClass} truncate`} href={href}>{item.nextAction || '-'}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0">
        <Link className={`${linkClass} text-center text-ssoo-info`} href={href}>
          <Eye className="mx-auto h-4 w-4" />
        </Link>
      </TableCell>
    </TableRow>
  );
}

function CustomerDetail({ customer }: { customer: CrmCustomer | null }) {
  if (!customer) {
    return <div className="min-w-0 rounded-md border bg-card p-6 text-sm text-muted-foreground">선택된 고객이 없습니다.</div>;
  }

  return (
    <div className="min-w-0 rounded-md border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded px-2 py-1 text-xs font-medium ${customerTypeTone[customer.type]}`}>{customerTypeLabels[customer.type]}</span>
            <span className="rounded bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{regionLabels[customer.region]}</span>
            <span className="rounded bg-ssoo-content-bg px-2 py-1 text-xs font-medium text-muted-foreground">{customer.adminBoundary === 'shared-admin' ? '공용 Admin 경계' : customer.adminBoundary}</span>
          </div>
          <h2 className="mt-2 break-words text-lg font-semibold text-foreground">{customer.customerName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{customer.code} · {customer.ownerName} · {customer.industryLine}</p>
        </div>
        <div className="text-right text-sm">
          <div className="font-semibold text-foreground">{customer.activityCount.toLocaleString('ko-KR')}건</div>
          <div className="text-xs text-muted-foreground">활동 원장</div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 p-4 xl:grid-cols-2">
        <InfoList
          items={[
            ['담당자', customer.ownerName],
            ['담당자 ID', customer.ownerUserId ?? '-'],
            ['연락처', customer.contactName ?? '-'],
            ['이메일', customer.contactEmail ?? '-'],
            ['전화', customer.contactPhone ?? '-'],
          ]}
        />
        <InfoList
          items={[
            ['원천 영업기회', customer.latestOpportunityCode ?? '-'],
            ['최근 활동', formatDateTime(customer.latestActivityAt)],
            ['최근 요약', customer.lastInteractionSummary ?? '-'],
            ['다음 액션', customer.nextAction || '-'],
            ['수정일', formatDateTime(customer.updatedAt)],
          ]}
        />
      </div>
    </div>
  );
}

function ActivityPanel({
  customer,
  draft,
  onDraftChange,
  onSave,
  pending,
  disabled,
  canView,
  canCreate,
  isAccessLoading,
}: {
  customer: CrmCustomer | null;
  draft: ActivityDraft;
  onDraftChange: (draft: ActivityDraft) => void;
  onSave: () => void;
  pending: boolean;
  disabled: boolean;
  canView: boolean;
  canCreate: boolean;
  isAccessLoading: boolean;
}) {
  const controlsDisabled = disabled || !canCreate || !customer;
  return (
    <div className="min-w-0 rounded-md border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Activity className="h-4 w-4 text-muted-foreground" />
            활동 원장
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">최근 활동 {customer?.recentActivities.length ?? 0}건</p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={pending || controlsDisabled}
          title={isAccessLoading ? 'CRM 고객 활동 권한 확인 중입니다.' : canCreate ? '활동 등록' : 'CRM 고객 활동 등록 권한이 없습니다.'}
        >
          <Plus className="mr-2 h-4 w-4" />
          {pending ? '등록 중' : '활동 등록'}
        </Button>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 p-4 xl:grid-cols-2">
        <div className="min-w-0 space-y-2">
          {isAccessLoading && customer ? (
            <div className="rounded-md border border-ssoo-info-border bg-ssoo-info-bg px-3 py-4 text-center text-sm text-ssoo-info">활동 권한을 확인하는 중입니다.</div>
          ) : null}
          {!isAccessLoading && customer && !canView ? (
            <div className="rounded-md border border-ssoo-warning-border bg-ssoo-warning-bg px-3 py-4 text-center text-sm text-ssoo-warning">고객 활동 조회 권한이 없습니다.</div>
          ) : null}
          {!isAccessLoading && canView && customer?.recentActivities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
          {!isAccessLoading && canView && customer && customer.recentActivities.length === 0 ? (
            <div className="rounded-md border px-3 py-4 text-center text-sm text-muted-foreground">활동 원장이 없습니다.</div>
          ) : null}
          {!customer ? (
            <div className="rounded-md border px-3 py-4 text-center text-sm text-muted-foreground">활동을 표시할 고객을 선택하세요.</div>
          ) : null}
        </div>

        <div className="min-w-0 space-y-3 rounded-md border bg-ssoo-content-bg p-3">
          <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2">
            <label className="min-w-0 text-xs font-medium text-muted-foreground">
              유형
              <NativeSelect
                value={draft.type}
                onChange={(event) => onDraftChange({ ...draft, type: event.target.value as CrmCustomerActivityType })}
                className="mt-1 min-w-0"
                disabled={controlsDisabled}
              >
                {Object.entries(activityTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </NativeSelect>
            </label>
            <label className="min-w-0 text-xs font-medium text-muted-foreground">
              상태
              <NativeSelect
                value={draft.status}
                onChange={(event) => onDraftChange({ ...draft, status: event.target.value as CrmCustomerActivityStatus })}
                className="mt-1 min-w-0"
                disabled={controlsDisabled}
              >
                {Object.entries(activityStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </NativeSelect>
            </label>
          </div>
          <label className="block min-w-0 text-xs font-medium text-muted-foreground">
            제목
            <Input value={draft.subject} onChange={(event) => onDraftChange({ ...draft, subject: event.target.value })} className="mt-1 min-w-0" disabled={controlsDisabled} />
          </label>
          <div className="grid min-w-0 grid-cols-1 gap-2">
            <label className="min-w-0 text-xs font-medium text-muted-foreground">
              발생일시
              <Input type="datetime-local" value={draft.occurredAt} onChange={(event) => onDraftChange({ ...draft, occurredAt: event.target.value })} className="mt-1 min-w-0" disabled={controlsDisabled} />
            </label>
            <label className="min-w-0 text-xs font-medium text-muted-foreground">
              예정일시
              <Input type="datetime-local" value={draft.dueAt} onChange={(event) => onDraftChange({ ...draft, dueAt: event.target.value })} className="mt-1 min-w-0" disabled={controlsDisabled} />
            </label>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2">
            <label className="min-w-0 text-xs font-medium text-muted-foreground">
              담당자
              <Input value={draft.ownerName} onChange={(event) => onDraftChange({ ...draft, ownerName: event.target.value })} className="mt-1 min-w-0" disabled={controlsDisabled} />
            </label>
            <label className="min-w-0 text-xs font-medium text-muted-foreground">
              담당자 ID
              <Input value={draft.ownerUserId} onChange={(event) => onDraftChange({ ...draft, ownerUserId: event.target.value })} className="mt-1 min-w-0" disabled={controlsDisabled} />
            </label>
          </div>
          <label className="block min-w-0 text-xs font-medium text-muted-foreground">
            요약
            <Textarea value={draft.summary} onChange={(event) => onDraftChange({ ...draft, summary: event.target.value })} className="mt-1 min-h-[76px]" disabled={controlsDisabled} />
          </label>
          <label className="block min-w-0 text-xs font-medium text-muted-foreground">
            다음 액션
            <Textarea value={draft.nextAction} onChange={(event) => onDraftChange({ ...draft, nextAction: event.target.value })} className="mt-1 min-h-[64px]" disabled={controlsDisabled} />
          </label>
          {!isAccessLoading && customer && !canCreate ? (
            <div className="flex items-center gap-2 rounded-md border border-ssoo-warning-border bg-ssoo-warning-bg px-3 py-2 text-xs text-ssoo-warning">
              <AlertCircle className="h-4 w-4" />
              고객 활동 등록 권한이 없습니다.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: CrmCustomerActivity }) {
  return (
    <div className="min-w-0 rounded-md border px-3 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className={`rounded px-2 py-1 text-xs font-medium ${activityStatusTone[activity.status]}`}>{activityStatusLabels[activity.status]}</span>
          <span className="rounded bg-ssoo-content-bg px-2 py-1 text-xs font-medium text-muted-foreground">{activityTypeLabels[activity.type]}</span>
          <span className="break-words font-medium text-foreground">{activity.subject}</span>
        </div>
        <span className="text-xs text-muted-foreground">{formatDateTime(activity.occurredAt)}</span>
      </div>
      <p className="mt-2 break-words text-muted-foreground">{activity.summary}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>{activity.ownerName}</span>
        {activity.sourceOpportunityCode ? <span>원천 {activity.sourceOpportunityCode}</span> : null}
        {activity.nextAction ? <span>다음 {activity.nextAction}</span> : null}
      </div>
    </div>
  );
}

function CustomerEditor({
  selected,
  draft,
  onDraftChange,
  onCreate,
  onUpdate,
  pending,
  disabled,
  canCreate,
  canUpdate,
  isAccessLoading,
  isAuthenticated,
}: {
  selected: CrmCustomer | null;
  draft: CustomerDraft;
  onDraftChange: (draft: CustomerDraft) => void;
  onCreate: () => void;
  onUpdate: () => void;
  pending: boolean;
  disabled: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  isAccessLoading: boolean;
  isAuthenticated: boolean;
}) {
  const formDisabled = disabled || (!canCreate && !canUpdate);
  return (
    <div className="min-w-0 rounded-md border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <UserRound className="h-4 w-4 text-muted-foreground" />
            고객 저장
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{selected ? selected.code : '신규 고객'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCreate}
            disabled={pending || disabled || !canCreate}
            title={isAccessLoading ? 'CRM 고객 권한 확인 중입니다.' : canCreate ? '신규 고객 저장' : 'CRM 고객 등록 권한이 없습니다.'}
          >
            <Plus className="mr-2 h-4 w-4" />
            신규 저장
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onUpdate}
            disabled={pending || disabled || !selected || !canUpdate}
            title={isAccessLoading ? 'CRM 고객 권한 확인 중입니다.' : canUpdate ? '고객 수정 저장' : 'CRM 고객 수정 권한이 없습니다.'}
          >
            <Save className="mr-2 h-4 w-4" />
            {pending ? '저장 중' : '수정 저장'}
          </Button>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <label className="block min-w-0 text-xs font-medium text-muted-foreground">
          고객명
          <Input value={draft.customerName} onChange={(event) => onDraftChange({ ...draft, customerName: event.target.value })} className="mt-1 min-w-0" disabled={formDisabled} />
        </label>
        <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2">
          <label className="min-w-0 text-xs font-medium text-muted-foreground">
            유형
            <NativeSelect value={draft.type} onChange={(event) => onDraftChange({ ...draft, type: event.target.value as CrmCustomerType })} className="mt-1 min-w-0" disabled={formDisabled}>
              {Object.entries(customerTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </NativeSelect>
          </label>
          <label className="min-w-0 text-xs font-medium text-muted-foreground">
            지역
            <NativeSelect value={draft.region} onChange={(event) => onDraftChange({ ...draft, region: event.target.value as CrmCustomerRegion })} className="mt-1 min-w-0" disabled={formDisabled}>
              {Object.entries(regionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </NativeSelect>
          </label>
        </div>
        <label className="block min-w-0 text-xs font-medium text-muted-foreground">
          산업/계열
          <Input value={draft.industryLine} onChange={(event) => onDraftChange({ ...draft, industryLine: event.target.value })} className="mt-1 min-w-0" disabled={formDisabled} />
        </label>
        <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2">
          <label className="min-w-0 text-xs font-medium text-muted-foreground">
            담당자
            <Input value={draft.ownerName} onChange={(event) => onDraftChange({ ...draft, ownerName: event.target.value })} className="mt-1 min-w-0" disabled={formDisabled} />
          </label>
          <label className="min-w-0 text-xs font-medium text-muted-foreground">
            담당자 ID
            <Input value={draft.ownerUserId} onChange={(event) => onDraftChange({ ...draft, ownerUserId: event.target.value })} className="mt-1 min-w-0" disabled={formDisabled} />
          </label>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-2">
          <label className="min-w-0 text-xs font-medium text-muted-foreground">
            연락처
            <Input value={draft.contactName} onChange={(event) => onDraftChange({ ...draft, contactName: event.target.value })} className="mt-1 min-w-0" disabled={formDisabled} />
          </label>
          <label className="min-w-0 text-xs font-medium text-muted-foreground">
            이메일
            <Input value={draft.contactEmail} onChange={(event) => onDraftChange({ ...draft, contactEmail: event.target.value })} className="mt-1 min-w-0" disabled={formDisabled} />
          </label>
          <label className="min-w-0 text-xs font-medium text-muted-foreground">
            전화
            <Input value={draft.contactPhone} onChange={(event) => onDraftChange({ ...draft, contactPhone: event.target.value })} className="mt-1 min-w-0" disabled={formDisabled} />
          </label>
        </div>
        <label className="block min-w-0 text-xs font-medium text-muted-foreground">
          최근 영업기회 코드
          <Input value={draft.latestOpportunityCode} onChange={(event) => onDraftChange({ ...draft, latestOpportunityCode: event.target.value })} className="mt-1 min-w-0" disabled={formDisabled} />
        </label>
        <label className="block min-w-0 text-xs font-medium text-muted-foreground">
          최근 상호작용
          <Textarea value={draft.lastInteractionSummary} onChange={(event) => onDraftChange({ ...draft, lastInteractionSummary: event.target.value })} className="mt-1 min-h-[72px]" disabled={formDisabled} />
        </label>
        <label className="block min-w-0 text-xs font-medium text-muted-foreground">
          다음 액션
          <Textarea value={draft.nextAction} onChange={(event) => onDraftChange({ ...draft, nextAction: event.target.value })} className="mt-1 min-h-[72px]" disabled={formDisabled} />
        </label>
        {!isAuthenticated ? (
          <div className="flex items-center gap-2 rounded-md border border-ssoo-warning-border bg-ssoo-warning-bg px-3 py-2 text-xs text-ssoo-warning">
            <AlertCircle className="h-4 w-4" />
            저장은 인증된 세션에서만 가능합니다.
          </div>
        ) : isAccessLoading ? (
          <div className="flex items-center gap-2 rounded-md border border-ssoo-info-border bg-ssoo-info-bg px-3 py-2 text-xs text-ssoo-info">
            <AlertCircle className="h-4 w-4" />
            고객 저장 권한을 확인하는 중입니다.
          </div>
        ) : !canCreate && !canUpdate ? (
          <div className="flex items-center gap-2 rounded-md border border-ssoo-warning-border bg-ssoo-warning-bg px-3 py-2 text-xs text-ssoo-warning">
            <AlertCircle className="h-4 w-4" />
            고객 등록/수정 권한이 없습니다.
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-ssoo-success-border bg-ssoo-success-bg px-3 py-2 text-xs text-ssoo-success">
            <CheckCircle2 className="h-4 w-4" />
            고객 저장 권한이 확인됐습니다.
          </div>
        )}
      </div>
    </div>
  );
}

function InfoList({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="grid min-w-0 grid-cols-[112px_minmax(0,1fr)] gap-y-2 text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words font-medium text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
