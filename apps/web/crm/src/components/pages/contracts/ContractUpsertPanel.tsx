'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, FilePlus2, PencilLine, Plus, Save, Trash2, Wand2 } from 'lucide-react';
import type {
  CrmBillingSplitPreviewResponse,
  CrmBillingSplitTarget,
  CrmContract,
  CrmContractStatus,
  CrmContractUpsertLine,
  CrmContractUpsertRequest,
  CrmOpportunityOwnerLookupItem,
  CrmOpportunityDiscountType,
  CrmOpportunityLineCategory,
  CrmOpportunityServiceType,
} from '@ssoo/types/crm';
import {
  Button,
  Checkbox,
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
import { useCrmCommonCodeOptions, withCurrentCodeOption } from '@/lib/crmCommonCodeOptions';

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

type RevenueCategory = Extract<CrmOpportunityLineCategory, 'product' | 'service'>;
type CostCategory = Extract<CrmOpportunityLineCategory, 'product' | 'internal-cost' | 'external-cost'>;

interface ContractHeaderDraft {
  sourceOpportunityCode: string;
  customerName: string;
  contractName: string;
  ownerName: string;
  clientContactName: string;
  ownerUserId: string;
  businessType: string;
  industryLine: string;
  region: 'domestic' | 'overseas';
  status: CrmContractStatus;
  contractStartDate: string;
  contractEndDate: string;
  wbsCode: string;
  paymentTermCode: string;
  specialDiscountType: CrmOpportunityDiscountType;
  specialDiscountValue: string;
  nextAction: string;
}

interface RevenueLineDraft {
  id: string;
  category: RevenueCategory;
  label: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  marginRate: string;
  truncUnit: string;
  department: string;
  memberName: string;
  grade: string;
  serviceType: CrmOpportunityServiceType;
}

interface CostLineDraft {
  id: string;
  category: CostCategory;
  label: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  department: string;
  memberName: string;
  grade: string;
  serviceType: CrmOpportunityServiceType;
}

interface BillingLineDraft {
  id: string;
  billingYm: string;
  revenueAmount: string;
  externalCostAmount: string;
}

interface SplitOptions {
  target: CrmBillingSplitTarget;
  periodMonths: string;
  truncUnit: string;
  includeLastMonth: boolean;
}

export interface ContractUpsertPanelProps {
  selected: CrmContract | null;
  accessToken: string | null;
  canWrite: boolean;
  onSaved: (contract: CrmContract) => void | Promise<void>;
  onDeleted: (contractId: string) => void | Promise<void>;
  variant?: 'workspace' | 'source';
  canConfirm?: boolean;
  onWorkflow?: (action: 'confirm' | 'reopen') => void;
  workflowPending?: boolean;
  onCancel?: () => void;
}

let draftSequence = 0;

function createDraftId(prefix: string) {
  draftSequence += 1;
  return `${prefix}-${Date.now()}-${draftSequence}`;
}

function createBlankHeader(): ContractHeaderDraft {
  return {
    sourceOpportunityCode: '',
    customerName: '',
    contractName: '',
    ownerName: '',
    clientContactName: '',
    ownerUserId: '',
    businessType: '',
    industryLine: '',
    region: 'domestic',
    status: 'review',
    contractStartDate: '',
    contractEndDate: '',
    wbsCode: '',
    paymentTermCode: '',
    specialDiscountType: 'amount',
    specialDiscountValue: '',
    nextAction: '계약 조건과 청구계획 검토',
  };
}

function createBlankRevenueLine(patch: Partial<RevenueLineDraft> = {}): RevenueLineDraft {
  return {
    id: createDraftId('rev'),
    category: 'service',
    label: '',
    quantity: '',
    unitPrice: '',
    amount: '',
    marginRate: '',
    truncUnit: '',
    department: '',
    memberName: '',
    grade: '',
    serviceType: 'internal',
    ...patch,
  };
}

function createBlankCostLine(patch: Partial<CostLineDraft> = {}): CostLineDraft {
  return {
    id: createDraftId('cost'),
    category: 'external-cost',
    label: '',
    quantity: '',
    unitPrice: '',
    amount: '',
    department: '',
    memberName: '',
    grade: '',
    serviceType: 'external',
    ...patch,
  };
}

function createBlankBillingLine(patch: Partial<BillingLineDraft> = {}): BillingLineDraft {
  return {
    id: createDraftId('bill'),
    billingYm: '',
    revenueAmount: '',
    externalCostAmount: '',
    ...patch,
  };
}

function normalizeNumericText(value: string, allowDecimal = false) {
  const normalized = allowDecimal ? value.replace(/[^0-9.]/g, '') : value.replace(/[^0-9]/g, '');
  if (!allowDecimal) {
    return normalized;
  }
  const [head, ...tail] = normalized.split('.');
  return tail.length > 0 ? `${head}.${tail.join('')}` : head;
}

function normalizeBillingYm(value: string) {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 6);
  return digits.length > 4 ? `${digits.slice(0, 4)}/${digits.slice(4)}` : digits;
}

