'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FileCheck2, Plus, RefreshCw, RotateCcw, Save, Search, Trash2 } from 'lucide-react';
import type {
  CrmCostPlanAccountingPaymentExecutionResult,
  CrmCostPlanAccountingPaymentHandoffResult,
  CrmCostPlanAccountingPaymentPreview,
  CrmCostPlanAmsExternalMonthlyInputResult,
  CrmCostPlanAmsExternalMonthlyWorkflowResult,
  CrmCostPlanAmsReadiness,
  CrmCostPlanAmsSourceWorkspaceResult,
  CrmCostPlanAmsSourceWorkspace,
  CrmCostPlanAmsVendorWbsMappingResult,
  CrmCostPlanInternalMonthlyInputResult,
  CrmCostPlanInternalMonthlyWorkflowResult,
  CrmCostPlanInternalSourceGridResult,
  CrmCostPlanPreviewMonth,
  CrmCostPlanPreviewRegion,
  CrmCostPlanPreviewResponse,
  CrmCostPlanPreviewRow,
} from '@ssoo/types/crm';
import { Badge, Button, Checkbox, Input, NativeSelect, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';
import { SSOO_CONTENT_PAGE_METRICS, SSOO_PAGE_CHROME_METRICS, SsooSearchInput } from '@ssoo/web-shell';
import { useAuthStore } from '@/stores/auth.store';
import { useCrmBusinessYearOptions } from '@/lib/crmCommonCodeOptions';
import { useCrmDomainAccess } from '@/lib/useCrmDomainAccess';
import {
  applyInternalCostSourceGridPaste,
  sanitizeInternalCostSourceInput,
  sumInternalCostSourceValues,
  toInternalCostSourceGridDraft,
  toInternalCostSourceGridRequest,
  type InternalCostSourceGridDraftItem,
} from './internalCostSourceGrid';
import {
  applyAmsSourceGridPaste,
  sanitizeAmsSourceInput,
  sumAmsSourceValues,
  toAmsSourceExternalCostRequest,
  toAmsSourceGridDrafts,
  type AmsSourceGridDraftRow,
} from './amsSourceGrid';
import type { CostPlanPreviewWorkspaceQuery } from './costPlanPreviewQuery';

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

const regionLabels: Record<CrmCostPlanPreviewRegion, string> = {
  all: '전체',
  domestic: '국내',
  overseas: '해외',
};

const amsReadinessLabels: Record<CrmCostPlanAmsReadiness, string> = {
  ready: 'AMS 준비',
  blocked: 'AMS 차단',
  planned: '후속',
};

const amsMappingLabels: Record<CrmCostPlanPreviewRow['amsMappingStatus'], string> = {
  mapped: '매핑 완료',
  unmapped: '매핑 필요',
  'not-required': '대상 아님',
};

const internalInputStatusLabels: Record<CrmCostPlanPreviewRow['internalCostInputStatus'], string> = {
  candidate: '후보',
  draft: 'draft',
  confirmed: '확정',
};

const amsExternalInputStatusLabels: Record<CrmCostPlanPreviewRow['amsExternalCostInputStatus'], string> = {
  candidate: '후보',
  draft: 'draft',
  confirmed: '정산 확정',
};

const accountingPaymentSourceLabels: Record<CrmCostPlanAccountingPaymentPreview['lines'][number]['source'], string> = {
  'internal-cost': '내부원가',
  'ams-external-cost': 'AMS 외부원가',
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

function buildApiHref(query: CostPlanPreviewWorkspaceQuery) {
  const params = new URLSearchParams();
  params.set('year', String(query.year));
  if (query.businessType) params.set('businessType', query.businessType);
  if (query.industryLine) params.set('industryLine', query.industryLine);
  if (query.region !== 'all') params.set('region', query.region);
  if (query.search) params.set('search', query.search);
  return `/api/crm/cost-plan/preview?${params.toString()}`;
}

function buildAccountingPaymentApiHref(query: CostPlanPreviewWorkspaceQuery) {
  const params = new URLSearchParams();
  params.set('year', String(query.year));
  if (query.businessType) params.set('businessType', query.businessType);
  if (query.industryLine) params.set('industryLine', query.industryLine);
  if (query.region !== 'all') params.set('region', query.region);
  if (query.search) params.set('search', query.search);
  return `/api/crm/cost-plan/accounting-payment-preview?${params.toString()}`;
}

function getBackendErrorMessage(responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null): string {
  if (!responseBody || responseBody.success === true) {
    return '원가/AMS preview 조회 중 오류가 발생했습니다.';
  }

  return responseBody.error?.message || responseBody.message || '원가/AMS preview 조회 중 오류가 발생했습니다.';
}

function getYearOptions(year: number) {
  const currentYear = new Date().getFullYear();
  return [...new Set([year, currentYear - 1, currentYear, currentYear + 1, currentYear + 2])]
    .sort((left, right) => left - right);
}

function emptyMonthlyAmounts() {
  return Array.from({ length: 12 }, () => 0);
}

function getRowPlanDefaults(row: CrmCostPlanPreviewRow | undefined) {
  if (!row) {
    return emptyMonthlyAmounts();
  }
  return row.months.map((month) => (
    row.internalCostInputMode === 'manual'
      ? month.internalCostPlanInputAmount
      : month.pipelineInternalCostAmount + month.contractInternalCostAmount
  ));
}

function getRowActualDefaults(row: CrmCostPlanPreviewRow | undefined) {
  if (!row) {
    return emptyMonthlyAmounts();
  }
  return row.months.map((month) => month.internalCostActualInputAmount);
}

function getAmsMappingRows(rows: CrmCostPlanPreviewRow[]) {
  return rows.filter((row) => (
    Boolean(row.wbsCode)
    && (
      row.amsMappingStatus !== 'not-required'
      || row.externalCostPlanCandidateAmount > 0
      || row.contractExternalActualAmount > 0
    )
  ));
}

function getAmsExternalInputRows(rows: CrmCostPlanPreviewRow[]) {
  return rows.filter((row) => Boolean(row.wbsCode && row.amsVendorName));
}

function getAmsExternalPlanDefaults(row: CrmCostPlanPreviewRow | undefined) {
  if (!row) {
    return emptyMonthlyAmounts();
  }
  return row.months.map((month) => (
    row.amsExternalCostInputMode === 'manual'
      ? month.amsExternalCostPlanInputAmount
      : month.externalCostPlanCandidateAmount
  ));
}

function getAmsExternalActualDefaults(row: CrmCostPlanPreviewRow | undefined) {
  if (!row) {
    return emptyMonthlyAmounts();
  }
  return row.months.map((month) => (
    row.amsExternalCostInputMode === 'manual'
      ? month.amsExternalCostActualInputAmount
      : month.contractExternalActualAmount
  ));
}

function sumAmounts(values: number[]) {
  return values.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
}

export function CostPlanPreviewWorkspaceClient({
  data,
  query,
}: {
  data: CrmCostPlanPreviewResponse;
  query: CostPlanPreviewWorkspaceQuery;
}) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const { access: domainAccess, error: domainAccessError } = useCrmDomainAccess(accessToken);
  const canWriteCostPlan = domainAccess?.features.canWriteCostPlan === true;
  const canConfirmCostPlan = domainAccess?.features.canConfirmCostPlan === true;
  const [currentData, setCurrentData] = useState(data);
  const [filters, setFilters] = useState(query);
  const [isReloading, setIsReloading] = useState(data.rows.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedInternalRowKey, setSelectedInternalRowKey] = useState(data.rows[0]?.key ?? '');
  const [monthlyPlanAmounts, setMonthlyPlanAmounts] = useState<number[]>(() => getRowPlanDefaults(data.rows[0]));
  const [monthlyActualAmounts, setMonthlyActualAmounts] = useState<number[]>(() => getRowActualDefaults(data.rows[0]));
  const [isSavingInternalCost, setIsSavingInternalCost] = useState(false);
  const [isSavingInternalWorkflow, setIsSavingInternalWorkflow] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [internalSourceDrafts, setInternalSourceDrafts] = useState<InternalCostSourceGridDraftItem[]>(() => toInternalCostSourceGridDraft(data.internalCostSourceGrid));
  const [isSavingInternalSource, setIsSavingInternalSource] = useState(false);
  const [internalSourceNotice, setInternalSourceNotice] = useState<string | null>(null);
  const [internalSourceError, setInternalSourceError] = useState<string | null>(null);
  const [selectedAmsRowKey, setSelectedAmsRowKey] = useState(() => getAmsMappingRows(data.rows)[0]?.key ?? '');
  const [amsVendorName, setAmsVendorName] = useState(() => getAmsMappingRows(data.rows)[0]?.amsVendorName ?? '');
  const [amsVendorContractNo, setAmsVendorContractNo] = useState(() => getAmsMappingRows(data.rows)[0]?.amsVendorContractNo ?? '');
  const [isSavingAmsMapping, setIsSavingAmsMapping] = useState(false);
  const [amsSaveNotice, setAmsSaveNotice] = useState<string | null>(null);
  const [amsSaveError, setAmsSaveError] = useState<string | null>(null);
  const [amsSourceVendorName, setAmsSourceVendorName] = useState('');
  const [amsSourceDrafts, setAmsSourceDrafts] = useState<AmsSourceGridDraftRow[]>(() => toAmsSourceGridDrafts(data.amsSourceWorkspace));
  const [isSavingAmsSource, setIsSavingAmsSource] = useState(false);
  const [amsSourceNotice, setAmsSourceNotice] = useState<string | null>(null);
  const [amsSourceError, setAmsSourceError] = useState<string | null>(null);
  const [selectedAmsExternalRowKey, setSelectedAmsExternalRowKey] = useState(() => getAmsExternalInputRows(data.rows)[0]?.key ?? '');
  const [amsExternalMonthlyPlanAmounts, setAmsExternalMonthlyPlanAmounts] = useState<number[]>(() => getAmsExternalPlanDefaults(getAmsExternalInputRows(data.rows)[0]));
  const [amsExternalMonthlyActualAmounts, setAmsExternalMonthlyActualAmounts] = useState<number[]>(() => getAmsExternalActualDefaults(getAmsExternalInputRows(data.rows)[0]));
  const [isSavingAmsExternalCost, setIsSavingAmsExternalCost] = useState(false);
  const [isSavingAmsExternalWorkflow, setIsSavingAmsExternalWorkflow] = useState(false);
  const [amsExternalSaveNotice, setAmsExternalSaveNotice] = useState<string | null>(null);
  const [amsExternalSaveError, setAmsExternalSaveError] = useState<string | null>(null);
  const [accountingPaymentPreview, setAccountingPaymentPreview] = useState<CrmCostPlanAccountingPaymentPreview | null>(null);
  const [isLoadingAccountingPayment, setIsLoadingAccountingPayment] = useState(data.rows.length === 0);
  const [isSavingAccountingPayment, setIsSavingAccountingPayment] = useState(false);
  const [isRecordingAccountingPaymentEvidence, setIsRecordingAccountingPaymentEvidence] = useState(false);
  const [accountingPaymentNotice, setAccountingPaymentNotice] = useState<string | null>(null);
  const [accountingPaymentError, setAccountingPaymentError] = useState<string | null>(null);
  const apiHref = useMemo(() => buildApiHref(query), [query]);
  const accountingPaymentApiHref = useMemo(() => buildAccountingPaymentApiHref(query), [query]);
  const businessYears = useCrmBusinessYearOptions(query.year, getYearOptions(query.year));
  const yearOptions = businessYears.years;
  const businessTypeOptions = [...new Set([...currentData.summary.businessTypeOptions, filters.businessType].filter(Boolean))];
  const industryLineOptions = [...new Set([...currentData.summary.industryLineOptions, filters.industryLine].filter(Boolean))];

  useEffect(() => {
    setFilters({
      year: query.year,
      businessType: query.businessType,
      industryLine: query.industryLine,
      region: query.region,
      search: query.search,
      sourceSurface: query.sourceSurface,
    });
  }, [query.year, query.businessType, query.industryLine, query.region, query.search, query.sourceSurface]);
  const amsMappingRows = useMemo(() => getAmsMappingRows(currentData.rows), [currentData.rows]);
  const amsExternalRows = useMemo(() => getAmsExternalInputRows(currentData.rows), [currentData.rows]);
  const selectedInternalRow = useMemo(
    () => currentData.rows.find((row) => row.key === selectedInternalRowKey) ?? currentData.rows[0],
    [currentData.rows, selectedInternalRowKey],
  );
  const selectedAmsRow = useMemo(
    () => amsMappingRows.find((row) => row.key === selectedAmsRowKey) ?? amsMappingRows[0],
    [amsMappingRows, selectedAmsRowKey],
  );
  const selectedAmsExternalRow = useMemo(
    () => amsExternalRows.find((row) => row.key === selectedAmsExternalRowKey) ?? amsExternalRows[0],
    [amsExternalRows, selectedAmsExternalRowKey],
  );
  const planInputTotal = useMemo(() => sumAmounts(monthlyPlanAmounts), [monthlyPlanAmounts]);
  const actualInputTotal = useMemo(() => sumAmounts(monthlyActualAmounts), [monthlyActualAmounts]);
  const amsExternalPlanInputTotal = useMemo(() => sumAmounts(amsExternalMonthlyPlanAmounts), [amsExternalMonthlyPlanAmounts]);
  const amsExternalActualInputTotal = useMemo(() => sumAmounts(amsExternalMonthlyActualAmounts), [amsExternalMonthlyActualAmounts]);

  useEffect(() => {
    setCurrentData(data);
    if (data.rows.length > 0) {
      setIsReloading(false);
    }
  }, [data]);

  useEffect(() => {
    setInternalSourceDrafts(toInternalCostSourceGridDraft(currentData.internalCostSourceGrid));
  }, [currentData.internalCostSourceGrid]);

  useEffect(() => {
    setAmsSourceDrafts(toAmsSourceGridDrafts(currentData.amsSourceWorkspace));
  }, [currentData.amsSourceWorkspace]);

  useEffect(() => {
    if (currentData.rows.length === 0) {
      setSelectedInternalRowKey('');
      return;
    }
    if (!currentData.rows.some((row) => row.key === selectedInternalRowKey)) {
      setSelectedInternalRowKey(currentData.rows[0].key);
    }
  }, [currentData.rows, selectedInternalRowKey]);

  useEffect(() => {
    if (amsMappingRows.length === 0) {
      setSelectedAmsRowKey('');
      return;
    }
    if (!amsMappingRows.some((row) => row.key === selectedAmsRowKey)) {
      setSelectedAmsRowKey(amsMappingRows[0].key);
    }
  }, [amsMappingRows, selectedAmsRowKey]);

  useEffect(() => {
    if (amsExternalRows.length === 0) {
      setSelectedAmsExternalRowKey('');
      return;
    }
    if (!amsExternalRows.some((row) => row.key === selectedAmsExternalRowKey)) {
      setSelectedAmsExternalRowKey(amsExternalRows[0].key);
    }
  }, [amsExternalRows, selectedAmsExternalRowKey]);

  useEffect(() => {
    setMonthlyPlanAmounts(getRowPlanDefaults(selectedInternalRow));
    setMonthlyActualAmounts(getRowActualDefaults(selectedInternalRow));
  }, [selectedInternalRow]);

  useEffect(() => {
    setAmsVendorName(selectedAmsRow?.amsVendorName ?? '');
    setAmsVendorContractNo(selectedAmsRow?.amsVendorContractNo ?? '');
  }, [selectedAmsRow]);

  useEffect(() => {
    setAmsExternalMonthlyPlanAmounts(getAmsExternalPlanDefaults(selectedAmsExternalRow));
    setAmsExternalMonthlyActualAmounts(getAmsExternalActualDefaults(selectedAmsExternalRow));
  }, [selectedAmsExternalRow]);

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
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmCostPlanPreviewResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setCurrentData(payload.data);
      return payload.data;
    } catch (error) {
      if (signal?.aborted) {
        return null;
      }
      setLoadError(error instanceof Error ? error.message : '원가/AMS preview 조회에 실패했습니다.');
      return null;
    } finally {
      if (!signal?.aborted) {
        setIsReloading(false);
      }
    }
  }, [accessToken, apiHref]);

  const loadAccountingPaymentPreview = useCallback(async (signal?: AbortSignal) => {
    if (!accessToken) {
      return null;
    }

    setIsLoadingAccountingPayment(true);
    setAccountingPaymentError(null);
    try {
      const response = await fetch(accountingPaymentApiHref, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmCostPlanAccountingPaymentPreview> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setAccountingPaymentPreview(payload.data);
      return payload.data;
    } catch (error) {
      if (signal?.aborted) {
        return null;
      }
      setAccountingPaymentError(error instanceof Error ? error.message : '회계·지급 handoff preview 조회에 실패했습니다.');
      return null;
    } finally {
      if (!signal?.aborted) {
        setIsLoadingAccountingPayment(false);
      }
    }
  }, [accessToken, accountingPaymentApiHref]);

  const updateMonthlyPlanAmount = useCallback((index: number, value: string) => {
    const amount = Math.max(0, Math.round(Number(value) || 0));
    setMonthlyPlanAmounts((current) => current.map((item, itemIndex) => itemIndex === index ? amount : item));
  }, []);

  const updateMonthlyActualAmount = useCallback((index: number, value: string) => {
    const amount = Math.max(0, Math.round(Number(value) || 0));
    setMonthlyActualAmounts((current) => current.map((item, itemIndex) => itemIndex === index ? amount : item));
  }, []);

  const updateAmsExternalMonthlyPlanAmount = useCallback((index: number, value: string) => {
    const amount = Math.max(0, Math.round(Number(value) || 0));
    setAmsExternalMonthlyPlanAmounts((current) => current.map((item, itemIndex) => itemIndex === index ? amount : item));
  }, []);

  const updateAmsExternalMonthlyActualAmount = useCallback((index: number, value: string) => {
    const amount = Math.max(0, Math.round(Number(value) || 0));
    setAmsExternalMonthlyActualAmounts((current) => current.map((item, itemIndex) => itemIndex === index ? amount : item));
  }, []);

  const updateInternalSourceAmount = useCallback((itemIndex: number, type: 'plan' | 'actual', monthIndex: number, value: string) => {
    const normalized = sanitizeInternalCostSourceInput(value);
    setInternalSourceDrafts((current) => current.map((item, index) => {
      if (index !== itemIndex) return item;
      const key = type === 'plan' ? 'planValues' : 'actualValues';
      return { ...item, [key]: item[key].map((amount, amountIndex) => amountIndex === monthIndex ? normalized : amount) };
    }));
  }, []);

  const pasteInternalSourceAmounts = useCallback((itemIndex: number, type: 'plan' | 'actual', monthIndex: number, clipboardText: string) => {
    setInternalSourceDrafts((current) => {
      const applied = applyInternalCostSourceGridPaste(current, itemIndex, type, monthIndex, clipboardText);
      if (applied.invalidCellCount > 0) {
        setInternalSourceNotice(null);
        setInternalSourceError('붙여넣을 수 없는 값입니다.');
        return current;
      }
      setInternalSourceNotice(`${applied.pastedCellCount}개 셀이 붙여넣기 되었습니다.`);
      setInternalSourceError(null);
      return applied.drafts;
    });
  }, []);

  const saveInternalSourceGrid = useCallback(async () => {
    if (!accessToken) return;
    setIsSavingInternalSource(true);
    setInternalSourceNotice(null);
    setInternalSourceError(null);
    try {
      const response = await fetch('/api/crm/cost-plan/internal-cost/source-grid', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(toInternalCostSourceGridRequest(currentData.summary.year, internalSourceDrafts)),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmCostPlanInternalSourceGridResult> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setCurrentData((current) => ({ ...current, internalCostSourceGrid: payload.data.grid }));
      setInternalSourceNotice(`${payload.data.grid.targetYear}년 내부원가가 저장되었습니다.`);
    } catch (error) {
      setInternalSourceError(error instanceof Error ? error.message : '원본 호환 내부원가 저장에 실패했습니다.');
    } finally {
      setIsSavingInternalSource(false);
    }
  }, [accessToken, currentData.summary.year, internalSourceDrafts]);

  const applyAmsSourceWorkspaceResult = useCallback((result: CrmCostPlanAmsSourceWorkspaceResult) => {
    setCurrentData((current) => ({ ...current, amsSourceWorkspace: result.workspace }));
  }, []);

  const runAmsSourceRequest = useCallback(async (href: string, init: RequestInit) => {
    if (!accessToken) return null;
    const response = await fetch(href, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
    const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmCostPlanAmsSourceWorkspaceResult> | BackendErrorResponse | null;
    if (!response.ok || payload?.success !== true) throw new Error(getBackendErrorMessage(payload));
    applyAmsSourceWorkspaceResult(payload.data);
    return payload.data;
  }, [accessToken, applyAmsSourceWorkspaceResult]);

  const createAmsSourceVendor = useCallback(async () => {
    const vendorName = amsSourceVendorName.trim();
    if (!vendorName) {
      setAmsSourceError('공급업체명을 입력해 주세요.');
      return;
    }
    setIsSavingAmsSource(true);
    setAmsSourceNotice(null);
    setAmsSourceError(null);
    try {
      await runAmsSourceRequest('/api/crm/cost-plan/ams/source/vendors', {
        method: 'POST',
        body: JSON.stringify({ targetYear: currentData.summary.year, vendorName }),
      });
      setAmsSourceVendorName('');
      setAmsSourceNotice('공급업체가 추가되었습니다.');
    } catch (error) {
      setAmsSourceError(error instanceof Error ? error.message : '공급업체 추가에 실패했습니다.');
    } finally {
      setIsSavingAmsSource(false);
    }
  }, [amsSourceVendorName, currentData.summary.year, runAmsSourceRequest]);

  const deleteAmsSourceVendor = useCallback(async (vendorId: string, vendorName: string) => {
    if (!window.confirm(`"${vendorName}"을 삭제하시겠습니까?\n연관된 외부원가도 모두 삭제됩니다.`)) return;
    setIsSavingAmsSource(true);
    setAmsSourceNotice(null);
    setAmsSourceError(null);
    try {
      await runAmsSourceRequest(`/api/crm/cost-plan/ams/source/vendors/${encodeURIComponent(vendorId)}?year=${currentData.summary.year}`, { method: 'DELETE' });
      setAmsSourceNotice('삭제되었습니다.');
    } catch (error) {
      setAmsSourceError(error instanceof Error ? error.message : '공급업체 삭제에 실패했습니다.');
    } finally {
      setIsSavingAmsSource(false);
    }
  }, [currentData.summary.year, runAmsSourceRequest]);

  const toggleAmsSourceVendorWbs = useCallback(async (vendorId: string, wbsCode: string, checked: boolean) => {
    const vendor = currentData.amsSourceWorkspace.vendors.find((item) => item.id === vendorId);
    if (!vendor) return;
    const currentCodes = vendor.wbs.map((item) => item.wbsCode);
    const wbsCodes = checked ? [...new Set([...currentCodes, wbsCode])] : currentCodes.filter((code) => code !== wbsCode);
    setIsSavingAmsSource(true);
    setAmsSourceNotice(null);
    setAmsSourceError(null);
    try {
      await runAmsSourceRequest(`/api/crm/cost-plan/ams/source/vendors/${encodeURIComponent(vendorId)}/wbs`, {
        method: 'PUT',
        body: JSON.stringify({ targetYear: currentData.summary.year, wbsCodes }),
      });
      setAmsSourceNotice('WBS 매핑이 저장되었습니다.');
    } catch (error) {
      setAmsSourceError(error instanceof Error ? error.message : 'WBS 매핑 저장에 실패했습니다.');
    } finally {
      setIsSavingAmsSource(false);
    }
  }, [currentData.amsSourceWorkspace.vendors, currentData.summary.year, runAmsSourceRequest]);

  const updateAmsSourceAmount = useCallback((rowIndex: number, type: 'plan' | 'actual', monthIndex: number, value: string) => {
    const normalized = sanitizeAmsSourceInput(value);
    setAmsSourceDrafts((current) => current.map((row, index) => {
      if (index !== rowIndex) return row;
      const key = type === 'plan' ? 'planValues' : 'actualValues';
      return { ...row, [key]: row[key].map((amount, amountIndex) => amountIndex === monthIndex ? normalized : amount) };
    }));
  }, []);

  const pasteAmsSourceAmounts = useCallback((rowIndex: number, type: 'plan' | 'actual', monthIndex: number, text: string) => {
    setAmsSourceDrafts((current) => {
      const applied = applyAmsSourceGridPaste(current, rowIndex, type, monthIndex, text);
      if (applied.invalidCellCount > 0) {
        setAmsSourceNotice(null);
        setAmsSourceError('붙여넣을 수 없는 값입니다.');
        return current;
      }
      setAmsSourceNotice(`${applied.pastedCellCount}개 셀 붙여넣기 완료`);
      setAmsSourceError(null);
      return applied.drafts;
    });
  }, []);

  const saveAmsSourceExternalCost = useCallback(async () => {
    setIsSavingAmsSource(true);
    setAmsSourceNotice(null);
    setAmsSourceError(null);
    try {
      await runAmsSourceRequest('/api/crm/cost-plan/ams/source/external-cost', {
        method: 'POST',
        body: JSON.stringify(toAmsSourceExternalCostRequest(currentData.summary.year, amsSourceDrafts)),
      });
      setAmsSourceNotice(`${currentData.summary.year}년 외부원가가 저장되었습니다.`);
    } catch (error) {
      setAmsSourceError(error instanceof Error ? error.message : 'AMS 연간 외부원가 저장에 실패했습니다.');
    } finally {
      setIsSavingAmsSource(false);
    }
  }, [amsSourceDrafts, currentData.summary.year, runAmsSourceRequest]);

  const saveInternalMonthlyInput = useCallback(async () => {
    if (!accessToken || !selectedInternalRow) {
      return;
    }
    if (selectedInternalRow.internalCostInputStatus === 'confirmed') {
      setSaveError('확정된 내부원가 월별 입력은 확정 해제 후 수정할 수 있습니다.');
      setSaveNotice(null);
      return;
    }

    setIsSavingInternalCost(true);
    setSaveError(null);
    setSaveNotice(null);
    try {
      const response = await fetch('/api/crm/cost-plan/internal-cost/monthly', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetYear: currentData.summary.year,
          businessType: selectedInternalRow.businessType,
          industryLine: selectedInternalRow.industryLine,
          ownerName: selectedInternalRow.ownerName,
          region: selectedInternalRow.region,
          wbsCode: selectedInternalRow.wbsCode,
          monthlyPlanAmounts,
          monthlyActualAmounts,
          memo: 'CRM cost-plan internal monthly input',
        }),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmCostPlanInternalMonthlyInputResult> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setSaveNotice('내부원가 월별 입력이 저장되었습니다.');
      await Promise.all([loadPreview(), loadAccountingPaymentPreview()]);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '내부원가 월별 입력 저장에 실패했습니다.');
    } finally {
      setIsSavingInternalCost(false);
    }
  }, [accessToken, currentData.summary.year, loadAccountingPaymentPreview, loadPreview, monthlyActualAmounts, monthlyPlanAmounts, selectedInternalRow]);

  const runInternalCostWorkflow = useCallback(async (action: 'confirm' | 'reopen') => {
    if (!accessToken || !selectedInternalRow?.internalCostInputId) {
      return;
    }

    setIsSavingInternalWorkflow(true);
    setSaveError(null);
    setSaveNotice(null);
    try {
      const response = await fetch(`/api/crm/cost-plan/internal-cost/monthly/${encodeURIComponent(selectedInternalRow.internalCostInputId)}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmCostPlanInternalMonthlyWorkflowResult> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setSaveNotice(action === 'confirm' ? '내부원가 월별 입력이 확정되었습니다.' : '내부원가 월별 입력 확정이 해제되었습니다.');
      await Promise.all([loadPreview(), loadAccountingPaymentPreview()]);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '내부원가 월별 입력 workflow 처리에 실패했습니다.');
    } finally {
      setIsSavingInternalWorkflow(false);
    }
  }, [accessToken, loadAccountingPaymentPreview, loadPreview, selectedInternalRow]);

  const saveAmsVendorMapping = useCallback(async () => {
    if (!accessToken || !selectedAmsRow) {
      return;
    }
    const vendorName = amsVendorName.trim();
    if (!selectedAmsRow.wbsCode || !vendorName) {
      setAmsSaveError('WBS와 AMS 업체명이 필요합니다.');
      setAmsSaveNotice(null);
      return;
    }

    setIsSavingAmsMapping(true);
    setAmsSaveError(null);
    setAmsSaveNotice(null);
    try {
      const response = await fetch('/api/crm/cost-plan/ams/vendor-wbs', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetYear: currentData.summary.year,
          businessType: selectedAmsRow.businessType,
          industryLine: selectedAmsRow.industryLine,
          ownerName: selectedAmsRow.ownerName,
          region: selectedAmsRow.region === 'all' ? 'domestic' : selectedAmsRow.region,
          wbsCode: selectedAmsRow.wbsCode,
          vendorName,
          vendorContractNo: amsVendorContractNo.trim() || undefined,
          memo: 'CRM cost-plan AMS vendor-WBS mapping',
        }),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmCostPlanAmsVendorWbsMappingResult> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setAmsSaveNotice('AMS 업체-WBS 매핑이 저장되었습니다.');
      await Promise.all([loadPreview(), loadAccountingPaymentPreview()]);
    } catch (error) {
      setAmsSaveError(error instanceof Error ? error.message : 'AMS 업체-WBS 매핑 저장에 실패했습니다.');
    } finally {
      setIsSavingAmsMapping(false);
    }
  }, [accessToken, amsVendorContractNo, amsVendorName, currentData.summary.year, loadAccountingPaymentPreview, loadPreview, selectedAmsRow]);

  const saveAmsExternalMonthlyInput = useCallback(async () => {
    if (!accessToken || !selectedAmsExternalRow) {
      return;
    }
    if (!selectedAmsExternalRow.wbsCode || !selectedAmsExternalRow.amsVendorName) {
      setAmsExternalSaveError('WBS와 AMS 업체 매핑이 필요합니다.');
      setAmsExternalSaveNotice(null);
      return;
    }
    if (selectedAmsExternalRow.amsExternalCostInputStatus === 'confirmed') {
      setAmsExternalSaveError('정산 확정된 AMS 외부원가 월별 입력은 확정 해제 후 수정할 수 있습니다.');
      setAmsExternalSaveNotice(null);
      return;
    }

    setIsSavingAmsExternalCost(true);
    setAmsExternalSaveError(null);
    setAmsExternalSaveNotice(null);
    try {
      const response = await fetch('/api/crm/cost-plan/ams/external-cost/monthly', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetYear: currentData.summary.year,
          businessType: selectedAmsExternalRow.businessType,
          industryLine: selectedAmsExternalRow.industryLine,
          ownerName: selectedAmsExternalRow.ownerName,
          region: selectedAmsExternalRow.region === 'all' ? 'domestic' : selectedAmsExternalRow.region,
          wbsCode: selectedAmsExternalRow.wbsCode,
          vendorName: selectedAmsExternalRow.amsVendorName,
          vendorContractNo: selectedAmsExternalRow.amsVendorContractNo,
          monthlyPlanAmounts: amsExternalMonthlyPlanAmounts,
          monthlyActualAmounts: amsExternalMonthlyActualAmounts,
          memo: 'CRM cost-plan AMS external monthly input',
        }),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmCostPlanAmsExternalMonthlyInputResult> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setAmsExternalSaveNotice('AMS 외부원가 월별 입력이 저장되었습니다.');
      await Promise.all([loadPreview(), loadAccountingPaymentPreview()]);
    } catch (error) {
      setAmsExternalSaveError(error instanceof Error ? error.message : 'AMS 외부원가 월별 입력 저장에 실패했습니다.');
    } finally {
      setIsSavingAmsExternalCost(false);
    }
  }, [
    accessToken,
    amsExternalMonthlyActualAmounts,
    amsExternalMonthlyPlanAmounts,
    currentData.summary.year,
    loadAccountingPaymentPreview,
    loadPreview,
    selectedAmsExternalRow,
  ]);

  const runAmsExternalWorkflow = useCallback(async (action: 'confirm' | 'reopen') => {
    if (!accessToken || !selectedAmsExternalRow?.amsExternalCostInputId) {
      return;
    }

    setIsSavingAmsExternalWorkflow(true);
    setAmsExternalSaveError(null);
    setAmsExternalSaveNotice(null);
    try {
      const response = await fetch(
        `/api/crm/cost-plan/ams/external-cost/monthly/${encodeURIComponent(selectedAmsExternalRow.amsExternalCostInputId)}/${action}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmCostPlanAmsExternalMonthlyWorkflowResult> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setAmsExternalSaveNotice(action === 'confirm' ? 'AMS 외부원가 월별 입력이 정산 확정되었습니다.' : 'AMS 외부원가 월별 입력 정산 확정이 해제되었습니다.');
      await Promise.all([loadPreview(), loadAccountingPaymentPreview()]);
    } catch (error) {
      setAmsExternalSaveError(error instanceof Error ? error.message : 'AMS 외부원가 정산 상태 변경에 실패했습니다.');
    } finally {
      setIsSavingAmsExternalWorkflow(false);
    }
  }, [accessToken, loadAccountingPaymentPreview, loadPreview, selectedAmsExternalRow]);

  const createAccountingPaymentHandoff = useCallback(async () => {
    if (!accessToken || !accountingPaymentPreview || accountingPaymentPreview.readiness !== 'ready') {
      return;
    }

    setIsSavingAccountingPayment(true);
    setAccountingPaymentError(null);
    setAccountingPaymentNotice(null);
    try {
      const response = await fetch('/api/crm/cost-plan/accounting-payment-handoff', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          year: currentData.summary.year,
          businessType: currentData.summary.activeFilters.businessType,
          industryLine: currentData.summary.activeFilters.industryLine,
          region: currentData.summary.activeFilters.region,
          search: currentData.summary.activeFilters.search,
          memo: 'CRM cost-plan accounting/payment handoff snapshot',
        }),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmCostPlanAccountingPaymentHandoffResult> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setAccountingPaymentPreview(payload.data.preview);
      setAccountingPaymentNotice('회계·지급 handoff snapshot이 기록되었습니다.');
    } catch (error) {
      setAccountingPaymentError(error instanceof Error ? error.message : '회계·지급 handoff snapshot 기록에 실패했습니다.');
    } finally {
      setIsSavingAccountingPayment(false);
    }
  }, [accessToken, accountingPaymentPreview, currentData.summary.activeFilters, currentData.summary.year]);

  const executeAccountingPayment = useCallback(async () => {
    const handoff = accountingPaymentPreview?.latestHandoff;
    if (!accessToken || !handoff) {
      return;
    }

    setIsRecordingAccountingPaymentEvidence(true);
    setAccountingPaymentError(null);
    setAccountingPaymentNotice(null);
    try {
      const response = await fetch(`/api/crm/cost-plan/accounting-payment-handoffs/${encodeURIComponent(handoff.id)}/execute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memo: 'CRM cost-plan accounting/payment demo execution',
        }),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmCostPlanAccountingPaymentExecutionResult> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setAccountingPaymentPreview(payload.data.preview);
      setAccountingPaymentNotice(`회계·지급 실행 evidence가 생성되었습니다. 실행 ID: ${payload.data.externalExecution.executionId}`);
    } catch (error) {
      setAccountingPaymentError(error instanceof Error ? error.message : '회계·지급 실행 evidence 생성에 실패했습니다.');
    } finally {
      setIsRecordingAccountingPaymentEvidence(false);
    }
  }, [accessToken, accountingPaymentPreview?.latestHandoff]);

  useEffect(() => {
    const abortController = new AbortController();
    void loadPreview(abortController.signal);
    return () => abortController.abort();
  }, [loadPreview]);

  useEffect(() => {
    const abortController = new AbortController();
    void loadAccountingPaymentPreview(abortController.signal);
    return () => abortController.abort();
  }, [loadAccountingPaymentPreview]);

  if (query.sourceSurface === 'internal-cost') {
    return (
      <main className="h-full min-h-0 min-w-0 overflow-auto bg-ssoo-content-bg p-4" data-source-surface="internal-cost">
        <div className="mx-auto w-full min-w-0" style={{ maxWidth: SSOO_CONTENT_PAGE_METRICS.landscapeContentWidthPx }}>
          <h1 className="text-xl font-semibold text-foreground">내부원가 등록</h1>
          <p className="mt-1 text-sm text-muted-foreground">년도별 월간 내부원가를 입력합니다.</p>
          <SourceCostYearForm id="ic-year" label="년도 *" year={query.year} yearOptions={yearOptions} sourceSurface="internal-cost" />
          <section className="mt-5 overflow-hidden rounded-xl border bg-card">
            <InternalCostSourceGridPanel
              canWrite={canWriteCostPlan}
              targetYear={currentData.summary.year}
              boundaryNotice={currentData.internalCostSourceGrid.boundaryNotice}
              drafts={internalSourceDrafts}
              isSaving={isSavingInternalSource}
              notice={internalSourceNotice}
              error={internalSourceError}
              onChange={updateInternalSourceAmount}
              onPaste={pasteInternalSourceAmounts}
              onSave={() => void saveInternalSourceGrid()}
              sourceCompatible
            />
          </section>
        </div>
      </main>
    );
  }

  if (query.sourceSurface === 'ams-vendor') {
    return (
      <main className="h-full min-h-0 min-w-0 overflow-auto bg-ssoo-content-bg p-4" data-source-surface="ams-vendor">
        <div className="mx-auto w-full min-w-0" style={{ maxWidth: SSOO_CONTENT_PAGE_METRICS.mainContentWidthPx }}>
          <h1 className="text-xl font-semibold text-foreground">공급업체 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">사업년도별 AMS 공급업체와 WBS를 관리합니다.</p>
          <SourceCostYearForm id="av-year" label="사업년도 *" year={query.year} yearOptions={yearOptions} sourceSurface="ams-vendor" />
          <section className="mt-5 overflow-hidden rounded-xl border bg-card">
            <AmsSourceVendorPanel
              canWrite={canWriteCostPlan}
              workspace={currentData.amsSourceWorkspace}
              vendorName={amsSourceVendorName}
              isSaving={isSavingAmsSource}
              notice={amsSourceNotice}
              error={amsSourceError}
              onChangeVendorName={setAmsSourceVendorName}
              onCreate={() => void createAmsSourceVendor()}
              onDelete={(vendorId, vendorName) => void deleteAmsSourceVendor(vendorId, vendorName)}
              onToggleWbs={(vendorId, wbsCode, checked) => void toggleAmsSourceVendorWbs(vendorId, wbsCode, checked)}
              sourceCompatible
            />
          </section>
        </div>
      </main>
    );
  }

  if (query.sourceSurface === 'ams-cost') {
    return (
      <main className="h-full min-h-0 min-w-0 overflow-auto bg-ssoo-content-bg p-4" data-source-surface="ams-cost">
        <div className="mx-auto w-full min-w-0" style={{ maxWidth: SSOO_CONTENT_PAGE_METRICS.landscapeContentWidthPx }}>
          <h1 className="text-xl font-semibold text-foreground">연간 외부원가</h1>
          <p className="mt-1 text-sm text-muted-foreground">공급업체·WBS별 월간 계획과 실적을 입력합니다.</p>
          <SourceCostYearForm id="ac-year" label="사업년도 *" year={query.year} yearOptions={yearOptions} sourceSurface="ams-cost" />
          <section className="mt-5 overflow-hidden rounded-xl border bg-card">
            <AmsSourceExternalCostPanel
              canWrite={canWriteCostPlan}
              targetYear={currentData.summary.year}
              drafts={amsSourceDrafts}
              isSaving={isSavingAmsSource}
              notice={amsSourceNotice}
              error={amsSourceError}
              onChange={updateAmsSourceAmount}
              onPaste={pasteAmsSourceAmounts}
              onSave={() => void saveAmsSourceExternalCost()}
              sourceCompatible
            />
          </section>
        </div>
      </main>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-ssoo-content-bg">
      <header className="border-b bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">CRM Cost and AMS Preview</p>
            <h1 className="mt-1 text-xl font-semibold text-foreground">원가/AMS Preview</h1>
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
        <section className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
          <Metric label="내부원가 후보" value={formatEok(currentData.summary.internalCostCandidateTotal)} sub={formatWon(currentData.summary.internalCostCandidateTotal)} />
          <Metric label="입력 계획" value={formatEok(currentData.summary.internalCostPlanInputTotal)} sub={`${currentData.summary.internalCostInputRowCount}개 입력`} />
          <Metric label="입력 실적" value={formatEok(currentData.summary.internalCostActualInputTotal)} sub={formatWon(currentData.summary.internalCostActualInputTotal)} />
          <Metric label="내부 확정" value={`${currentData.summary.internalCostConfirmedRowCount}개`} sub={`${currentData.summary.internalCostInputRowCount}개 입력 중 확정`} />
          <Metric label="내부 Gap" value={formatEok(currentData.summary.internalCostGapTotal)} sub={formatWon(currentData.summary.internalCostGapTotal)} />
          <Metric label="외부원가 후보" value={formatEok(currentData.summary.externalCostPlanCandidateTotal)} sub={formatWon(currentData.summary.externalCostPlanCandidateTotal)} />
          <Metric label="외부원가 실적" value={formatEok(currentData.summary.contractExternalActualTotal)} sub={formatWon(currentData.summary.contractExternalActualTotal)} />
          <Metric label="외부원가 Gap" value={formatEok(currentData.summary.externalCostGapTotal)} sub={formatWon(currentData.summary.externalCostGapTotal)} />
          <Metric label="AMS 입력 계획" value={formatEok(currentData.summary.amsExternalCostPlanInputTotal)} sub={`${currentData.summary.amsExternalCostInputRowCount}개 입력`} />
          <Metric label="AMS 입력 실적" value={formatEok(currentData.summary.amsExternalCostActualInputTotal)} sub={formatWon(currentData.summary.amsExternalCostActualInputTotal)} />
          <Metric label="AMS 입력 Gap" value={formatEok(currentData.summary.amsExternalCostGapTotal)} sub={formatWon(currentData.summary.amsExternalCostGapTotal)} />
          <Metric label="AMS 정산 확정" value={`${currentData.summary.amsExternalCostConfirmedRowCount}개`} sub={`${currentData.summary.amsExternalCostInputRowCount}개 입력 중 확정`} />
          <Metric label="AMS readiness" value={`${currentData.summary.amsReadyCount}/${currentData.summary.amsReadyCount + currentData.summary.amsBlockedCount}`} sub={`매핑 ${currentData.summary.amsMappedCount}개 · 차단 ${currentData.summary.amsBlockedCount}건`} />
        </section>

        <section className="mt-4 rounded-md border bg-card">
          <form action="/cost-plan" className="flex flex-wrap items-end gap-3 border-b p-4">
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
              <NativeSelect name="region" value={filters.region} onChange={(event) => setFilters((current) => ({ ...current, region: event.target.value as CrmCostPlanPreviewRegion }))} className="mt-1">
                {Object.entries(regionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </NativeSelect>
            </label>
            <label className="min-w-0 flex-[1_1_220px] text-sm font-medium text-muted-foreground">
              검색
              <SsooSearchInput id="crm-cost-plan-search-input" name="search" ariaLabel="원가 계획 검색" intent="data-filter" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="고객, 건명, 담당자, WBS" className="mt-1" />
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
          {domainAccess && !canWriteCostPlan ? (
            <div className="border-b bg-ssoo-warning-bg px-4 py-3 text-sm text-ssoo-warning">원가·AMS 변경 권한이 없어 조회 전용으로 표시합니다.</div>
          ) : null}
          {domainAccessError ? (
            <div className="border-b bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger">{domainAccessError}</div>
          ) : null}

          <div className="border-b px-4 py-2 text-xs text-muted-foreground">
            단위: 억원 · 내부원가는 영업기회/계약 라인 후보와 월별 입력 원장, 외부원가는 확정 계약 청구계획/실적 read model 및 AMS 월별 입력 원장 기준
          </div>
          <MonthlyCostSummary months={currentData.months} />
          <InternalCostSourceGridPanel
            canWrite={canWriteCostPlan}
            targetYear={currentData.summary.year}
            boundaryNotice={currentData.internalCostSourceGrid.boundaryNotice}
            drafts={internalSourceDrafts}
            isSaving={isSavingInternalSource}
            notice={internalSourceNotice}
            error={internalSourceError}
            onChange={updateInternalSourceAmount}
            onPaste={pasteInternalSourceAmounts}
            onSave={() => void saveInternalSourceGrid()}
          />
          <InternalMonthlyInputPanel
            canWrite={canWriteCostPlan}
            canConfirm={canConfirmCostPlan}
            rows={currentData.rows}
            selectedRow={selectedInternalRow}
            selectedRowKey={selectedInternalRowKey}
            monthlyPlanAmounts={monthlyPlanAmounts}
            monthlyActualAmounts={monthlyActualAmounts}
            planInputTotal={planInputTotal}
            actualInputTotal={actualInputTotal}
            isSaving={isSavingInternalCost}
            isWorkflowBusy={isSavingInternalWorkflow}
            notice={saveNotice}
            error={saveError}
            onSelectRow={setSelectedInternalRowKey}
            onChangePlan={updateMonthlyPlanAmount}
            onChangeActual={updateMonthlyActualAmount}
            onSave={() => void saveInternalMonthlyInput()}
            onConfirm={() => void runInternalCostWorkflow('confirm')}
            onReopen={() => void runInternalCostWorkflow('reopen')}
          />
          <AmsSourceVendorPanel
            canWrite={canWriteCostPlan}
            workspace={currentData.amsSourceWorkspace}
            vendorName={amsSourceVendorName}
            isSaving={isSavingAmsSource}
            notice={amsSourceNotice}
            error={amsSourceError}
            onChangeVendorName={setAmsSourceVendorName}
            onCreate={() => void createAmsSourceVendor()}
            onDelete={(vendorId, vendorName) => void deleteAmsSourceVendor(vendorId, vendorName)}
            onToggleWbs={(vendorId, wbsCode, checked) => void toggleAmsSourceVendorWbs(vendorId, wbsCode, checked)}
          />
          <AmsSourceExternalCostPanel
            canWrite={canWriteCostPlan}
            targetYear={currentData.summary.year}
            drafts={amsSourceDrafts}
            isSaving={isSavingAmsSource}
            notice={amsSourceNotice}
            error={amsSourceError}
            onChange={updateAmsSourceAmount}
            onPaste={pasteAmsSourceAmounts}
            onSave={() => void saveAmsSourceExternalCost()}
          />
          <AmsVendorMappingPanel
            canWrite={canWriteCostPlan}
            rows={amsMappingRows}
            selectedRow={selectedAmsRow}
            selectedRowKey={selectedAmsRowKey}
            vendorName={amsVendorName}
            vendorContractNo={amsVendorContractNo}
            isSaving={isSavingAmsMapping}
            notice={amsSaveNotice}
            error={amsSaveError}
            onSelectRow={setSelectedAmsRowKey}
            onChangeVendorName={setAmsVendorName}
            onChangeVendorContractNo={setAmsVendorContractNo}
            onSave={() => void saveAmsVendorMapping()}
          />
          <AmsExternalMonthlyInputPanel
            canWrite={canWriteCostPlan}
            canConfirm={canConfirmCostPlan}
            rows={amsExternalRows}
            selectedRow={selectedAmsExternalRow}
            selectedRowKey={selectedAmsExternalRowKey}
            monthlyPlanAmounts={amsExternalMonthlyPlanAmounts}
            monthlyActualAmounts={amsExternalMonthlyActualAmounts}
            planInputTotal={amsExternalPlanInputTotal}
            actualInputTotal={amsExternalActualInputTotal}
            isSaving={isSavingAmsExternalCost}
            isWorkflowBusy={isSavingAmsExternalWorkflow}
            notice={amsExternalSaveNotice}
            error={amsExternalSaveError}
            onSelectRow={setSelectedAmsExternalRowKey}
            onChangePlan={updateAmsExternalMonthlyPlanAmount}
            onChangeActual={updateAmsExternalMonthlyActualAmount}
            onSave={() => void saveAmsExternalMonthlyInput()}
            onConfirm={() => void runAmsExternalWorkflow('confirm')}
            onReopen={() => void runAmsExternalWorkflow('reopen')}
          />
          <AccountingPaymentHandoffPanel
            canConfirm={canConfirmCostPlan}
            preview={accountingPaymentPreview}
            isLoading={isLoadingAccountingPayment}
            isSaving={isSavingAccountingPayment}
            isRecordingEvidence={isRecordingAccountingPaymentEvidence}
            notice={accountingPaymentNotice}
            error={accountingPaymentError}
            onSave={() => void createAccountingPaymentHandoff()}
            onExecute={() => void executeAccountingPayment()}
          />
          <CostPlanTable rows={currentData.rows} isLoading={isReloading} />
          <div className="border-t px-4 py-3 text-xs text-muted-foreground">
            {currentData.summary.rowCount}개 후보 · 내부원가 월별 입력 {currentData.summary.internalCostInputRowCount}개 · 내부원가 확정 {currentData.summary.internalCostConfirmedRowCount}개 · AMS 업체 매핑 {currentData.summary.amsMappedCount}개 · AMS 외부원가 입력 {currentData.summary.amsExternalCostInputRowCount}개 · AMS 정산 확정 {currentData.summary.amsExternalCostConfirmedRowCount}개
          </div>
        </section>
      </main>
    </div>
  );
}

function SourceCostYearForm({
  id,
  label,
  year,
  yearOptions,
  sourceSurface,
}: {
  id: string;
  label: string;
  year: number;
  yearOptions: number[];
  sourceSurface: 'internal-cost' | 'ams-vendor' | 'ams-cost';
}) {
  return (
    <form action="/cost-plan" className="mt-6 flex flex-wrap items-end gap-3">
      <Input type="hidden" name="sourceSurface" value={sourceSurface} />
      <div className="w-[160px]">
        <label className="mb-1 block text-sm text-muted-foreground">{label}</label>
        <NativeSelect id={id} name="year" defaultValue={String(year)}>{yearOptions.map((option) => <option key={option} value={option}>{option}년</option>)}</NativeSelect>
      </div>
      <Button type="submit" variant="outline">조회</Button>
    </form>
  );
}

function InternalCostSourceGridPanel({
  canWrite,
  targetYear,
  boundaryNotice,
  drafts,
  isSaving,
  notice,
  error,
  onChange,
  onPaste,
  onSave,
  sourceCompatible = false,
}: {
  canWrite: boolean;
  targetYear: number;
  boundaryNotice: string;
  drafts: InternalCostSourceGridDraftItem[];
  isSaving: boolean;
  notice: string | null;
  error: string | null;
  onChange: (itemIndex: number, type: 'plan' | 'actual', monthIndex: number, value: string) => void;
  onPaste: (itemIndex: number, type: 'plan' | 'actual', monthIndex: number, text: string) => void;
  onSave: () => void;
  sourceCompatible?: boolean;
}) {
  const monthlyPlanTotals = Array.from({ length: 12 }, (_, monthIndex) => (
    drafts.reduce((sum, item) => sum + sumInternalCostSourceValues([item.planValues[monthIndex] ?? '']), 0)
  ));
  const monthlyActualTotals = Array.from({ length: 12 }, (_, monthIndex) => (
    drafts.reduce((sum, item) => sum + sumInternalCostSourceValues([item.actualValues[monthIndex] ?? '']), 0)
  ));
  const planTotal = monthlyPlanTotals.reduce((sum, amount) => sum + amount, 0);
  const actualTotal = monthlyActualTotals.reduce((sum, amount) => sum + amount, 0);

  return (
    <div className="border-b p-4" data-testid="internal-cost-source-grid">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{sourceCompatible ? '내부원가 등록' : `${targetYear}년 내부원가 등록 · 원본 5개 항목`}</h2>
          {!sourceCompatible ? <p className="mt-1 text-xs text-muted-foreground">{boundaryNotice}</p> : null}
          <p className="mt-1 text-xs text-muted-foreground">엑셀의 탭/줄바꿈 셀을 선택한 월부터 붙여넣을 수 있습니다. 행 순서는 각 항목의 계획, 실적입니다.</p>
        </div>
        <Button type="button" onClick={onSave} disabled={!canWrite || isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? '저장 중' : sourceCompatible ? '저장' : '원본 5개 항목 저장'}
        </Button>
      </div>

      {notice ? <div className="mt-3 text-sm text-ssoo-info">{notice}</div> : null}
      {error ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-ssoo-danger">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-md border">
        <Table className="min-w-[1480px] border-collapse text-xs">
          <TableHeader className="bg-muted/60 text-muted-foreground">
            {sourceCompatible ? <TableRow><TableHead colSpan={15} className="border-b px-3 py-1 text-right text-xs font-normal">단위: 원</TableHead></TableRow> : null}
            <TableRow>
              <TableHead className="md:sticky md:left-0 z-20 w-[132px] border-b border-r bg-muted px-3 py-2 text-left">항목</TableHead>
              <TableHead className="md:sticky md:left-[132px] z-20 w-[64px] border-b border-r bg-muted px-2 py-2 text-left">구분</TableHead>
              {Array.from({ length: 12 }, (_, index) => <TableHead key={index} className="min-w-[92px] border-b border-r px-2 py-2 text-right">{index + 1}월</TableHead>)}
              <TableHead className="min-w-[112px] border-b px-3 py-2 text-right">합계</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drafts.flatMap((item, itemIndex) => (['plan', 'actual'] as const).map((type) => {
              const values = type === 'plan' ? item.planValues : item.actualValues;
              const rowTotal = sumInternalCostSourceValues(values);
              return (
                <TableRow key={`${item.itemCode}-${type}`} className={type === 'actual' ? 'border-b bg-muted/20' : ''}>
                  {type === 'plan' ? (
                    <TableHead rowSpan={2} className="md:sticky md:left-0 z-10 border-r border-b bg-card px-3 py-2 text-left font-semibold text-foreground">{item.itemName}</TableHead>
                  ) : null}
                  <TableHead className="md:sticky md:left-[132px] z-10 border-r bg-card px-2 py-2 text-left font-medium text-muted-foreground">{type === 'plan' ? '계획' : '실적'}</TableHead>
                  {values.map((value, monthIndex) => (
                    <TableCell key={monthIndex} className="border-r p-1">
                      <Input
                        type="text"
                        inputMode="numeric"
                        aria-label={`${item.itemName} ${type === 'plan' ? '계획' : '실적'} ${monthIndex + 1}월`}
                        value={value}
                        placeholder="0"
                        disabled={!canWrite || isSaving}
                        className="h-8 text-right tabular-nums"
                        onChange={(event) => onChange(itemIndex, type, monthIndex, event.target.value)}
                        onPaste={(event) => {
                          event.preventDefault();
                          onPaste(itemIndex, type, monthIndex, event.clipboardData.getData('text'));
                        }}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="px-3 py-2 text-right font-semibold tabular-nums">{formatInternalSourceAmount(rowTotal)}</TableCell>
                </TableRow>
              );
            }))}
            <InternalCostSourceSummaryRow label="소계" typeLabel="계획" values={monthlyPlanTotals} total={planTotal} />
            <InternalCostSourceSummaryRow label="" typeLabel="실적" values={monthlyActualTotals} total={actualTotal} />
            <InternalCostSourceSummaryRow
              label="차이"
              typeLabel="계획-실적"
              values={monthlyPlanTotals.map((amount, index) => amount - monthlyActualTotals[index])}
              total={planTotal - actualTotal}
              difference
            />
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function InternalCostSourceSummaryRow({
  label,
  typeLabel,
  values,
  total,
  difference = false,
}: {
  label: string;
  typeLabel: string;
  values: number[];
  total: number;
  difference?: boolean;
}) {
  return (
    <TableRow className={difference ? 'border-t-2 bg-ssoo-info-bg font-semibold' : 'border-t bg-muted/40 font-semibold'}>
      <TableHead className="md:sticky md:left-0 z-10 border-r bg-inherit px-3 py-2 text-left">{label}</TableHead>
      <TableHead className="md:sticky md:left-[132px] z-10 border-r bg-inherit px-2 py-2 text-left">{typeLabel}</TableHead>
      {values.map((value, index) => (
        <TableCell key={index} className={`border-r px-2 py-2 text-right tabular-nums ${difference ? internalSourceDifferenceTone(value) : ''}`}>{formatInternalSourceAmount(value)}</TableCell>
      ))}
      <TableCell className={`px-3 py-2 text-right tabular-nums ${difference ? internalSourceDifferenceTone(total) : ''}`}>{formatInternalSourceAmount(total)}</TableCell>
    </TableRow>
  );
}

function formatInternalSourceAmount(value: number) {
  return value === 0 ? '-' : Math.round(value).toLocaleString('ko-KR');
}

function internalSourceDifferenceTone(value: number) {
  return value > 0 ? 'text-ssoo-info' : value < 0 ? 'text-ssoo-danger' : 'text-muted-foreground';
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  const valueTone = value.startsWith('-') ? 'text-ssoo-danger' : 'text-foreground';
  return (
    <div className="min-w-0 rounded-md border bg-card px-4 py-3">
      <div className="min-w-0 text-xs font-medium text-muted-foreground">{label}</div>
      <div className={`mt-1 break-words text-lg font-semibold ${valueTone}`}>{value}</div>
      <div className="mt-1 break-words text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function MonthlyCostSummary({ months }: { months: CrmCostPlanPreviewMonth[] }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-2 border-b p-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {months.map((month) => (
        <div key={month.month} className="min-w-0 rounded-md border bg-ssoo-content-bg px-3 py-2">
          <div className="text-sm font-semibold text-foreground">{month.month}월</div>
          <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-1 break-words text-xs text-muted-foreground">
            <span>내부</span>
            <span className="text-right font-medium text-foreground">{formatEok(month.pipelineInternalCostAmount + month.contractInternalCostAmount)}</span>
            <span>입력계획</span>
            <span className="text-right font-medium text-foreground">{formatEok(month.internalCostPlanInputAmount)}</span>
            <span>입력실적</span>
            <span className="text-right font-medium text-foreground">{formatEok(month.internalCostActualInputAmount)}</span>
            <span>외부계획</span>
            <span className="text-right font-medium text-foreground">{formatEok(month.externalCostPlanCandidateAmount)}</span>
            <span>외부실적</span>
            <span className="text-right font-medium text-foreground">{formatEok(month.contractExternalActualAmount)}</span>
            <span>AMS입력</span>
            <span className="text-right font-medium text-foreground">{formatEok(month.amsExternalCostPlanInputAmount)}</span>
            <span>AMS실적</span>
            <span className="text-right font-medium text-foreground">{formatEok(month.amsExternalCostActualInputAmount)}</span>
            <span>Gap</span>
            <span className={`text-right font-medium ${month.externalCostGapAmount < 0 ? 'text-ssoo-danger' : 'text-ssoo-info'}`}>{formatEok(month.externalCostGapAmount)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function InternalMonthlyInputPanel({
  canWrite,
  canConfirm,
  rows,
  selectedRow,
  selectedRowKey,
  monthlyPlanAmounts,
  monthlyActualAmounts,
  planInputTotal,
  actualInputTotal,
  isSaving,
  isWorkflowBusy,
  notice,
  error,
  onSelectRow,
  onChangePlan,
  onChangeActual,
  onSave,
  onConfirm,
  onReopen,
}: {
  canWrite: boolean;
  canConfirm: boolean;
  rows: CrmCostPlanPreviewRow[];
  selectedRow: CrmCostPlanPreviewRow | undefined;
  selectedRowKey: string;
  monthlyPlanAmounts: number[];
  monthlyActualAmounts: number[];
  planInputTotal: number;
  actualInputTotal: number;
  isSaving: boolean;
  isWorkflowBusy: boolean;
  notice: string | null;
  error: string | null;
  onSelectRow: (key: string) => void;
  onChangePlan: (index: number, value: string) => void;
  onChangeActual: (index: number, value: string) => void;
  onSave: () => void;
  onConfirm: () => void;
  onReopen: () => void;
}) {
  const gapTotal = actualInputTotal - planInputTotal;
  const isConfirmed = selectedRow?.internalCostInputStatus === 'confirmed';
  return (
    <div className="border-b p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="min-w-0 flex-[1_1_260px] text-sm font-medium text-muted-foreground">
          내부원가 입력 기준
          <NativeSelect
            value={selectedRowKey}
            className="mt-1"
            disabled={rows.length === 0 || isSaving}
            onChange={(event) => onSelectRow(event.target.value)}
          >
            {rows.length === 0 ? <option value="">입력 후보 없음</option> : null}
            {rows.map((row) => (
              <option key={row.key} value={row.key}>
                {[row.businessType, row.industryLine, row.ownerName, row.wbsCode ?? 'Pipeline'].join(' / ')}
              </option>
            ))}
          </NativeSelect>
        </label>
        <div className="grid w-full min-w-0 grid-cols-2 gap-2 text-xs text-muted-foreground xl:max-w-[420px] xl:grid-cols-4">
          <InputMetric label="계획" value={formatEok(planInputTotal)} />
          <InputMetric label="실적" value={formatEok(actualInputTotal)} />
          <InputMetric label="Gap" value={formatEok(gapTotal)} tone={gapTotal < 0 ? 'danger' : 'info'} />
          <InputMetric label="상태" value={selectedRow ? internalInputStatusLabels[selectedRow.internalCostInputStatus] : '-'} tone={isConfirmed ? 'info' : undefined} />
        </div>
        <Button type="button" onClick={onSave} disabled={!canWrite || !selectedRow || isConfirmed || isSaving || isWorkflowBusy}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? '저장 중' : '내부원가 월별 저장'}
        </Button>
        {selectedRow?.internalCostInputId ? (
          isConfirmed ? (
            <Button variant="outline" type="button" onClick={onReopen} disabled={!canConfirm || isSaving || isWorkflowBusy}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {isWorkflowBusy ? '처리 중' : '확정 해제'}
            </Button>
          ) : (
            <Button variant="outline" type="button" onClick={onConfirm} disabled={!canConfirm || isSaving || isWorkflowBusy}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {isWorkflowBusy ? '처리 중' : '내부원가 확정'}
            </Button>
          )
        ) : null}
      </div>

      {notice ? <div className="mt-3 text-sm text-ssoo-info">{notice}</div> : null}
      {error ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-ssoo-danger">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 xl:grid-cols-2 2xl:grid-cols-3">
        {monthlyPlanAmounts.map((planAmount, index) => (
          <div key={index} className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)] items-end gap-2">
            <div className="pb-2 text-sm font-semibold text-foreground">{index + 1}월</div>
            <label className="min-w-0 text-xs font-medium text-muted-foreground">
              계획
              <Input
                type="number"
                min={0}
                value={planAmount}
                className="mt-1"
                disabled={!canWrite || !selectedRow || isConfirmed || isSaving || isWorkflowBusy}
                onChange={(event) => onChangePlan(index, event.target.value)}
              />
            </label>
            <label className="min-w-0 text-xs font-medium text-muted-foreground">
              실적
              <Input
                type="number"
                min={0}
                value={monthlyActualAmounts[index] ?? 0}
                className="mt-1"
                disabled={!canWrite || !selectedRow || isConfirmed || isSaving || isWorkflowBusy}
                onChange={(event) => onChangeActual(index, event.target.value)}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function AmsSourceVendorPanel({
  canWrite,
  workspace,
  vendorName,
  isSaving,
  notice,
  error,
  onChangeVendorName,
  onCreate,
  onDelete,
  onToggleWbs,
  sourceCompatible = false,
}: {
  canWrite: boolean;
  workspace: CrmCostPlanAmsSourceWorkspace;
  vendorName: string;
  isSaving: boolean;
  notice: string | null;
  error: string | null;
  onChangeVendorName: (value: string) => void;
  onCreate: () => void;
  onDelete: (vendorId: string, vendorName: string) => void;
  onToggleWbs: (vendorId: string, wbsCode: string, checked: boolean) => void;
  sourceCompatible?: boolean;
}) {
  return (
    <div className="border-b p-4" data-testid="ams-source-vendor-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{sourceCompatible ? '공급업체 관리' : `${workspace.targetYear}년 AMS 공급업체 관리 · 원본 다중 WBS`}</h2>
          {!sourceCompatible ? <p className="mt-1 text-xs text-muted-foreground">{workspace.boundaryNotice}</p> : null}
        </div>
        <div className="flex w-full min-w-0 flex-wrap gap-2 sm:max-w-[420px]">
          <Input
            aria-label="AMS 공급업체명"
            className="min-w-0 flex-[1_1_180px]"
            value={vendorName}
            maxLength={200}
            placeholder="공급업체명"
            disabled={!canWrite || isSaving}
            onChange={(event) => onChangeVendorName(event.target.value)}
          />
          <Button type="button" onClick={onCreate} disabled={!canWrite || isSaving}>
            {!sourceCompatible ? <Plus className="mr-2 h-4 w-4" /> : null}{sourceCompatible ? '+ 업체 추가' : '업체 추가'}
          </Button>
        </div>
      </div>

      {notice ? <div className="mt-3 text-sm text-ssoo-info">{notice}</div> : null}
      {error ? <div className="mt-3 flex items-center gap-2 text-sm text-ssoo-danger"><AlertCircle className="h-4 w-4" />{error}</div> : null}

      {workspace.vendors.length === 0 ? (
        <div className="mt-4 rounded-md border bg-muted/20 px-4 py-5 text-sm text-muted-foreground">등록된 공급업체가 없습니다. &quot;+ 업체 추가&quot;로 추가하세요.</div>
      ) : (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {workspace.vendors.map((vendor) => {
            const selected = new Set(vendor.wbs.map((mapping) => mapping.wbsCode));
            return (
              <div key={vendor.id} className="min-w-0 rounded-md border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="min-w-0 break-words font-semibold text-foreground">{vendor.vendorName}</span>
                  <Button variant="outline" size="sm" type="button" disabled={!canWrite || isSaving} onClick={() => onDelete(vendor.id, vendor.vendorName)}>
                    <Trash2 className="mr-2 h-4 w-4" />삭제
                  </Button>
                </div>
                <div className="mt-3 text-xs font-medium text-muted-foreground">WBS코드 선택 (AMS 확정 계약)</div>
                {workspace.eligibleWbs.length === 0 ? (
                  <div className="mt-2 text-xs text-muted-foreground">확정된 AMS 계약의 WBS코드가 없습니다.</div>
                ) : (
                  <div className="mt-2 grid gap-2">
                    {workspace.eligibleWbs.map((wbs) => (
                      <label key={wbs.wbsCode} className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
                        <Checkbox
                          aria-label={`${vendor.vendorName} ${wbs.wbsCode} 매핑`}
                          checked={selected.has(wbs.wbsCode)}
                          disabled={!canWrite || isSaving}
                          onCheckedChange={(checked) => onToggleWbs(vendor.id, wbs.wbsCode, checked === true)}
                        />
                        <span className="min-w-0 break-words">{wbs.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AmsSourceExternalCostPanel({
  canWrite,
  targetYear,
  drafts,
  isSaving,
  notice,
  error,
  onChange,
  onPaste,
  onSave,
  sourceCompatible = false,
}: {
  canWrite: boolean;
  targetYear: number;
  drafts: AmsSourceGridDraftRow[];
  isSaving: boolean;
  notice: string | null;
  error: string | null;
  onChange: (rowIndex: number, type: 'plan' | 'actual', monthIndex: number, value: string) => void;
  onPaste: (rowIndex: number, type: 'plan' | 'actual', monthIndex: number, text: string) => void;
  onSave: () => void;
  sourceCompatible?: boolean;
}) {
  const vendorRowCounts = new Map<string, number>();
  drafts.forEach((row) => vendorRowCounts.set(row.vendorId, (vendorRowCounts.get(row.vendorId) ?? 0) + 1));
  const firstVendorRows = new Set<string>();
  return (
    <div className="border-b p-4" data-testid="ams-source-external-grid">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{sourceCompatible ? '연간 외부원가' : `${targetYear}년 AMS 연간 외부원가 · 업체×WBS`}</h2>
          <p className="mt-1 text-xs text-muted-foreground">월별 계획·실적을 입력하면 차이(실적-계획)가 자동 계산됩니다. 붙여넣기는 선택한 계획/실적 유형을 유지해 다음 업체-WBS 행으로 이어집니다.</p>
        </div>
        <Button type="button" disabled={!canWrite || isSaving || drafts.length === 0} onClick={onSave}>
          <Save className="mr-2 h-4 w-4" />{isSaving ? '저장 중' : sourceCompatible ? '저장' : 'AMS 연간 외부원가 저장'}
        </Button>
      </div>
      {notice ? <div className="mt-3 text-sm text-ssoo-info">{notice}</div> : null}
      {error ? <div className="mt-3 flex items-center gap-2 text-sm text-ssoo-danger"><AlertCircle className="h-4 w-4" />{error}</div> : null}
      {drafts.length === 0 ? (
        <div className="mt-4 rounded-md border bg-muted/20 px-4 py-5 text-sm text-muted-foreground">공급업체 관리에서 먼저 업체와 WBS를 등록하세요.</div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-md border">
          <Table className="min-w-[3420px] border-collapse text-xs">
            <TableHeader className="bg-muted/60 text-muted-foreground">
              <TableRow>
                <TableHead rowSpan={2} className="md:sticky md:left-0 z-30 min-w-[120px] border-b border-r bg-muted px-3 py-2">공급업체</TableHead>
                <TableHead rowSpan={2} className="md:sticky md:left-[120px] z-30 min-w-[100px] border-b border-r-2 bg-muted px-3 py-2">WBS코드</TableHead>
                {Array.from({ length: 12 }, (_, index) => <TableHead key={index} colSpan={3} className="min-w-[240px] border-b border-r px-2 py-2">{index + 1}월</TableHead>)}
                <TableHead colSpan={3} className="min-w-[240px] border-b px-2 py-2">합계</TableHead>
              </TableRow>
              <TableRow>
                {Array.from({ length: 13 }, (_, index) => (
                  <Fragment key={index}>
                    <TableHead className="min-w-[80px] border-b border-r px-2 py-2 text-right">계획</TableHead>
                    <TableHead className="min-w-[80px] border-b border-r px-2 py-2 text-right">실적</TableHead>
                    <TableHead className="min-w-[80px] border-b border-r px-2 py-2 text-right text-ssoo-info">차이</TableHead>
                  </Fragment>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {drafts.map((row, rowIndex) => {
                const firstForVendor = !firstVendorRows.has(row.vendorId);
                firstVendorRows.add(row.vendorId);
                const planTotal = sumAmsSourceValues(row.planValues);
                const actualTotal = sumAmsSourceValues(row.actualValues);
                return (
                  <TableRow key={`${row.vendorId}-${row.wbsCode}`} className="border-b">
                    {firstForVendor ? (
                      <TableHead rowSpan={vendorRowCounts.get(row.vendorId)} className="md:sticky md:left-0 z-20 border-r bg-card px-3 py-2 text-center font-semibold">{row.vendorName}</TableHead>
                    ) : null}
                    <TableHead className="md:sticky md:left-[120px] z-20 border-r-2 bg-card px-3 py-2 font-mono text-caption-2xs">{row.wbsCode}</TableHead>
                    {Array.from({ length: 12 }, (_, monthIndex) => {
                      const plan = row.planValues[monthIndex] ?? '';
                      const actual = row.actualValues[monthIndex] ?? '';
                      const difference = sumAmsSourceValues([actual]) - sumAmsSourceValues([plan]);
                      return (
                        <Fragment key={monthIndex}>
                          <AmsSourceAmountCell row={row} rowIndex={rowIndex} type="plan" monthIndex={monthIndex} value={plan} isSaving={!canWrite || isSaving} onChange={onChange} onPaste={onPaste} />
                          <AmsSourceAmountCell row={row} rowIndex={rowIndex} type="actual" monthIndex={monthIndex} value={actual} isSaving={!canWrite || isSaving} onChange={onChange} onPaste={onPaste} actual />
                          <TableCell className={`border-r bg-ssoo-warning-bg px-2 py-2 text-right tabular-nums ${internalSourceDifferenceTone(difference)}`}>{formatInternalSourceAmount(difference)}</TableCell>
                        </Fragment>
                      );
                    })}
                    <TableCell className="border-r bg-muted/30 px-2 py-2 text-right font-semibold tabular-nums">{formatInternalSourceAmount(planTotal)}</TableCell>
                    <TableCell className="border-r bg-muted/30 px-2 py-2 text-right font-semibold tabular-nums">{formatInternalSourceAmount(actualTotal)}</TableCell>
                    <TableCell className={`bg-ssoo-warning-bg px-2 py-2 text-right font-semibold tabular-nums ${internalSourceDifferenceTone(actualTotal - planTotal)}`}>{formatInternalSourceAmount(actualTotal - planTotal)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="mt-2 text-xs text-muted-foreground">{new Set(drafts.map((row) => row.vendorId)).size}개 업체 · {drafts.length}개 WBS</div>
    </div>
  );
}

function AmsSourceAmountCell({
  row,
  rowIndex,
  type,
  monthIndex,
  value,
  isSaving,
  onChange,
  onPaste,
  actual = false,
}: {
  row: AmsSourceGridDraftRow;
  rowIndex: number;
  type: 'plan' | 'actual';
  monthIndex: number;
  value: string;
  isSaving: boolean;
  onChange: (rowIndex: number, type: 'plan' | 'actual', monthIndex: number, value: string) => void;
  onPaste: (rowIndex: number, type: 'plan' | 'actual', monthIndex: number, text: string) => void;
  actual?: boolean;
}) {
  return (
    <TableCell className={`border-r p-1 ${actual ? 'bg-ssoo-info-bg' : ''}`}>
      <Input
        type="text"
        inputMode="numeric"
        aria-label={`${row.vendorName} ${row.wbsCode} ${type === 'plan' ? '계획' : '실적'} ${monthIndex + 1}월`}
        value={value}
        placeholder="0"
        disabled={isSaving}
        className="h-8 border-transparent bg-transparent text-right text-xs tabular-nums"
        onChange={(event) => onChange(rowIndex, type, monthIndex, event.target.value)}
        onPaste={(event) => {
          event.preventDefault();
          onPaste(rowIndex, type, monthIndex, event.clipboardData.getData('text'));
        }}
      />
    </TableCell>
  );
}

function AmsVendorMappingPanel({
  canWrite,
  rows,
  selectedRow,
  selectedRowKey,
  vendorName,
  vendorContractNo,
  isSaving,
  notice,
  error,
  onSelectRow,
  onChangeVendorName,
  onChangeVendorContractNo,
  onSave,
}: {
  canWrite: boolean;
  rows: CrmCostPlanPreviewRow[];
  selectedRow: CrmCostPlanPreviewRow | undefined;
  selectedRowKey: string;
  vendorName: string;
  vendorContractNo: string;
  isSaving: boolean;
  notice: string | null;
  error: string | null;
  onSelectRow: (key: string) => void;
  onChangeVendorName: (value: string) => void;
  onChangeVendorContractNo: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="border-b p-4">
      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 xl:items-end">
        <label className="min-w-0 text-sm font-medium text-muted-foreground">
          AMS 매핑 기준
          <NativeSelect
            value={selectedRowKey}
            className="mt-1"
            disabled={rows.length === 0 || isSaving}
            onChange={(event) => onSelectRow(event.target.value)}
          >
            {rows.length === 0 ? <option value="">매핑 후보 없음</option> : null}
            {rows.map((row) => (
              <option key={row.key} value={row.key}>
                {[row.businessType, row.industryLine, row.ownerName, row.wbsCode].join(' / ')}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="min-w-0 text-sm font-medium text-muted-foreground">
          업체명
          <Input
            value={vendorName}
            className="mt-1"
            maxLength={200}
            disabled={!canWrite || !selectedRow || isSaving}
            onChange={(event) => onChangeVendorName(event.target.value)}
          />
        </label>
        <label className="min-w-0 text-sm font-medium text-muted-foreground">
          계약/발주 번호
          <Input
            value={vendorContractNo}
            className="mt-1"
            maxLength={120}
            disabled={!canWrite || !selectedRow || isSaving}
            onChange={(event) => onChangeVendorContractNo(event.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <InputMetric label="매핑" value={selectedRow ? amsMappingLabels[selectedRow.amsMappingStatus] : '-'} />
          <InputMetric label="Ready" value={selectedRow ? amsReadinessLabels[selectedRow.amsReadiness] : '-'} />
        </div>
        <Button type="button" onClick={onSave} disabled={!canWrite || !selectedRow || !selectedRow.wbsCode || isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? '저장 중' : 'AMS 업체 매핑 저장'}
        </Button>
      </div>

      {notice ? <div className="mt-3 text-sm text-ssoo-info">{notice}</div> : null}
      {error ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-ssoo-danger">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}
    </div>
  );
}

function AmsExternalMonthlyInputPanel({
  canWrite,
  canConfirm,
  rows,
  selectedRow,
  selectedRowKey,
  monthlyPlanAmounts,
  monthlyActualAmounts,
  planInputTotal,
  actualInputTotal,
  isSaving,
  isWorkflowBusy,
  notice,
  error,
  onSelectRow,
  onChangePlan,
  onChangeActual,
  onSave,
  onConfirm,
  onReopen,
}: {
  canWrite: boolean;
  canConfirm: boolean;
  rows: CrmCostPlanPreviewRow[];
  selectedRow: CrmCostPlanPreviewRow | undefined;
  selectedRowKey: string;
  monthlyPlanAmounts: number[];
  monthlyActualAmounts: number[];
  planInputTotal: number;
  actualInputTotal: number;
  isSaving: boolean;
  isWorkflowBusy: boolean;
  notice: string | null;
  error: string | null;
  onSelectRow: (key: string) => void;
  onChangePlan: (index: number, value: string) => void;
  onChangeActual: (index: number, value: string) => void;
  onSave: () => void;
  onConfirm: () => void;
  onReopen: () => void;
}) {
  const gapTotal = actualInputTotal - planInputTotal;
  const isConfirmed = selectedRow?.amsExternalCostInputStatus === 'confirmed';
  return (
    <div className="border-b p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="min-w-0 flex-[1_1_280px] text-sm font-medium text-muted-foreground">
          AMS 외부원가 입력 기준
          <NativeSelect
            value={selectedRowKey}
            className="mt-1"
            disabled={rows.length === 0 || isSaving || isWorkflowBusy}
            onChange={(event) => onSelectRow(event.target.value)}
          >
            {rows.length === 0 ? <option value="">입력 후보 없음</option> : null}
            {rows.map((row) => (
              <option key={row.key} value={row.key}>
                {[row.businessType, row.industryLine, row.ownerName, row.wbsCode, row.amsVendorName].join(' / ')}
              </option>
            ))}
          </NativeSelect>
        </label>
        <div className="grid w-full min-w-0 grid-cols-2 gap-2 text-xs text-muted-foreground xl:max-w-[420px] xl:grid-cols-4">
          <InputMetric label="상태" value={selectedRow ? amsExternalInputStatusLabels[selectedRow.amsExternalCostInputStatus] : '-'} tone={isConfirmed ? 'info' : undefined} />
          <InputMetric label="계획" value={formatEok(planInputTotal)} />
          <InputMetric label="실적" value={formatEok(actualInputTotal)} />
          <InputMetric label="Gap" value={formatEok(gapTotal)} tone={gapTotal < 0 ? 'danger' : 'info'} />
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedRow?.amsExternalCostInputId ? (
            isConfirmed ? (
              <Button type="button" variant="outline" onClick={onReopen} disabled={!canConfirm || isSaving || isWorkflowBusy}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {isWorkflowBusy ? '처리 중' : '정산 확정 해제'}
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={onConfirm} disabled={!canConfirm || isSaving || isWorkflowBusy}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {isWorkflowBusy ? '처리 중' : 'AMS 정산 확정'}
              </Button>
            )
          ) : null}
          <Button type="button" onClick={onSave} disabled={!canWrite || !selectedRow || !selectedRow.wbsCode || !selectedRow.amsVendorName || isSaving || isWorkflowBusy || isConfirmed}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? '저장 중' : 'AMS 외부원가 월별 저장'}
          </Button>
        </div>
      </div>

      {notice ? <div className="mt-3 text-sm text-ssoo-info">{notice}</div> : null}
      {error ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-ssoo-danger">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 xl:grid-cols-2 2xl:grid-cols-3">
        {monthlyPlanAmounts.map((planAmount, index) => (
          <div key={index} className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)_minmax(0,1fr)] items-end gap-2">
            <div className="pb-2 text-sm font-semibold text-foreground">{index + 1}월</div>
            <label className="min-w-0 text-xs font-medium text-muted-foreground">
              계획
              <Input
                type="number"
                min={0}
                value={planAmount}
                className="mt-1"
                disabled={!canWrite || !selectedRow || isSaving || isWorkflowBusy || isConfirmed}
                onChange={(event) => onChangePlan(index, event.target.value)}
              />
            </label>
            <label className="min-w-0 text-xs font-medium text-muted-foreground">
              실적
              <Input
                type="number"
                min={0}
                value={monthlyActualAmounts[index] ?? 0}
                className="mt-1"
                disabled={!canWrite || !selectedRow || isSaving || isWorkflowBusy || isConfirmed}
                onChange={(event) => onChangeActual(index, event.target.value)}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountingPaymentHandoffPanel({
  canConfirm,
  preview,
  isLoading,
  isSaving,
  isRecordingEvidence,
  notice,
  error,
  onSave,
  onExecute,
}: {
  canConfirm: boolean;
  preview: CrmCostPlanAccountingPaymentPreview | null;
  isLoading: boolean;
  isSaving: boolean;
  isRecordingEvidence: boolean;
  notice: string | null;
  error: string | null;
  onSave: () => void;
  onExecute: () => void;
}) {
  const visibleLines = preview?.lines.slice(0, 6) ?? [];
  const canSave = Boolean(canConfirm && preview && preview.readiness === 'ready' && !isSaving && !isLoading);
  const latestEvidence = preview?.latestHandoff?.executionEvidence ?? [];
  const canRecordEvidence = Boolean(canConfirm && preview?.latestHandoff && !isRecordingEvidence && !isLoading);
  return (
    <div className="border-b p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">회계·지급 handoff</h2>
            <Badge variant={preview?.readiness === 'ready' ? 'default' : 'outline'}>
              {preview?.readiness === 'ready' ? 'snapshot 가능' : '확정 row 필요'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {preview?.boundaryNotice ?? '회계·지급 handoff preview를 불러오는 중입니다.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onExecute} disabled={!canRecordEvidence}>
            <FileCheck2 className="mr-2 h-4 w-4" />
            {isRecordingEvidence ? '실행 중' : '회계·지급 실행'}
          </Button>
          <Button type="button" onClick={onSave} disabled={!canSave}>
            <FileCheck2 className="mr-2 h-4 w-4" />
            {isSaving ? '기록 중' : '회계·지급 handoff 기록'}
          </Button>
        </div>
      </div>

      {preview ? (
        <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          <InputMetric label="확정 line" value={`${preview.lineCount}개`} />
          <InputMetric label="내부원가" value={`${preview.internalLineCount}개`} />
          <InputMetric label="AMS 정산" value={`${preview.amsExternalLineCount}개`} />
          <InputMetric label="정산 합계" value={formatEok(preview.settlementAmountTotal)} tone={preview.settlementAmountTotal > 0 ? 'info' : undefined} />
        </div>
      ) : null}

      {preview?.latestHandoff ? (
        <div className="mt-3 rounded-md border bg-ssoo-content-bg px-3 py-2 text-xs text-muted-foreground">
          최신 snapshot #{preview.latestHandoff.id} · {preview.latestHandoff.status} · {preview.latestHandoff.lineCount}개 line · {formatWon(preview.latestHandoff.settlementAmountTotal)} · {new Date(preview.latestHandoff.savedAt).toLocaleString('ko-KR')}
        </div>
      ) : null}

      {latestEvidence.length > 0 ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {latestEvidence.map((step) => (
            <div key={step.key} className="rounded-md border bg-ssoo-content-bg px-3 py-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-foreground">{step.evidenceLabel ?? step.key}</span>
                <span className="text-muted-foreground">{step.recordedAt ? new Date(step.recordedAt).toLocaleString('ko-KR') : '수신 시각 없음'}</span>
              </div>
              <div className="mt-1 break-all text-muted-foreground">{step.evidencePath}</div>
            </div>
          ))}
        </div>
      ) : null}

      {preview?.blockedReasons.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {preview.blockedReasons.map((reason) => (
            <Badge key={reason} variant="outline">{reason}</Badge>
          ))}
        </div>
      ) : null}

      {preview?.unavailableActions.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {preview.unavailableActions.map((action) => (
            <Badge key={action} variant="outline">{action}</Badge>
          ))}
        </div>
      ) : null}

      {notice ? <div className="mt-3 text-sm text-ssoo-info">{notice}</div> : null}
      {error ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-ssoo-danger">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 lg:grid-cols-2">
        {isLoading ? (
          <div className="rounded-md border bg-ssoo-content-bg px-3 py-3 text-sm text-ssoo-info">handoff preview를 불러오는 중입니다.</div>
        ) : null}
        {!isLoading && visibleLines.length === 0 ? (
          <div className="rounded-md border bg-ssoo-content-bg px-3 py-3 text-sm text-muted-foreground">확정된 내부원가 또는 AMS 정산 확정 row가 없습니다.</div>
        ) : null}
        {visibleLines.map((line) => (
          <div key={line.key} className="rounded-md border bg-ssoo-content-bg px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-foreground">
                {accountingPaymentSourceLabels[line.source]} · {line.businessType}
              </div>
              <div className="text-sm font-semibold text-ssoo-info">{formatEok(line.settlementAmount)}</div>
            </div>
            <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              <span>{line.industryLine} / {line.ownerName}</span>
              <span className="sm:text-right">{line.wbsCode ?? 'WBS 미지정'}</span>
              <span>{line.vendorName ?? '내부 원가'}</span>
              <span className="sm:text-right">{line.confirmedAt ? new Date(line.confirmedAt).toLocaleString('ko-KR') : '확정 시각 없음'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InputMetric({ label, value, tone }: { label: string; value: string; tone?: 'danger' | 'info' }) {
  const toneClass = tone === 'danger' ? 'text-ssoo-danger' : tone === 'info' ? 'text-ssoo-info' : 'text-foreground';
  return (
    <div className="min-w-0 rounded-md border bg-ssoo-content-bg px-3 py-2">
      <div className="font-medium">{label}</div>
      <div className={`mt-1 break-words text-sm font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function CostPlanTable({ rows, isLoading }: { rows: CrmCostPlanPreviewRow[]; isLoading: boolean }) {
  return (
    <div className="overflow-auto">
      <Table className="w-full min-w-[2360px] text-xs">
        <TableHeader className="sticky top-0 z-10 bg-ssoo-content-bg text-left text-muted-foreground shadow-sm">
          <TableRow>
            <TableHead className="w-[170px] px-2 py-2">사업구분</TableHead>
            <TableHead className="w-[160px] px-2 py-2">계열/산업</TableHead>
            <TableHead className="w-[120px] px-2 py-2">담당자</TableHead>
            <TableHead className="w-[120px] px-2 py-2">WBS</TableHead>
            <TableHead className="w-[100px] px-2 py-2">AMS</TableHead>
            <TableHead className="w-[160px] px-2 py-2">업체 매핑</TableHead>
            <TableHead className="w-[90px] px-2 py-2 text-right">AMS 입력 계획</TableHead>
            <TableHead className="w-[90px] px-2 py-2 text-right">AMS 입력 실적</TableHead>
            <TableHead className="w-[90px] px-2 py-2 text-right">AMS 입력 Gap</TableHead>
            <TableHead className="w-[102px] px-2 py-2">AMS 정산 상태</TableHead>
            <TableHead className="w-[90px] px-2 py-2 text-right">Pipeline 내부</TableHead>
            <TableHead className="w-[90px] px-2 py-2 text-right">Pipeline 외부</TableHead>
            <TableHead className="w-[90px] px-2 py-2 text-right">계약 내부</TableHead>
            <TableHead className="w-[90px] px-2 py-2 text-right">입력 계획</TableHead>
            <TableHead className="w-[90px] px-2 py-2 text-right">입력 실적</TableHead>
            <TableHead className="w-[92px] px-2 py-2">입력 상태</TableHead>
            <TableHead className="w-[90px] px-2 py-2 text-right">내부 Gap</TableHead>
            <TableHead className="w-[90px] px-2 py-2 text-right">외부 계획</TableHead>
            <TableHead className="w-[90px] px-2 py-2 text-right">외부 실적</TableHead>
            <TableHead className="w-[90px] px-2 py-2 text-right">Gap</TableHead>
            <TableHead className="w-[220px] px-2 py-2">차단 사유</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border">
          {isLoading ? (
            <TableRow>
              <TableCell className="px-3 py-5 text-left text-ssoo-info" colSpan={21}>원가/AMS preview를 불러오는 중입니다.</TableCell>
            </TableRow>
          ) : null}
          {!isLoading && rows.length === 0 ? (
            <TableRow>
              <TableCell className="px-3 py-5 text-left text-muted-foreground" colSpan={21}>조회된 원가/AMS 후보가 없습니다.</TableCell>
            </TableRow>
          ) : null}
          {!isLoading ? rows.map((row) => <CostPlanRow key={row.key} row={row} />) : null}
        </TableBody>
      </Table>
    </div>
  );
}

function CostPlanRow({ row }: { row: CrmCostPlanPreviewRow }) {
  const gapTone = row.externalCostGapAmount < 0 ? 'text-ssoo-danger' : row.externalCostGapAmount > 0 ? 'text-ssoo-info' : 'text-muted-foreground';
  const internalGapTone = row.internalCostGapAmount < 0 ? 'text-ssoo-danger' : row.internalCostGapAmount > 0 ? 'text-ssoo-info' : 'text-muted-foreground';
  const amsExternalGapTone = row.amsExternalCostGapAmount < 0 ? 'text-ssoo-danger' : row.amsExternalCostGapAmount > 0 ? 'text-ssoo-info' : 'text-muted-foreground';
  return (
    <TableRow>
      <TableCell className="px-2 py-2 font-medium text-foreground">{row.businessType}</TableCell>
      <TableCell className="px-2 py-2 text-muted-foreground">{row.industryLine}</TableCell>
      <TableCell className="px-2 py-2 text-muted-foreground">{row.ownerName}</TableCell>
      <TableCell className="px-2 py-2 text-muted-foreground">{row.wbsCode ?? '-'}</TableCell>
      <TableCell className="px-2 py-2">
        <Badge variant={row.amsReadiness === 'blocked' ? 'destructive' : row.amsReadiness === 'ready' ? 'default' : 'outline'}>
          {amsReadinessLabels[row.amsReadiness]}
        </Badge>
      </TableCell>
      <TableCell className="px-2 py-2 text-muted-foreground">
        <div className="font-medium text-foreground">{row.amsVendorName ?? '-'}</div>
        <div className="mt-1 text-xs text-muted-foreground">{row.amsVendorContractNo ?? amsMappingLabels[row.amsMappingStatus]}</div>
      </TableCell>
      <TableCell className="px-2 py-2 text-right text-muted-foreground">{formatTableAmount(row.amsExternalCostPlanInputAmount)}</TableCell>
      <TableCell className="px-2 py-2 text-right text-muted-foreground">{formatTableAmount(row.amsExternalCostActualInputAmount)}</TableCell>
      <TableCell className={`px-2 py-2 text-right font-semibold ${amsExternalGapTone}`}>{formatTableAmount(row.amsExternalCostGapAmount)}</TableCell>
      <TableCell className="px-2 py-2">
        <Badge variant={row.amsExternalCostInputStatus === 'confirmed' ? 'default' : row.amsExternalCostInputStatus === 'draft' ? 'outline' : 'secondary'}>
          {amsExternalInputStatusLabels[row.amsExternalCostInputStatus]}
        </Badge>
      </TableCell>
      <TableCell className="px-2 py-2 text-right text-muted-foreground">{formatTableAmount(row.pipelineInternalCostAmount)}</TableCell>
      <TableCell className="px-2 py-2 text-right text-muted-foreground">{formatTableAmount(row.pipelineExternalCostAmount)}</TableCell>
      <TableCell className="px-2 py-2 text-right text-muted-foreground">{formatTableAmount(row.contractInternalCostAmount)}</TableCell>
      <TableCell className="px-2 py-2 text-right text-muted-foreground">{formatTableAmount(row.internalCostPlanInputAmount)}</TableCell>
      <TableCell className="px-2 py-2 text-right text-muted-foreground">{formatTableAmount(row.internalCostActualInputAmount)}</TableCell>
      <TableCell className="px-2 py-2">
        <Badge variant={row.internalCostInputStatus === 'confirmed' ? 'default' : row.internalCostInputStatus === 'draft' ? 'outline' : 'secondary'}>
          {internalInputStatusLabels[row.internalCostInputStatus]}
        </Badge>
      </TableCell>
      <TableCell className={`px-2 py-2 text-right font-semibold ${internalGapTone}`}>{formatTableAmount(row.internalCostGapAmount)}</TableCell>
      <TableCell className="px-2 py-2 text-right text-muted-foreground">{formatTableAmount(row.externalCostPlanCandidateAmount)}</TableCell>
      <TableCell className="px-2 py-2 text-right text-muted-foreground">{formatTableAmount(row.contractExternalActualAmount)}</TableCell>
      <TableCell className={`px-2 py-2 text-right font-semibold ${gapTone}`}>{formatTableAmount(row.externalCostGapAmount)}</TableCell>
      <TableCell className="px-2 py-2 text-muted-foreground">{row.blockedReasons.length > 0 ? row.blockedReasons.join(', ') : '-'}</TableCell>
    </TableRow>
  );
}