function parseNumber(value: string) {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) {
    return 0;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumber(value: string) {
  const parsed = parseNumber(value);
  return parsed > 0 ? parsed : undefined;
}

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

function formatSourceCompactWon(value: number) {
  const rounded = Math.round(value);
  if (Math.abs(rounded) >= 100000000) {
    return `${(rounded / 100000000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억`;
  }
  if (Math.abs(rounded) >= 10000) {
    return `${Math.round(rounded / 10000).toLocaleString('ko-KR')}만`;
  }
  return rounded.toLocaleString('ko-KR');
}

function calculateLineAmount(line: { quantity: string; unitPrice: string; amount: string; truncUnit?: string }) {
  const quantity = parseNumber(line.quantity);
  const unitPrice = parseNumber(line.unitPrice);
  const directAmount = parseNumber(line.amount);
  const truncUnit = parseNumber(line.truncUnit ?? '');
  const rawAmount = quantity > 0 && unitPrice > 0 ? quantity * unitPrice : directAmount;
  if (truncUnit > 0) {
    return Math.floor(rawAmount / truncUnit) * truncUnit;
  }
  return Math.round(rawAmount);
}

function calculateDiscountAmount(subtotal: number, type: CrmOpportunityDiscountType, valueText: string) {
  const value = parseNumber(valueText);
  if (value <= 0 || subtotal <= 0) {
    return 0;
  }
  const discount = type === 'rate' ? Math.round(subtotal * value / 100) : Math.round(value);
  return Math.min(Math.max(discount, 0), subtotal);
}

function getBackendErrorMessage(responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null): string {
  if (!responseBody || responseBody.success === true) {
    return 'CRM 계약 처리 중 오류가 발생했습니다.';
  }

  return responseBody.error?.message || responseBody.message || 'CRM 계약 처리 중 오류가 발생했습니다.';
}

function createHeaderFromContract(contract: CrmContract): ContractHeaderDraft {
  return {
    sourceOpportunityCode: contract.sourceOpportunityCode ?? '',
    customerName: contract.customerName,
    contractName: contract.contractName,
    ownerName: contract.ownerName,
    clientContactName: contract.clientContactName ?? '',
    ownerUserId: contract.ownerUserId ?? '',
    businessType: contract.businessType,
    industryLine: contract.industryLine,
    region: contract.region,
    status: contract.status,
    contractStartDate: contract.contractStartDate,
    contractEndDate: contract.contractEndDate,
    wbsCode: contract.wbsCode ?? '',
    paymentTermCode: contract.paymentTermCode ?? '',
    specialDiscountType: contract.specialDiscountType,
    specialDiscountValue: contract.specialDiscountValue > 0 ? String(contract.specialDiscountValue) : '',
    nextAction: contract.nextAction,
  };
}

function createRevenueLineFromContractLine(line: CrmContract['revenueLines'][number]): RevenueLineDraft {
  return createBlankRevenueLine({
    id: line.id,
    category: line.category === 'product' ? 'product' : 'service',
    label: line.label,
    quantity: line.quantity === undefined ? '' : String(line.quantity),
    unitPrice: line.unitPrice === undefined ? '' : String(line.unitPrice),
    amount: line.quantity !== undefined && line.unitPrice !== undefined ? '' : String(line.amount),
    marginRate: line.marginRate === undefined ? '' : String(line.marginRate),
    truncUnit: line.truncUnit === undefined || line.truncUnit === 0 ? '' : String(line.truncUnit),
    department: line.department ?? '',
    memberName: line.memberName ?? '',
    grade: line.grade ?? '',
    serviceType: line.serviceType ?? 'internal',
  });
}

function createCostLineFromContractLine(line: CrmContract['costLines'][number]): CostLineDraft {
  const category: CostCategory = line.category === 'product'
    ? 'product'
    : line.category === 'external-cost'
      ? 'external-cost'
      : 'internal-cost';
  return createBlankCostLine({
    id: line.id,
    category,
    label: line.label,
    quantity: line.quantity === undefined ? '' : String(line.quantity),
    unitPrice: line.unitPrice === undefined ? '' : String(line.unitPrice),
    amount: line.quantity !== undefined && line.unitPrice !== undefined ? '' : String(line.amount),
    department: line.department ?? '',
    memberName: line.memberName ?? '',
    grade: line.grade ?? '',
    serviceType: line.serviceType ?? (category === 'external-cost' ? 'external' : 'internal'),
  });
}

function toUpsertLine(line: RevenueLineDraft | CostLineDraft): CrmContractUpsertLine {
  const amount = calculateLineAmount(line);
  const base: CrmContractUpsertLine = {
    id: line.id,
    category: line.category,
    label: line.label.trim(),
    quantity: optionalNumber(line.quantity),
    unitPrice: optionalNumber(line.unitPrice),
    amount,
    department: line.department.trim() || undefined,
    memberName: line.memberName.trim() || undefined,
    grade: line.grade.trim() || undefined,
    serviceType: line.category === 'product' ? undefined : line.serviceType,
  };

  if ('marginRate' in line) {
    base.marginRate = optionalNumber(line.marginRate);
    base.truncUnit = optionalNumber(line.truncUnit);
  }

  return base;
}

export function ContractUpsertPanel({
  selected,
  accessToken,
  canWrite,
  onSaved,
  onDeleted,
  variant = 'workspace',
  canConfirm = false,
  onWorkflow,
  workflowPending = false,
  onCancel,
}: ContractUpsertPanelProps) {
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [header, setHeader] = useState<ContractHeaderDraft>(() => createBlankHeader());
  const [revenueLines, setRevenueLines] = useState<RevenueLineDraft[]>(() => [createBlankRevenueLine()]);
  const [costLines, setCostLines] = useState<CostLineDraft[]>(() => [createBlankCostLine()]);
  const [billingLines, setBillingLines] = useState<BillingLineDraft[]>([]);
  const [splitOptions, setSplitOptions] = useState<SplitOptions>({
    target: 'both',
    periodMonths: '1',
    truncUnit: '1000',
    includeLastMonth: true,
  });
  const [splitPreview, setSplitPreview] = useState<CrmBillingSplitPreviewResponse | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [ownerLookupItems, setOwnerLookupItems] = useState<CrmOpportunityOwnerLookupItem[]>([]);
  const [ownerLookupError, setOwnerLookupError] = useState<string | null>(null);
  const [isOwnerLookupLoading, setIsOwnerLookupLoading] = useState(false);

  useEffect(() => {
    if (!accessToken || !canWrite) {
      setOwnerLookupItems([]);
      setOwnerLookupError(null);
      return;
    }

    const abortController = new AbortController();
    setIsOwnerLookupLoading(true);
    setOwnerLookupError(null);
    void fetch('/api/crm/opportunities/owners/lookup?limit=50', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: abortController.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmOpportunityOwnerLookupItem[]> | BackendErrorResponse | null;
        if (!response.ok || !payload || payload.success !== true) {
          throw new Error(getBackendErrorMessage(payload));
        }
        setOwnerLookupItems(payload.data);
      })
      .catch((error: unknown) => {
        if (!abortController.signal.aborted) {
          setOwnerLookupError(error instanceof Error ? error.message : '담당 사용자 목록을 불러오지 못했습니다.');
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsOwnerLookupLoading(false);
        }
      });

    return () => abortController.abort();
  }, [accessToken, canWrite]);

  const totals = useMemo(() => {
    const revenueSubtotal = revenueLines.reduce((sum, line) => sum + calculateLineAmount(line), 0);
    const specialDiscountAmount = calculateDiscountAmount(revenueSubtotal, header.specialDiscountType, header.specialDiscountValue);
    const revenueTotal = Math.max(revenueSubtotal - specialDiscountAmount, 0);
    const costTotal = costLines.reduce((sum, line) => sum + calculateLineAmount(line), 0);
    const externalCostTotal = costLines.reduce((sum, line) => {
      if (line.category === 'product' || line.category === 'external-cost' || line.serviceType === 'external') {
        return sum + calculateLineAmount(line);
      }
      return sum;
    }, 0);
    const billingRevenueTotal = billingLines.reduce((sum, line) => sum + parseNumber(line.revenueAmount), 0);
    const billingExternalCostTotal = billingLines.reduce((sum, line) => sum + parseNumber(line.externalCostAmount), 0);
    const marginTotal = revenueTotal - costTotal;

    return {
      revenueSubtotal,
      specialDiscountAmount,
      revenueTotal,
      costTotal,
      externalCostTotal,
      billingRevenueTotal,
      billingExternalCostTotal,
      revenueDelta: billingRevenueTotal - revenueTotal,
      externalCostDelta: billingExternalCostTotal - externalCostTotal,
      marginRate: revenueTotal > 0 ? Math.round((marginTotal / revenueTotal) * 10000) / 100 : 0,
    };
  }, [billingLines, costLines, header.specialDiscountType, header.specialDiscountValue, revenueLines]);

  const loadSelected = useCallback(() => {
    if (!selected) {
      return;
    }

    setMode('edit');
    setEditingId(selected.id);
    setHeader(createHeaderFromContract(selected));
    setRevenueLines(selected.revenueLines.length > 0 ? selected.revenueLines.map(createRevenueLineFromContractLine) : [createBlankRevenueLine()]);
    setCostLines(selected.costLines.length > 0 ? selected.costLines.map(createCostLineFromContractLine) : [createBlankCostLine()]);
    setBillingLines(selected.billingPlan.map((line) => createBlankBillingLine({
      id: line.id,
      billingYm: line.billingYm,
      revenueAmount: String(line.revenueAmount),
      externalCostAmount: String(line.externalCostAmount),
    })));
    setSplitPreview(null);
    setFormError(null);
    setFormMessage(null);
  }, [selected]);

  useEffect(() => {
    if (selected && mode === 'edit' && editingId === selected.id) {
      loadSelected();
    }
  }, [editingId, loadSelected, mode, selected]);

  useEffect(() => {
    if (variant === 'source' && selected && editingId !== selected.id) {
      loadSelected();
    }
  }, [editingId, loadSelected, selected, variant]);

  const resetCreate = useCallback(() => {
    setMode('create');
    setEditingId(null);
    setHeader(createBlankHeader());
    setRevenueLines([createBlankRevenueLine()]);
    setCostLines([createBlankCostLine()]);
    setBillingLines([]);
    setSplitPreview(null);
    setFormError(null);
    setFormMessage(null);
  }, []);

  const setHeaderField = useCallback(<K extends keyof ContractHeaderDraft>(key: K, value: ContractHeaderDraft[K]) => {
    setHeader((current) => ({ ...current, [key]: value }));
    setFormError(null);
    setFormMessage(null);
  }, []);

  const setOwnerUserId = useCallback((ownerUserId: string) => {
    const owner = ownerLookupItems.find((item) => item.userId === ownerUserId);
    setHeader((current) => ({
      ...current,
      ownerUserId,
      ownerName: owner ? (owner.displayName?.trim() || owner.userName) : current.ownerName,
    }));
    setFormError(null);
    setFormMessage(null);
  }, [ownerLookupItems]);

  const updateRevenueLine = useCallback((id: string, patch: Partial<RevenueLineDraft>) => {
    setRevenueLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
    setFormError(null);
    setFormMessage(null);
  }, []);

  const updateCostLine = useCallback((id: string, patch: Partial<CostLineDraft>) => {
    setCostLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
    setFormError(null);
    setFormMessage(null);
  }, []);

  const updateBillingLine = useCallback((id: string, patch: Partial<BillingLineDraft>) => {
    setBillingLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
    setFormError(null);
    setFormMessage(null);
  }, []);

  const validateForm = useCallback(() => {
    if (!accessToken) {
      return '로그인 세션을 확인해 주세요.';
    }
    if (mode === 'edit' && selected?.confirmed) {
      return '확정된 계약은 수정할 수 없습니다. 확정 해제 후 수정해 주세요.';
    }
    if (!header.customerName.trim() || !header.contractName.trim()) {
      return '고객사명과 계약명은 필수입니다.';
    }
    if (!header.ownerName.trim()) {
      return '담당자명은 필수입니다.';
    }
    if (!header.businessType.trim() || !header.industryLine.trim()) {
      return '사업구분과 계열/산업 구분은 필수입니다.';
    }
    if (!header.contractStartDate || !header.contractEndDate) {
      return '계약 시작일과 종료일은 필수입니다.';
    }
    if (new Date(header.contractEndDate).getTime() < new Date(header.contractStartDate).getTime()) {
      return '계약 종료일은 시작일 이후여야 합니다.';
    }

    const normalizedRevenueLines = revenueLines
      .filter((line) => line.label.trim() || calculateLineAmount(line) > 0);
    if (normalizedRevenueLines.length === 0) {
      return '매출 라인을 1건 이상 입력해 주세요.';
    }
    if (normalizedRevenueLines.some((line) => !line.label.trim() || calculateLineAmount(line) <= 0)) {
      return '매출 라인은 항목명과 금액이 모두 필요합니다.';
    }
    const invalidCostLine = costLines
      .filter((line) => line.label.trim() || calculateLineAmount(line) > 0)
      .some((line) => !line.label.trim() || calculateLineAmount(line) <= 0);
    if (invalidCostLine) {
      return '원가 라인은 항목명과 금액이 모두 필요합니다.';
    }

    const activeBillingLines = billingLines
      .filter((line) => line.billingYm.trim() || parseNumber(line.revenueAmount) > 0 || parseNumber(line.externalCostAmount) > 0);
    const seenBillingYm = new Set<string>();
    for (const line of activeBillingLines) {
      if (!/^\d{4}\/(0[1-9]|1[0-2])$/.test(line.billingYm)) {
        return '청구 예정월은 YYYY/MM 형식이어야 합니다.';
      }
      if (seenBillingYm.has(line.billingYm)) {
        return `청구 예정월이 중복되었습니다: ${line.billingYm}`;
      }
      seenBillingYm.add(line.billingYm);
    }
    if (activeBillingLines.length > 0 && (totals.revenueDelta !== 0 || totals.externalCostDelta !== 0)) {
      return `청구계획 합계가 계약금액과 일치하지 않습니다. 매출 차이 ${formatWon(Math.abs(totals.revenueDelta))}, 외부원가 차이 ${formatWon(Math.abs(totals.externalCostDelta))}`;
    }

    return null;
  }, [accessToken, billingLines, costLines, header, mode, revenueLines, selected?.confirmed, totals.externalCostDelta, totals.revenueDelta]);

  const buildPayload = useCallback((): CrmContractUpsertRequest => {
    return {
      sourceOpportunityCode: header.sourceOpportunityCode.trim() || undefined,
      customerName: header.customerName.trim(),
      contractName: header.contractName.trim(),
      ownerName: header.ownerName.trim(),
      clientContactName: header.clientContactName.trim() || undefined,
      ownerUserId: header.ownerUserId || undefined,
      businessType: header.businessType.trim(),
      industryLine: header.industryLine.trim(),
      region: header.region,
      status: header.status,
      contractStartDate: header.contractStartDate,
      contractEndDate: header.contractEndDate,
      wbsCode: header.wbsCode.trim() || undefined,
      paymentTermCode: header.paymentTermCode.trim() || undefined,
      specialDiscountType: header.specialDiscountType,
      specialDiscountValue: optionalNumber(header.specialDiscountValue),
      revenueLines: revenueLines
        .filter((line) => line.label.trim() || calculateLineAmount(line) > 0)
        .map(toUpsertLine),
      costLines: costLines
        .filter((line) => line.label.trim() || calculateLineAmount(line) > 0)
        .map(toUpsertLine),
      billingPlan: billingLines
        .filter((line) => line.billingYm.trim() || parseNumber(line.revenueAmount) > 0 || parseNumber(line.externalCostAmount) > 0)
        .map((line) => ({
          billingYm: line.billingYm,
          revenueAmount: parseNumber(line.revenueAmount),
          externalCostAmount: parseNumber(line.externalCostAmount),
        })),
      nextAction: header.nextAction.trim() || undefined,
    };
  }, [billingLines, costLines, header, revenueLines]);

  const previewSplit = useCallback(async () => {
    const baseError = !accessToken
      ? '로그인 세션을 확인해 주세요.'
      : !header.contractStartDate || !header.contractEndDate
        ? '계약 시작일과 종료일을 먼저 입력해 주세요.'
        : null;
    if (baseError) {
      setFormError(baseError);
      return;
    }

    setIsPreviewLoading(true);
    setFormError(null);
    setFormMessage(null);
    try {
      const response = await fetch('/api/crm/contracts/billing-split-preview', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: header.contractStartDate,
          endDate: header.contractEndDate,
          totalRevenue: totals.revenueTotal,
          totalExternalCost: totals.externalCostTotal,
          target: splitOptions.target,
          periodMonths: optionalNumber(splitOptions.periodMonths) ?? 1,
          truncUnit: optionalNumber(splitOptions.truncUnit) ?? 1,
          includeLastMonth: splitOptions.includeLastMonth,
        }),
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmBillingSplitPreviewResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw new Error(getBackendErrorMessage(payload));
      }
      setSplitPreview(payload.data);
    } catch (error) {
      setSplitPreview(null);
      setFormError(error instanceof Error ? error.message : '청구계획 자동분할 미리보기에 실패했습니다.');
    } finally {
      setIsPreviewLoading(false);
    }
  }, [accessToken, header.contractEndDate, header.contractStartDate, splitOptions, totals.externalCostTotal, totals.revenueTotal]);

  const applySplitPreview = useCallback(() => {
    if (!splitPreview) {
      return;
    }
    setBillingLines(splitPreview.lines.map((line) => createBlankBillingLine({
      billingYm: line.billingYm,
      revenueAmount: line.revenueAmount > 0 ? String(line.revenueAmount) : '',
      externalCostAmount: line.externalCostAmount > 0 ? String(line.externalCostAmount) : '',
    })));
    setFormError(null);
    setFormMessage(`${splitPreview.lines.length}건의 청구계획을 적용했습니다.`);
  }, [splitPreview]);

  const saveContract = useCallback(async () => {
    const validationMessage = validateForm();
    if (validationMessage) {
      setFormError(validationMessage);
      setFormMessage(null);
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setFormMessage(null);
    try {
      const payload = buildPayload();
      const endpoint = mode === 'edit' && editingId
        ? `/api/crm/contracts/${encodeURIComponent(editingId)}`
        : '/api/crm/contracts';
      const response = await fetch(endpoint, {
        method: mode === 'edit' && editingId ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const responseBody = await response.json().catch(() => null) as BackendSuccessResponse<CrmContract> | BackendErrorResponse | null;
      if (!response.ok || responseBody?.success !== true) {
        throw new Error(getBackendErrorMessage(responseBody));
      }
      setMode('edit');
      setEditingId(responseBody.data.id);
      setFormMessage('계약이 저장되었습니다.');
      await onSaved(responseBody.data);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '계약 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [accessToken, buildPayload, editingId, mode, onSaved, validateForm]);

  const deleteContract = useCallback(async () => {
    if (!accessToken || mode !== 'edit' || !editingId) {
      setFormError('삭제할 계약을 먼저 불러와 주세요.');
      return;
    }
    if (selected?.confirmed) {
      setFormError('확정된 계약은 삭제할 수 없습니다. 확정 해제 후 삭제해 주세요.');
      return;
    }
    if (!window.confirm('이 계약을 삭제하시겠습니까?')) {
      return;
    }

    setIsDeleting(true);
    setFormError(null);
    setFormMessage(null);
    try {
      const response = await fetch(`/api/crm/contracts/${encodeURIComponent(editingId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const responseBody = await response.json().catch(() => null) as BackendSuccessResponse<{ id: string; deleted: true }> | BackendErrorResponse | null;
      if (!response.ok || responseBody?.success !== true) {
        throw new Error(getBackendErrorMessage(responseBody));
      }
      const deletedId = editingId;
      resetCreate();
      await onDeleted(deletedId);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '계약 삭제에 실패했습니다.');
    } finally {
      setIsDeleting(false);
    }
  }, [accessToken, editingId, mode, onDeleted, resetCreate, selected?.confirmed]);

  const isReadOnly = !canWrite || (mode === 'edit' && selected?.id === editingId && selected.confirmed);

  if (variant === 'source') {
    const productRevenueLines = revenueLines.filter((line) => line.category === 'product');
    const serviceRevenueLines = revenueLines.filter((line) => line.category === 'service');
    const productCostLines = costLines.filter((line) => line.category === 'product');
    const internalCostLines = costLines.filter((line) => line.category === 'internal-cost');
    const externalCostLines = costLines.filter((line) => line.category === 'external-cost');
    const sumLines = (lines: Array<RevenueLineDraft | CostLineDraft>) => lines.reduce((sum, line) => sum + calculateLineAmount(line), 0);

    return (
      <section>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{mode === 'edit' ? '계약 조회' : '계약 등록'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {selected?.confirmed ? '확정된 계약입니다. 확정취소 후 수정할 수 있습니다.' : '계약 기본정보와 금액·청구계획을 입력합니다.'}
          </p>
        </div>

        <div className="mt-6 rounded-xl border bg-card p-6">
          {isReadOnly ? (
            <div className="mb-5 flex items-center gap-2 rounded-md bg-ssoo-warning-bg px-4 py-3 text-sm text-ssoo-warning">
              <AlertCircle className="h-4 w-4" />
              {canWrite ? '확정된 계약입니다. 수정하려면 먼저 확정취소를 진행하세요.' : '계약 등록·수정 권한이 없어 조회 전용으로 표시합니다.'}
            </div>
          ) : null}
          {formError ? (
            <div className="mb-5 flex items-center gap-2 rounded-md bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger" role="alert">
              <AlertCircle className="h-4 w-4" />{formError}
            </div>
          ) : null}
          {formMessage ? (
            <div className="mb-5 flex items-center gap-2 rounded-md bg-ssoo-success-bg px-4 py-3 text-sm text-ssoo-success" role="status">
              <CheckCircle2 className="h-4 w-4" />{formMessage}
            </div>
          ) : null}

          <SourceHeaderFields
            header={header}
            isReadOnly={isReadOnly}
            ownerLookupItems={ownerLookupItems}
            ownerLookupError={ownerLookupError}
            isOwnerLookupLoading={isOwnerLookupLoading}
            onChange={setHeaderField}
            onOwnerUserIdChange={setOwnerUserId}
          />

          <div className="my-6 border-t" />
          <div className="space-y-4">
            <SourceLineSummary
              title="매출액 *"
              actions={[
                { label: `상품매출 ${productRevenueLines.length} · ${formatSourceCompactWon(sumLines(productRevenueLines))}`, onClick: () => setRevenueLines((current) => [...current, createBlankRevenueLine({ category: 'product' })]) },
                { label: `용역매출 ${serviceRevenueLines.length} · ${formatSourceCompactWon(sumLines(serviceRevenueLines))}`, onClick: () => setRevenueLines((current) => [...current, createBlankRevenueLine({ category: 'service' })]) },
              ]}
              disabled={isReadOnly}
            />
            <RevenueLineEditor lines={revenueLines} isReadOnly={isReadOnly} onAdd={() => setRevenueLines((current) => [...current, createBlankRevenueLine()])} onRemove={(id) => setRevenueLines((current) => current.filter((line) => line.id !== id))} onUpdate={updateRevenueLine} sourceCompatible />

            <SourceLineSummary
              title="원가"
              actions={[
                { label: `상품원가 ${productCostLines.length} · ${formatSourceCompactWon(sumLines(productCostLines))}`, onClick: () => setCostLines((current) => [...current, createBlankCostLine({ category: 'product' })]) },
                { label: `내부용역원가 ${internalCostLines.length} · ${formatSourceCompactWon(sumLines(internalCostLines))}`, onClick: () => setCostLines((current) => [...current, createBlankCostLine({ category: 'internal-cost', serviceType: 'internal' })]) },
                { label: `외부용역원가 ${externalCostLines.length}${externalCostLines.length ? ` · ${formatSourceCompactWon(sumLines(externalCostLines))}` : ''}`, onClick: () => setCostLines((current) => [...current, createBlankCostLine({ category: 'external-cost', serviceType: 'external' })]) },
              ]}
              disabled={isReadOnly}
            />
            <CostLineEditor lines={costLines} isReadOnly={isReadOnly} onAdd={() => setCostLines((current) => [...current, createBlankCostLine()])} onRemove={(id) => setCostLines((current) => current.filter((line) => line.id !== id))} onUpdate={updateCostLine} sourceCompatible />

            <BillingLineEditor lines={billingLines} isReadOnly={isReadOnly} onAdd={() => setBillingLines((current) => [...current, createBlankBillingLine()])} onRemove={(id) => setBillingLines((current) => current.filter((line) => line.id !== id))} onUpdate={updateBillingLine} sourceCompatible />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
            <div className="text-sm text-muted-foreground">최종 매출 {formatWon(totals.revenueTotal)} · 원가 {formatWon(totals.costTotal)} · 이익률 {totals.marginRate}%</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" type="button" onClick={() => void previewSplit()} disabled={isPreviewLoading || isReadOnly}>
                자동스플릿
              </Button>
              <Button variant="outline" type="button" onClick={onCancel ?? resetCreate}>취소</Button>
              {selected?.confirmed ? (
                <Button variant="outline" type="button" onClick={() => onWorkflow?.('reopen')} disabled={!canConfirm || workflowPending}>✕ 확정취소</Button>
              ) : mode === 'edit' ? (
                <Button variant="outline" type="button" onClick={() => onWorkflow?.('confirm')} disabled={!canConfirm || workflowPending}>확정</Button>
              ) : null}
              {!isReadOnly ? (
                <Button type="button" onClick={() => void saveContract()} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />{isSaving ? '저장 중' : '저장'}
                </Button>
              ) : null}
              {mode === 'edit' && !isReadOnly ? (
                <Button variant="outline" type="button" onClick={() => void deleteContract()} disabled={isDeleting}>{isDeleting ? '삭제 중' : '삭제'}</Button>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-md border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{mode === 'edit' ? '계약 수정' : '계약 등록'}</h2>
          <p className="mt-1 text-sm text-muted-foreground">계약 기본정보, 매출/원가 라인, 청구계획을 한 번에 저장합니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" type="button" onClick={resetCreate}>
            <FilePlus2 className="mr-2 h-4 w-4" />
            신규
          </Button>
          <Button variant="outline" size="sm" type="button" onClick={loadSelected} disabled={!selected}>
            <PencilLine className="mr-2 h-4 w-4" />
            선택 계약 불러오기
          </Button>
          <Button size="sm" type="button" onClick={() => void saveContract()} disabled={isSaving || isReadOnly}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? '저장 중' : '저장'}
          </Button>
          <Button variant="outline" size="sm" type="button" onClick={() => void deleteContract()} disabled={mode !== 'edit' || isReadOnly || isDeleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? '삭제 중' : '삭제'}
          </Button>
        </div>
      </div>

      {isReadOnly ? (
        <div className="flex items-center gap-2 border-b bg-ssoo-warning-bg px-4 py-3 text-sm text-ssoo-warning">
          <AlertCircle className="h-4 w-4" />
          {canWrite ? '확정된 계약입니다. 수정하려면 먼저 확정 해제를 진행하세요.' : '계약 등록·수정 권한이 없어 조회 전용으로 표시합니다.'}
        </div>
      ) : null}

      {formError ? (
        <div className="flex items-center gap-2 border-b bg-ssoo-danger-bg px-4 py-3 text-sm text-ssoo-danger">
          <AlertCircle className="h-4 w-4" />
          {formError}
        </div>
      ) : null}
      {formMessage ? (
        <div className="flex items-center gap-2 border-b bg-ssoo-success-bg px-4 py-3 text-sm text-ssoo-success">
          <CheckCircle2 className="h-4 w-4" />
          {formMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <HeaderFields
            header={header}
            isReadOnly={isReadOnly}
            ownerLookupItems={ownerLookupItems}
            ownerLookupError={ownerLookupError}
            isOwnerLookupLoading={isOwnerLookupLoading}
            onChange={setHeaderField}
            onOwnerUserIdChange={setOwnerUserId}
          />
          <RevenueLineEditor lines={revenueLines} isReadOnly={isReadOnly} onAdd={() => setRevenueLines((current) => [...current, createBlankRevenueLine()])} onRemove={(id) => setRevenueLines((current) => current.filter((line) => line.id !== id))} onUpdate={updateRevenueLine} />
          <CostLineEditor lines={costLines} isReadOnly={isReadOnly} onAdd={() => setCostLines((current) => [...current, createBlankCostLine()])} onRemove={(id) => setCostLines((current) => current.filter((line) => line.id !== id))} onUpdate={updateCostLine} />
          <BillingLineEditor lines={billingLines} isReadOnly={isReadOnly} onAdd={() => setBillingLines((current) => [...current, createBlankBillingLine()])} onRemove={(id) => setBillingLines((current) => current.filter((line) => line.id !== id))} onUpdate={updateBillingLine} />
        </div>

        <aside className="space-y-4">
          <TotalsPanel totals={totals} billingCount={billingLines.length} />
          <SplitPanel
            options={splitOptions}
            preview={splitPreview}
            isLoading={isPreviewLoading}
            isReadOnly={isReadOnly}
            onOptionsChange={setSplitOptions}
            onPreview={() => void previewSplit()}
            onApply={applySplitPreview}
          />
        </aside>
      </div>
    </section>
  );
}

function HeaderFields({
  header,
  isReadOnly,
  ownerLookupItems,
  ownerLookupError,
  isOwnerLookupLoading,
  onChange,
  onOwnerUserIdChange,
}: {
  header: ContractHeaderDraft;
  isReadOnly: boolean;
  ownerLookupItems: CrmOpportunityOwnerLookupItem[];
  ownerLookupError: string | null;
  isOwnerLookupLoading: boolean;
  onChange: <K extends keyof ContractHeaderDraft>(key: K, value: ContractHeaderDraft[K]) => void;
  onOwnerUserIdChange: (ownerUserId: string) => void;
}) {
  const commonCodes = useCrmCommonCodeOptions(['biz_type', 'group_type', 'payment_term']);
  const businessTypeOptions = withCurrentCodeOption(commonCodes.options.biz_type ?? [], header.businessType);
  const groupTypeOptions = withCurrentCodeOption(commonCodes.options.group_type ?? [], header.industryLine);
  const paymentOptions = withCurrentCodeOption(commonCodes.options.payment_term ?? [], header.paymentTermCode);
  return (
    <div className="rounded-md border p-4">
      <h3 className="text-sm font-semibold text-foreground">기본 정보</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="고객사명">
          <Input value={header.customerName} disabled={isReadOnly} onChange={(event) => onChange('customerName', event.currentTarget.value)} />
        </Field>
        <Field label="계약명">
          <Input value={header.contractName} disabled={isReadOnly} onChange={(event) => onChange('contractName', event.currentTarget.value)} />
        </Field>
        <Field label="담당자">
          <Input value={header.ownerName} disabled={isReadOnly} onChange={(event) => onChange('ownerName', event.currentTarget.value)} />
        </Field>
        <Field label="담당 사용자">
          <NativeSelect
            value={header.ownerUserId}
            disabled={isReadOnly || isOwnerLookupLoading}
            data-testid="contract-owner-user"
            onChange={(event) => onOwnerUserIdChange(event.currentTarget.value)}
          >
            <option value="">연결 안 함</option>
            {header.ownerUserId && !ownerLookupItems.some((item) => item.userId === header.ownerUserId) ? (
              <option value={header.ownerUserId}>{header.ownerName || `사용자 #${header.ownerUserId}`} · #{header.ownerUserId}</option>
            ) : null}
            {ownerLookupItems.map((item) => (
              <option key={item.userId} value={item.userId}>
                {item.displayName?.trim() || item.userName} · #{item.userId}
              </option>
            ))}
          </NativeSelect>
          {ownerLookupError ? <span className="text-xs text-destructive">{ownerLookupError}</span> : null}
        </Field>
        <Field label="고객사 계약 담당자">
          <Input value={header.clientContactName} disabled={isReadOnly} onChange={(event) => onChange('clientContactName', event.currentTarget.value)} />
        </Field>
        <Field label="원천 영업기회">
          <Input value={header.sourceOpportunityCode} disabled={isReadOnly} placeholder="crm-opp-..." onChange={(event) => onChange('sourceOpportunityCode', event.currentTarget.value)} />
        </Field>
        <Field label="사업구분">
          {businessTypeOptions.length ? <NativeSelect value={header.businessType} disabled={isReadOnly} onChange={(event) => onChange('businessType', event.currentTarget.value)} data-testid="contract-business-type-code"><option value="">선택</option>{businessTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</NativeSelect>
            : <Input value={header.businessType} disabled={isReadOnly} onChange={(event) => onChange('businessType', event.currentTarget.value)} />}
        </Field>
        <Field label="계열/산업">
          {groupTypeOptions.length ? <NativeSelect value={header.industryLine} disabled={isReadOnly} onChange={(event) => onChange('industryLine', event.currentTarget.value)} data-testid="contract-group-type-code"><option value="">선택</option>{groupTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</NativeSelect>
            : <Input value={header.industryLine} disabled={isReadOnly} onChange={(event) => onChange('industryLine', event.currentTarget.value)} />}
        </Field>
        <Field label="국내/해외">
          <NativeSelect value={header.region} disabled={isReadOnly} onChange={(event) => onChange('region', event.currentTarget.value as ContractHeaderDraft['region'])}>
            <option value="domestic">국내</option>
            <option value="overseas">해외</option>
          </NativeSelect>
        </Field>
        <Field label="상태">
          <NativeSelect value={header.status} disabled={isReadOnly} onChange={(event) => onChange('status', event.currentTarget.value as CrmContractStatus)}>
            <option value="review">검토</option>
            <option value="active">계약중</option>
            <option value="completed">계약완료</option>
            <option value="terminated">해지</option>
          </NativeSelect>
        </Field>
        <Field label="시작일">
          <Input type="date" value={header.contractStartDate} disabled={isReadOnly} onChange={(event) => onChange('contractStartDate', event.currentTarget.value)} />
        </Field>
        <Field label="종료일">
          <Input type="date" value={header.contractEndDate} disabled={isReadOnly} onChange={(event) => onChange('contractEndDate', event.currentTarget.value)} />
        </Field>
        <Field label="WBS">
          <Input value={header.wbsCode} disabled={isReadOnly} onChange={(event) => onChange('wbsCode', event.currentTarget.value)} />
        </Field>
        <Field label="수금조건">
          {paymentOptions.length ? <NativeSelect value={header.paymentTermCode} disabled={isReadOnly} onChange={(event) => onChange('paymentTermCode', event.currentTarget.value)} data-testid="contract-payment-term-code"><option value="">선택</option>{paymentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</NativeSelect>
            : <Input value={header.paymentTermCode} disabled={isReadOnly} placeholder="NET30" onChange={(event) => onChange('paymentTermCode', event.currentTarget.value)} />}
        </Field>
        <Field label="Special DC 유형">
          <NativeSelect value={header.specialDiscountType} disabled={isReadOnly} onChange={(event) => onChange('specialDiscountType', event.currentTarget.value as CrmOpportunityDiscountType)}>
            <option value="amount">금액</option>
            <option value="rate">율</option>
          </NativeSelect>
        </Field>
        <Field label={header.specialDiscountType === 'rate' ? 'Special DC (%)' : 'Special DC 금액'}>
          <Input value={header.specialDiscountValue} disabled={isReadOnly} onChange={(event) => onChange('specialDiscountValue', normalizeNumericText(event.currentTarget.value, header.specialDiscountType === 'rate'))} />
        </Field>
        <div className="md:col-span-2">
          <Field label="다음 행동">
            <Textarea value={header.nextAction} disabled={isReadOnly} onChange={(event) => onChange('nextAction', event.currentTarget.value)} />
          </Field>
        </div>
      </div>
    </div>
  );
}

function SourceHeaderFields({
  header,
  isReadOnly,
  ownerLookupItems,
  ownerLookupError,
  isOwnerLookupLoading,
  onChange,
  onOwnerUserIdChange,
}: {
  header: ContractHeaderDraft;
  isReadOnly: boolean;
  ownerLookupItems: CrmOpportunityOwnerLookupItem[];
  ownerLookupError: string | null;
  isOwnerLookupLoading: boolean;
  onChange: <K extends keyof ContractHeaderDraft>(key: K, value: ContractHeaderDraft[K]) => void;
  onOwnerUserIdChange: (ownerUserId: string) => void;
}) {
  const commonCodes = useCrmCommonCodeOptions(['biz_type', 'group_type', 'payment_term']);
  const businessTypeOptions = withCurrentCodeOption(commonCodes.options.biz_type ?? [], header.businessType);
  const groupTypeOptions = withCurrentCodeOption(commonCodes.options.group_type ?? [], header.industryLine);
  const paymentOptions = withCurrentCodeOption(commonCodes.options.payment_term ?? [], header.paymentTermCode);
  return (
    <div className="space-y-4">
      <SourceField label="고객명 *" htmlFor="ct-customer"><Input id="ct-customer" value={header.customerName} placeholder="고객사명 입력" disabled={isReadOnly} onChange={(event) => onChange('customerName', event.currentTarget.value)} /></SourceField>
      <SourceField label="고객사 담당자" htmlFor="ct-client-contact"><Input id="ct-client-contact" value={header.clientContactName} placeholder="고객사 담당자명 입력" disabled={isReadOnly} onChange={(event) => onChange('clientContactName', event.currentTarget.value)} /></SourceField>
      <SourceField label="계약명 *" htmlFor="ct-name"><Input id="ct-name" value={header.contractName} placeholder="계약명 입력" disabled={isReadOnly} onChange={(event) => onChange('contractName', event.currentTarget.value)} /></SourceField>
      <SourceField label="영업담당자 *" htmlFor="ct-owner">
        <div className="flex gap-2">
          <NativeSelect id="ct-owner" className="min-w-0 flex-1" value={header.ownerUserId} disabled={isReadOnly || isOwnerLookupLoading} onChange={(event) => onOwnerUserIdChange(event.currentTarget.value)}>
            <option value="">{header.ownerName || '담당자를 선택하세요'}</option>
            {header.ownerUserId && !ownerLookupItems.some((item) => item.userId === header.ownerUserId) ? <option value={header.ownerUserId}>{header.ownerName} · #{header.ownerUserId}</option> : null}
            {ownerLookupItems.map((item) => <option key={item.userId} value={item.userId}>{item.displayName?.trim() || item.userName} · #{item.userId}</option>)}
          </NativeSelect>
          <Button variant="outline" type="button" disabled={isReadOnly} onClick={() => document.getElementById('ct-owner')?.focus()}>도움창</Button>
        </div>
        {ownerLookupError ? <span className="text-xs text-destructive">{ownerLookupError}</span> : null}
      </SourceField>
      <SourceField label="상태" htmlFor="ct-status">
        <NativeSelect id="ct-status" value={header.status} disabled={isReadOnly} onChange={(event) => onChange('status', event.currentTarget.value as CrmContractStatus)}>
          <option value="review">검토</option><option value="active">계약중</option><option value="completed">계약완료</option><option value="terminated">해지</option>
        </NativeSelect>
      </SourceField>
      <SourceField label="수금조건" htmlFor="ct-payment">
        <NativeSelect id="ct-payment" value={header.paymentTermCode} disabled={isReadOnly} onChange={(event) => onChange('paymentTermCode', event.currentTarget.value)}>
          <option value="">선택</option>{paymentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </NativeSelect>
      </SourceField>
      <SourceField label="WBS 코드" htmlFor="ct-wbs"><Input id="ct-wbs" value={header.wbsCode} placeholder="WBS 코드 입력 (선택)" disabled={isReadOnly} onChange={(event) => onChange('wbsCode', event.currentTarget.value)} /></SourceField>
      <SourceField label="사업구분 *" htmlFor="ct-biz-type">
        <NativeSelect id="ct-biz-type" value={header.businessType} disabled={isReadOnly} onChange={(event) => onChange('businessType', event.currentTarget.value)}>
          <option value="">선택</option>{businessTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </NativeSelect>
      </SourceField>
      <SourceField label="계열구분" htmlFor="ct-group-type">
        <NativeSelect id="ct-group-type" value={header.industryLine} disabled={isReadOnly} onChange={(event) => onChange('industryLine', event.currentTarget.value)}>
          <option value="">선택</option>{groupTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </NativeSelect>
      </SourceField>
      <SourceField label="국내/해외" htmlFor="ct-domestic">
        <NativeSelect id="ct-domestic" value={header.region} disabled={isReadOnly} onChange={(event) => onChange('region', event.currentTarget.value as ContractHeaderDraft['region'])}>
          <option value="domestic">국내</option><option value="overseas">해외</option>
        </NativeSelect>
      </SourceField>
      <fieldset>
        <legend className="text-sm font-medium text-muted-foreground"><label>계약기간</label></legend>
        <div className="mt-1 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <Input id="ct-start" type="date" value={header.contractStartDate} disabled={isReadOnly} onChange={(event) => onChange('contractStartDate', event.currentTarget.value)} />
          <span className="text-center text-muted-foreground">~</span>
          <Input id="ct-end" type="date" value={header.contractEndDate} disabled={isReadOnly} onChange={(event) => onChange('contractEndDate', event.currentTarget.value)} />
        </div>
      </fieldset>
      <div className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)]">
        <NativeSelect id="ct-dc-type" value={header.specialDiscountType} disabled={isReadOnly} onChange={(event) => onChange('specialDiscountType', event.currentTarget.value as CrmOpportunityDiscountType)}>
          <option value="amount">Special DC 금액</option><option value="rate">Special DC 율</option>
        </NativeSelect>
        <Input id="ct-dc-value" value={header.specialDiscountValue} placeholder="0" disabled={isReadOnly} onChange={(event) => onChange('specialDiscountValue', normalizeNumericText(event.currentTarget.value, header.specialDiscountType === 'rate'))} />
      </div>
    </div>
  );
}

function SourceField({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function SourceLineSummary({
  title,
  actions,
  disabled,
}: {
  title: string;
  actions: Array<{ label: string; onClick: () => void }>;
  disabled: boolean;
}) {
  return (
    <div>
      <h2 className="text-sm font-medium text-muted-foreground"><label>{title}</label></h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {actions.map((action) => <Button key={action.label} variant="outline" size="sm" type="button" disabled={disabled} onClick={action.onClick}>{action.label}</Button>)}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-muted-foreground">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function RevenueLineEditor({
  lines,
  isReadOnly,
  onAdd,
  onRemove,
  onUpdate,
  sourceCompatible = false,
}: {
  lines: RevenueLineDraft[];
  isReadOnly: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<RevenueLineDraft>) => void;
  sourceCompatible?: boolean;
}) {
  return (
    <LineSection title="매출 라인" onAdd={onAdd} isReadOnly={isReadOnly} hideHeader={sourceCompatible}>
      <Table className="min-w-[1180px] text-sm">
        <TableHeader className="bg-ssoo-content-bg text-left text-muted-foreground">
          <TableRow>
            <TableHead className="w-[104px] px-2 py-2">구분</TableHead>
            <TableHead className="w-[220px] px-2 py-2">항목</TableHead>
            <TableHead className="w-[92px] px-2 py-2">수량</TableHead>
            <TableHead className="w-[128px] px-2 py-2">단가</TableHead>
            <TableHead className="w-[128px] px-2 py-2">직접금액</TableHead>
            <TableHead className="w-[92px] px-2 py-2">마진율</TableHead>
            <TableHead className="w-[104px] px-2 py-2">절사</TableHead>
            <TableHead className="w-[120px] px-2 py-2">소속</TableHead>
            <TableHead className="w-[120px] px-2 py-2">성명/그룹</TableHead>
            <TableHead className="w-[120px] px-2 py-2 text-right">금액</TableHead>
            <TableHead className="w-[64px] px-2 py-2"><span className="sr-only">삭제</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell className="px-2 py-2">
                <NativeSelect value={line.category} disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { category: event.currentTarget.value as RevenueCategory })}>
                  <option value="product">상품</option>
                  <option value="service">용역</option>
                </NativeSelect>
              </TableCell>
              <TableCell className="px-2 py-2"><Input value={line.label} placeholder="상품명" disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { label: event.currentTarget.value })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.quantity} placeholder="0" disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { quantity: normalizeNumericText(event.currentTarget.value, true) })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.unitPrice} placeholder="0" disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { unitPrice: normalizeNumericText(event.currentTarget.value) })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.amount} placeholder="0" disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { amount: normalizeNumericText(event.currentTarget.value) })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.marginRate} placeholder="0" disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { marginRate: normalizeNumericText(event.currentTarget.value, true) })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.truncUnit} disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { truncUnit: normalizeNumericText(event.currentTarget.value) })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.department} disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { department: event.currentTarget.value })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.memberName} disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { memberName: event.currentTarget.value })} /></TableCell>
              <TableCell className="px-2 py-2 text-right font-medium text-foreground">{formatWon(calculateLineAmount(line))}</TableCell>
              <TableCell className="px-2 py-2">
                <Button variant="ghost" size="icon" type="button" onClick={() => onRemove(line.id)} disabled={isReadOnly || lines.length <= 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </LineSection>
  );
}

function CostLineEditor({
  lines,
  isReadOnly,
  onAdd,
  onRemove,
  onUpdate,
  sourceCompatible = false,
}: {
  lines: CostLineDraft[];
  isReadOnly: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<CostLineDraft>) => void;
  sourceCompatible?: boolean;
}) {
  return (
    <LineSection title="원가 라인" onAdd={onAdd} isReadOnly={isReadOnly} hideHeader={sourceCompatible}>
      <Table className="min-w-[1060px] text-sm">
        <TableHeader className="bg-ssoo-content-bg text-left text-muted-foreground">
          <TableRow>
            <TableHead className="w-[132px] px-2 py-2">구분</TableHead>
            <TableHead className="w-[220px] px-2 py-2">항목</TableHead>
            <TableHead className="w-[92px] px-2 py-2">수량</TableHead>
            <TableHead className="w-[128px] px-2 py-2">단가</TableHead>
            <TableHead className="w-[128px] px-2 py-2">직접금액</TableHead>
            <TableHead className="w-[120px] px-2 py-2">소속</TableHead>
            <TableHead className="w-[120px] px-2 py-2">성명/그룹</TableHead>
            <TableHead className="w-[120px] px-2 py-2 text-right">금액</TableHead>
            <TableHead className="w-[64px] px-2 py-2"><span className="sr-only">삭제</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell className="px-2 py-2">
                <NativeSelect
                  value={line.category}
                  disabled={isReadOnly}
                  onChange={(event) => {
                    const category = event.currentTarget.value as CostCategory;
                    onUpdate(line.id, {
                      category,
                      serviceType: category === 'external-cost' ? 'external' : 'internal',
                    });
                  }}
                >
                  <option value="product">상품원가</option>
                  <option value="internal-cost">내부용역</option>
                  <option value="external-cost">외부용역</option>
                </NativeSelect>
              </TableCell>
              <TableCell className="px-2 py-2"><Input value={line.label} placeholder="상품명" disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { label: event.currentTarget.value })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.quantity} placeholder="0" disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { quantity: normalizeNumericText(event.currentTarget.value, true) })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.unitPrice} placeholder="0" disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { unitPrice: normalizeNumericText(event.currentTarget.value) })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.amount} placeholder="매출단가" disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { amount: normalizeNumericText(event.currentTarget.value) })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.department} disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { department: event.currentTarget.value })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.memberName} disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { memberName: event.currentTarget.value })} /></TableCell>
              <TableCell className="px-2 py-2 text-right font-medium text-foreground">{formatWon(calculateLineAmount(line))}</TableCell>
              <TableCell className="px-2 py-2">
                <Button variant="ghost" size="icon" type="button" onClick={() => onRemove(line.id)} disabled={isReadOnly || lines.length <= 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </LineSection>
  );
}

function BillingLineEditor({
  lines,
  isReadOnly,
  onAdd,
  onRemove,
  onUpdate,
  sourceCompatible = false,
}: {
  lines: BillingLineDraft[];
  isReadOnly: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<BillingLineDraft>) => void;
  sourceCompatible?: boolean;
}) {
  return (
    <LineSection title={sourceCompatible ? '청구계획 (매출액·외부원가 합계가 계약금액과 일치해야 저장됩니다)' : '청구계획'} onAdd={onAdd} isReadOnly={isReadOnly}>
      <Table className="min-w-[680px] text-sm">
        <TableHeader className="bg-ssoo-content-bg text-left text-muted-foreground">
          <TableRow>
            <TableHead className="w-[140px] px-2 py-2">예정월</TableHead>
            <TableHead className="w-[180px] px-2 py-2">매출</TableHead>
            <TableHead className="w-[180px] px-2 py-2">외부원가</TableHead>
            <TableHead className="w-[64px] px-2 py-2"><span className="sr-only">삭제</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.length === 0 ? (
            <TableRow>
              <TableCell className="px-2 py-4 text-center text-muted-foreground" colSpan={4}>청구계획을 추가하거나 자동분할을 적용하세요.</TableCell>
            </TableRow>
          ) : null}
          {lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell className="px-2 py-2"><Input value={line.billingYm} disabled={isReadOnly} placeholder="YYYY/MM" onChange={(event) => onUpdate(line.id, { billingYm: normalizeBillingYm(event.currentTarget.value) })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.revenueAmount} placeholder="0" disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { revenueAmount: normalizeNumericText(event.currentTarget.value) })} /></TableCell>
              <TableCell className="px-2 py-2"><Input value={line.externalCostAmount} placeholder="0" disabled={isReadOnly} onChange={(event) => onUpdate(line.id, { externalCostAmount: normalizeNumericText(event.currentTarget.value) })} /></TableCell>
              <TableCell className="px-2 py-2">
                <Button variant="ghost" size="icon" type="button" onClick={() => onRemove(line.id)} disabled={isReadOnly}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </LineSection>
  );
}

function LineSection({
  title,
  children,
  onAdd,
  isReadOnly,
  hideHeader = false,
}: {
  title: string;
  children: ReactNode;
  onAdd: () => void;
  isReadOnly: boolean;
  hideHeader?: boolean;
}) {
  return (
    <div className="rounded-md border">
      {!hideHeader ? (
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground"><label>{title}</label></h3>
          <Button variant="outline" size="sm" type="button" onClick={onAdd} disabled={isReadOnly}>
            <Plus className="mr-2 h-4 w-4" />
            행 추가
          </Button>
        </div>
      ) : null}
      <div className="overflow-auto">{children}</div>
    </div>
  );
}

function TotalsPanel({
  totals,
  billingCount,
}: {
  totals: {
    revenueSubtotal: number;
    specialDiscountAmount: number;
    revenueTotal: number;
    costTotal: number;
    externalCostTotal: number;
    billingRevenueTotal: number;
    billingExternalCostTotal: number;
    revenueDelta: number;
    externalCostDelta: number;
    marginRate: number;
  };
  billingCount: number;
}) {
  const matched = billingCount > 0 && totals.revenueDelta === 0 && totals.externalCostDelta === 0;
  return (
    <div className="rounded-md border p-4">
      <h3 className="text-sm font-semibold text-foreground">계약 합계</h3>
      <dl className="mt-3 space-y-2 text-sm">
        <TotalRow label="매출 subtotal" value={formatWon(totals.revenueSubtotal)} />
        <TotalRow label="Special DC" value={`-${formatWon(totals.specialDiscountAmount)}`} />
        <TotalRow label="최종 매출" value={formatWon(totals.revenueTotal)} strong />
        <TotalRow label="원가" value={formatWon(totals.costTotal)} />
        <TotalRow label="외부원가" value={formatWon(totals.externalCostTotal)} />
        <TotalRow label="손익률" value={`${totals.marginRate}%`} strong />
      </dl>
      <div className={`mt-4 rounded-md px-3 py-2 text-xs ${matched ? 'bg-ssoo-success-bg text-ssoo-success' : 'bg-ssoo-warning-bg text-ssoo-warning'}`}>
        {billingCount === 0
          ? '청구계획은 저장 전 선택 입력이며, 확정 전에는 1건 이상 필요합니다.'
          : matched
            ? '청구계획 합계가 계약금액과 일치합니다.'
            : `청구계획 차이: 매출 ${formatWon(Math.abs(totals.revenueDelta))}, 외부원가 ${formatWon(Math.abs(totals.externalCostDelta))}`}
      </div>
    </div>
  );
}

function TotalRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? 'font-semibold text-foreground' : 'font-medium text-foreground'}>{value}</dd>
    </div>
  );
}

function SplitPanel({
  options,
  preview,
  isLoading,
  isReadOnly,
  onOptionsChange,
  onPreview,
  onApply,
}: {
  options: SplitOptions;
  preview: CrmBillingSplitPreviewResponse | null;
  isLoading: boolean;
  isReadOnly: boolean;
  onOptionsChange: (options: SplitOptions) => void;
  onPreview: () => void;
  onApply: () => void;
}) {
  return (
    <div className="rounded-md border p-4">
      <h3 className="text-sm font-semibold text-foreground">청구 자동분할</h3>
      <div className="mt-3 grid gap-3">
        <Field label="분할 대상">
          <NativeSelect value={options.target} disabled={isReadOnly} onChange={(event) => onOptionsChange({ ...options, target: event.currentTarget.value as CrmBillingSplitTarget })}>
            <option value="both">매출+외부원가</option>
            <option value="revenue">매출만</option>
            <option value="external-cost">외부원가만</option>
          </NativeSelect>
        </Field>
        <Field label="분할 주기(개월)">
          <Input value={options.periodMonths} disabled={isReadOnly} onChange={(event) => onOptionsChange({ ...options, periodMonths: normalizeNumericText(event.currentTarget.value) })} />
        </Field>
        <Field label="절사 단위">
          <NativeSelect value={options.truncUnit} disabled={isReadOnly} onChange={(event) => onOptionsChange({ ...options, truncUnit: event.currentTarget.value })}>
            <option value="1">절사 없음</option>
            <option value="1000">1,000</option>
            <option value="10000">10,000</option>
            <option value="100000">100,000</option>
          </NativeSelect>
        </Field>
        <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Checkbox checked={options.includeLastMonth} disabled={isReadOnly} onCheckedChange={(checked) => onOptionsChange({ ...options, includeLastMonth: checked === true })} />
          종료월 포함
        </label>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" type="button" onClick={onPreview} disabled={isLoading || isReadOnly}>
            <Wand2 className="mr-2 h-4 w-4" />
            {isLoading ? '계산 중' : '미리보기'}
          </Button>
          <Button size="sm" type="button" onClick={onApply} disabled={!preview || isReadOnly}>
            적용
          </Button>
        </div>
      </div>

      {preview ? (
        <div className="mt-4 overflow-auto rounded-md border">
          <Table className="w-full text-xs">
            <TableHeader className="bg-ssoo-content-bg text-left text-muted-foreground">
              <TableRow>
                <TableHead className="px-2 py-2">예정월</TableHead>
                <TableHead className="px-2 py-2 text-right">매출</TableHead>
                <TableHead className="px-2 py-2 text-right">외부원가</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.lines.map((line) => (
                <TableRow key={line.billingYm}>
                  <TableCell className="px-2 py-2 font-medium text-foreground">{line.billingYm}</TableCell>
                  <TableCell className="px-2 py-2 text-right text-muted-foreground">{formatWon(line.revenueAmount)}</TableCell>
                  <TableCell className="px-2 py-2 text-right text-muted-foreground">{formatWon(line.externalCostAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
