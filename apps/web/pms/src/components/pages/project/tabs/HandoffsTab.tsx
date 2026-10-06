'use client';

import { SsooErrorNotice } from '@ssoo/web-shell';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, CircleAlert, Eye, Handshake, Plus, RefreshCcw, Search, X } from 'lucide-react';
import {
  useCreateProjectHandoff,
  useApplyCrmContractHandoffSnapshot,
  useProjectAccess,
  useProjectContracts,
  useProjectHandoffs,
  useProjectMembers,
  useUpdateProjectHandoff,
} from '@/hooks/queries/useProjects';
import {
  useCrmContractHandoffCandidates,
  useCrmContractPmsHandoffPreview,
} from '@/hooks/queries/useCrmHandoff';
import { useCodesByGroup } from '@/hooks/queries/useCodes';
import { Button } from '@/components/ui/button';
import { SsooSearchInput } from '@ssoo/web-shell';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type {
  Project,
  ProjectContract,
  ProjectHandoff,
  ProjectHandoffTypeCode,
  ProjectPhase,
} from '@/lib/api/endpoints/projects';
import type { CrmContractPmsHandoffCandidate } from '@/lib/api/endpoints/crmHandoff';
import type { CodeItem } from '@/lib/api/endpoints/codes';
import { formatPmsAmount, formatPmsCount, formatPmsDate, formatPmsDateTime } from '@/lib/pms-format';

const NONE_VALUE = '__none__';
const PROJECT_MEMBER_ROLE_GROUP = 'PROJECT_MEMBER_ROLE';

const PHASE_OPTIONS: { value: ProjectPhase; label: string }[] = [
  { value: 'request', label: '요청' },
  { value: 'proposal', label: '제안' },
  { value: 'contract', label: '계약' },
  { value: 'execution', label: '수행' },
  { value: 'operation', label: '운영' },
  { value: 'closed', label: '종료' },
];

const HANDOFF_TYPE_OPTIONS: { value: ProjectHandoffTypeCode; label: string }[] = [
  { value: 'phase_transition', label: '단계 전환' },
  { value: 'reassignment', label: '담당 변경' },
  { value: 'escalation', label: '상위 이관' },
  { value: 'closure', label: '종료 인계' },
];

const STATUS_META: Record<ProjectHandoff['handoffStatusCode'], { label: string; className: string }> = {
  pending: { label: '대기', className: 'bg-ssoo-warning-bg text-ssoo-warning border-ssoo-warning-border' },
  accepted: { label: '수락', className: 'bg-ssoo-success-bg text-ssoo-success border-ssoo-success-border' },
  rejected: { label: '반려', className: 'bg-ssoo-danger-bg text-ssoo-danger border-ssoo-danger-border' },
  cancelled: { label: '취소', className: 'bg-muted text-muted-foreground border-border' },
};

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  draft: '초안',
  negotiating: '협의',
  signed: '체결',
  in_progress: '진행',
  completed: '완료',
  terminated: '종료',
};

const CRM_CONTRACT_STATUS_LABELS: Record<string, string> = {
  review: '검토',
  active: '진행',
  completed: '완료',
  terminated: '종료',
};

const CRM_HANDOFF_STATUS_LABELS: Record<string, string> = {
  planned: '계획',
  'not-implemented': '인계 미구성',
};

interface HandoffFormState {
  toPhaseCode: ProjectPhase;
  handoffTypeCode: ProjectHandoffTypeCode;
  toUserId: string;
  assignedRoleCode: string;
  conditionNote: string;
  memo: string;
}

interface HandoffMemberOption {
  value: string;
  label: string;
  roleCodes: string[];
}

interface ApplySnapshotMessage {
  kind: 'success' | 'error';
  message: string;
}

const createInitialForm = (): HandoffFormState => ({
  toPhaseCode: 'execution',
  handoffTypeCode: 'phase_transition',
  toUserId: NONE_VALUE,
  assignedRoleCode: '',
  conditionNote: '',
  memo: '',
});

function formatPercent(value?: number | null) {
  if (value === undefined || value === null || !Number.isFinite(value)) return '-';
  return `${value.toFixed(1)}%`;
}

function optionLabel<T extends string>(options: { value: T; label: string }[], value?: T | null) {
  return options.find((option) => option.value === value)?.label ?? value ?? '-';
}

function formatKnownUserLabel(memberOptions: HandoffMemberOption[], userId?: string | null) {
  if (!userId) return '-';
  return memberOptions.find((member) => member.value === String(userId))?.label ?? '프로젝트 멤버 외 사용자';
}

function pickPrimaryContract(contracts: ProjectContract[]) {
  return contracts.find((contract) => contract.isPrimary) ?? contracts[0] ?? null;
}

function ContractSnapshot({ contracts }: { contracts: ProjectContract[] }) {
  const primaryContract = pickPrimaryContract(contracts);
  const payments = primaryContract?.payments ?? [];
  const totalScheduledAmount = payments.reduce((sum, payment) => {
    const amount = Number(payment.amount ?? 0);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">계약 스냅샷</h3>
          <p className="text-xs text-muted-foreground">CRM 정본에서 넘어온 실행 참고값이며 PMS에서는 편집하지 않습니다.</p>
        </div>
        <span className="rounded-full border bg-muted px-2 py-1 text-xs text-muted-foreground">
          읽기 전용
        </span>
      </div>

      {!primaryContract ? (
        <div className="rounded-lg border border-dashed bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
          연결된 계약 스냅샷이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">계약명</p>
            <p className="font-medium text-foreground">{primaryContract.title}</p>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">상태</p>
            <p>{CONTRACT_STATUS_LABELS[primaryContract.contractStatusCode] ?? primaryContract.contractStatusCode}</p>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">계약일</p>
            <p>{formatPmsDate(primaryContract.contractDate)}</p>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">계약금액</p>
            <p>{formatPmsAmount(primaryContract.totalAmount, primaryContract.currencyCode)}</p>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">청구유형</p>
            <p>{primaryContract.billingTypeCode || '-'}</p>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">납품방식</p>
            <p>{primaryContract.deliveryMethodCode || '-'}</p>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">대금 일정</p>
            <p>{formatPmsCount(payments.length)}</p>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">대금 합계</p>
            <p>{payments.length ? formatPmsAmount(totalScheduledAmount, primaryContract.currencyCode) : '-'}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function CandidateStatusBadge({ candidate }: { candidate: CrmContractPmsHandoffCandidate }) {
  const isReady = candidate.readiness === 'ready';

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
      isReady
        ? 'border-ssoo-success-border bg-ssoo-success-bg text-ssoo-success'
        : 'border-ssoo-warning-border bg-ssoo-warning-bg text-ssoo-warning'
    }`}>
      {isReady ? '준비 완료' : '대기'}
    </span>
  );
}

function CrmHandoffCandidatePanel({
  projectId,
  project,
  canEditProject,
}: {
  projectId: number;
  project?: Project | null;
  canEditProject: boolean;
}) {
  const suggestedSearch = project?.customerName || project?.projectName || '';
  const [searchText, setSearchText] = useState(suggestedSearch);
  const [appliedSearch, setAppliedSearch] = useState(suggestedSearch);
  const [readinessFilter, setReadinessFilter] = useState<'all' | 'ready'>('all');
  const [selectedContractId, setSelectedContractId] = useState<string | undefined>();
  const [applyMessage, setApplyMessage] = useState<ApplySnapshotMessage | null>(null);
  const applyCrmSnapshot = useApplyCrmContractHandoffSnapshot();

  useEffect(() => {
    setSearchText(suggestedSearch);
    setAppliedSearch(suggestedSearch);
    setSelectedContractId(undefined);
  }, [suggestedSearch]);

  const candidateFilters = useMemo(
    () => ({
      search: appliedSearch.trim() || undefined,
      status: 'all' as const,
      readyOnly: readinessFilter === 'ready',
    }),
    [appliedSearch, readinessFilter],
  );

  const {
    data: candidatesResponse,
    isLoading: isLoadingCandidates,
    error: candidatesError,
    refetch: refetchCandidates,
  } = useCrmContractHandoffCandidates(candidateFilters);

  const candidates = useMemo(
    () => candidatesResponse?.success ? candidatesResponse.data ?? [] : [],
    [candidatesResponse],
  );
  const responseError = candidatesResponse && !candidatesResponse.success
    ? candidatesResponse.message || 'CRM 계약 후보를 불러오지 못했습니다.'
    : null;

  useEffect(() => {
    if (candidates.length === 0) {
      setSelectedContractId(undefined);
      return;
    }

    if (!selectedContractId || !candidates.some((candidate) => candidate.contractId === selectedContractId)) {
      setSelectedContractId(candidates[0].contractId);
    }
  }, [candidates, selectedContractId]);

  const {
    data: previewResponse,
    isLoading: isLoadingPreview,
    error: previewError,
  } = useCrmContractPmsHandoffPreview(selectedContractId);

  const selectedCandidate = candidates.find((candidate) => candidate.contractId === selectedContractId) ?? null;
  const preview = previewResponse?.success ? previewResponse.data : null;
  const previewResponseError = previewResponse && !previewResponse.success
    ? previewResponse.message || 'CRM 계약 preview를 불러오지 못했습니다.'
    : null;

  const handleApplySearch = () => {
    setAppliedSearch(searchText.trim());
    setSelectedContractId(undefined);
    setApplyMessage(null);
  };

  const handleApplySnapshot = async () => {
    if (!preview) {
      return;
    }

    setApplyMessage(null);
    try {
      const response = await applyCrmSnapshot.mutateAsync({
        projectId,
        data: { preview },
      });

      if (!response.success) {
        setApplyMessage({
          kind: 'error',
          message: response.message || 'CRM 계약 인계 스냅샷을 반영하지 못했습니다.',
        });
        return;
      }

      setApplyMessage({
        kind: 'success',
        message: `${response.data?.crmContractCode ?? preview.contractCode} 계약 스냅샷을 PMS 프로젝트에 반영했습니다.`,
      });
    } catch (error) {
      setApplyMessage({
        kind: 'error',
        message: error instanceof Error ? error.message : 'CRM 계약 인계 스냅샷을 반영하지 못했습니다.',
      });
    }
  };

  const canApplySnapshot = Boolean(
    canEditProject
    && preview
    && preview.readiness === 'ready'
    && preview.blockedReasons.length === 0,
  );

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Eye className="h-4 w-4" />
            CRM 계약 인계 후보
          </h3>
          <p className="text-xs text-muted-foreground">CRM 계약 원장의 PMS 인계 preview를 확인하고 준비된 스냅샷만 프로젝트에 반영합니다.</p>
        </div>
        <span className="w-fit rounded-full border bg-muted px-2 py-1 text-xs text-muted-foreground">
          명시 반영
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_160px_auto]">
        <SsooSearchInput
          id="pms-crm-contract-handoff-lookup-input"
          name="pms-crm-contract-handoff-lookup-query"
          ariaLabel="CRM 계약 인계 대상 검색"
          intent="entity-lookup"
          value={searchText}
          placeholder="고객사, 계약명, 계약번호"
          onChange={(event) => setSearchText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              handleApplySearch();
            }
          }}
        />
        <Select
          value={readinessFilter}
          onValueChange={(value: 'all' | 'ready') => {
            setReadinessFilter(value);
            setSelectedContractId(undefined);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 후보</SelectItem>
            <SelectItem value="ready">준비 완료</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleApplySearch}>
          <Search className="h-4 w-4" />
          조회
        </Button>
      </div>

      {responseError || candidatesError ? (
        <SsooErrorNotice className="mt-3 gap-3 px-3 py-2">
          <span>{responseError || candidatesError?.message || 'CRM 계약 후보를 불러오지 못했습니다.'}</span>
          <Button variant="outline" size="sm" onClick={() => void refetchCandidates()}>
            다시 시도
          </Button>
        </SsooErrorNotice>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="space-y-2">
          {isLoadingCandidates ? (
            <div className="rounded-lg border border-dashed bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
              CRM 계약 후보를 불러오는 중...
            </div>
          ) : candidates.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
              조회된 CRM 계약 후보가 없습니다.
            </div>
          ) : (
            candidates.slice(0, 8).map((candidate) => {
              const isSelected = candidate.contractId === selectedContractId;
              return (
                <Button
                  key={candidate.contractId}
                  type="button"
                  variant={isSelected ? 'secondary' : 'ghost'}
                  className="h-auto w-full justify-start p-3 text-left"
                  onClick={() => setSelectedContractId(candidate.contractId)}
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CandidateStatusBadge candidate={candidate} />
                      <span className="truncate text-sm font-semibold text-foreground">
                        {candidate.contractName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {candidate.contractCode}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground md:grid-cols-4">
                      <span>{candidate.customerName}</span>
                      <span>{CRM_CONTRACT_STATUS_LABELS[candidate.status] ?? candidate.status}</span>
                      <span>{candidate.wbsCode || 'WBS 미지정'}</span>
                      <span>{formatPmsAmount(candidate.revenueTotal, 'KRW')}</span>
                    </div>
                    {candidate.blockedReasons.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {candidate.blockedReasons.slice(0, 3).map((reason) => (
                          <span
                            key={`${candidate.contractId}-${reason}`}
                            className="rounded-full bg-ssoo-warning-bg px-2 py-0.5 text-xs text-ssoo-warning"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Button>
              );
            })
          )}
        </div>

        <div className="rounded-lg border bg-muted p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">선택 preview</p>
              <p className="text-xs text-muted-foreground">
                {selectedCandidate?.contractCode ?? '계약 미선택'}
              </p>
            </div>
            {preview && (
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                preview.readiness === 'ready'
                  ? 'border-ssoo-success-border bg-ssoo-success-bg text-ssoo-success'
                  : 'border-ssoo-warning-border bg-ssoo-warning-bg text-ssoo-warning'
              }`}>
                {preview.readiness === 'ready' ? '준비 완료' : '대기'}
              </span>
            )}
          </div>

          {!selectedContractId ? (
            <div className="rounded-lg border border-dashed bg-card px-3 py-6 text-center text-sm text-muted-foreground">
              CRM 계약 후보를 선택하세요.
            </div>
          ) : isLoadingPreview ? (
            <div className="rounded-lg border border-dashed bg-card px-3 py-6 text-center text-sm text-muted-foreground">
              PMS 인계 preview를 불러오는 중...
            </div>
          ) : previewResponseError || previewError ? (
            <SsooErrorNotice className="px-3 py-3" error={previewResponseError || previewError?.message || 'CRM 계약 preview를 불러오지 못했습니다.'} />
          ) : preview ? (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">계약명</p>
                <p className="font-medium text-foreground">{preview.contractName}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">고객사</p>
                  <p>{preview.customerName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">담당자</p>
                  <p>{preview.ownerName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">계약기간</p>
                  <p>{formatPmsDate(preview.contractStartDate)} - {formatPmsDate(preview.contractEndDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">WBS</p>
                  <p>{preview.wbsCode || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">매출</p>
                  <p>{formatPmsAmount(preview.financials.revenueTotal, 'KRW')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">외부원가</p>
                  <p>{formatPmsAmount(preview.financials.externalCostTotal, 'KRW')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">마진율</p>
                  <p>{formatPercent(preview.financials.marginRate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">청구계획</p>
                  <p>{formatPmsCount(preview.financials.billingPlanCount)}</p>
                </div>
              </div>
              {preview.blockedReasons.length > 0 ? (
                <div className="rounded-lg border border-ssoo-warning-border bg-ssoo-warning-bg px-3 py-2">
                  <div className="mb-1 flex items-center gap-2 text-ssoo-warning">
                    <CircleAlert className="h-4 w-4" />
                    <p className="text-xs font-medium">인계 대기 사유</p>
                  </div>
                  <ul className="space-y-1 text-xs text-ssoo-warning">
                    {preview.blockedReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-lg border border-ssoo-success-border bg-ssoo-success-bg px-3 py-2 text-xs text-ssoo-success">
                  {preview.nextAction}
                </div>
              )}
              <div className="rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
                {preview.boundaryNotice} PMS 상태: {CRM_HANDOFF_STATUS_LABELS[preview.handoffStatus] ?? preview.handoffStatus}
              </div>
              {applyMessage && (
                <div className={`rounded-lg border px-3 py-2 text-xs ${
                  applyMessage.kind === 'success'
                    ? 'border-ssoo-success-border bg-ssoo-success-bg text-ssoo-success'
                    : 'border-ssoo-danger-border bg-ssoo-danger-bg text-ssoo-danger'
                }`}>
                  {applyMessage.message}
                </div>
              )}
              {canEditProject && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={!canApplySnapshot || applyCrmSnapshot.isPending}
                    onClick={handleApplySnapshot}
                  >
                    <Check className="h-4 w-4" />
                    {applyCrmSnapshot.isPending ? '반영 중...' : '스냅샷 반영'}
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function HandoffsTab({ projectId, project }: { projectId: number; project?: Project | null }) {
  const { data: accessResponse } = useProjectAccess(projectId);
  const { data: handoffsResponse, isLoading: isLoadingHandoffs } = useProjectHandoffs(projectId);
  const { data: contractsResponse } = useProjectContracts(projectId);
  const { data: membersResponse } = useProjectMembers(projectId);
  const {
    data: roleCodesResponse,
    isLoading: isLoadingRoleCodes,
    isError: isRoleCodesError,
    error: roleCodesError,
    refetch: refetchRoleCodes,
  } = useCodesByGroup(PROJECT_MEMBER_ROLE_GROUP);
  const createHandoff = useCreateProjectHandoff();
  const updateHandoff = useUpdateProjectHandoff();

  const canEditProject = accessResponse?.data?.features.canEditProject ?? false;
  const handoffs = handoffsResponse?.data ?? [];
  const contracts = contractsResponse?.data ?? [];
  const membersData = membersResponse?.data;
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<HandoffFormState>(createInitialForm);

  const roleOptions = useMemo(
    () =>
      (roleCodesResponse?.success ? roleCodesResponse.data ?? [] : [])
        .filter((code: CodeItem) => code.isActive)
        .map((code: CodeItem) => ({
          code: code.codeValue,
          label: code.displayNameKo,
        })),
    [roleCodesResponse],
  );

  const roleLabels = useMemo(
    () =>
      roleOptions.reduce<Record<string, string>>((acc, option) => {
        acc[option.code] = option.label;
        return acc;
      }, {}),
    [roleOptions],
  );

  const memberOptions = useMemo(() => {
    const optionsByUser = new Map<string, HandoffMemberOption>();

    for (const member of membersData ?? []) {
      const value = String(member.userId);
      const label = member.user?.displayName || member.user?.userName || '프로젝트 멤버';
      const existing = optionsByUser.get(value);

      if (existing) {
        if (!existing.roleCodes.includes(member.roleCode)) {
          existing.roleCodes.push(member.roleCode);
        }
        continue;
      }

      optionsByUser.set(value, {
        value,
        label,
        roleCodes: [member.roleCode],
      });
    }

    return [...optionsByUser.values()].map((member) => ({
      ...member,
      label: member.roleCodes.length > 0
        ? `${member.label} · ${member.roleCodes.map((roleCode) => roleLabels[roleCode] ?? '등록된 역할').join(', ')}`
        : member.label,
    }));
  }, [membersData, roleLabels]);

  const roleCodeStatusMessage = isRoleCodesError
    ? `역할 코드를 불러오지 못했습니다: ${roleCodesError?.message ?? '알 수 없는 오류'}`
    : !isLoadingRoleCodes && roleOptions.length === 0
      ? '프로젝트 멤버 역할 코드가 없습니다. 코드 관리에서 PROJECT_MEMBER_ROLE 그룹을 먼저 활성화하세요.'
      : null;

  const formatRoleLabel = (roleCode?: string | null) =>
    roleCode ? roleLabels[roleCode] ?? '등록된 역할' : '-';

  const handleTargetUserChange = (value: string) => {
    const targetMember = memberOptions.find((member) => member.value === value);
    const firstRoleCode = targetMember?.roleCodes.find((roleCode) => roleLabels[roleCode]);

    setFormData((prev) => ({
      ...prev,
      toUserId: value,
      assignedRoleCode: firstRoleCode ?? prev.assignedRoleCode,
    }));
  };

  const handleRoleCodeChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      assignedRoleCode: value === NONE_VALUE ? '' : value,
    }));
  };

  const resetCreateForm = () => {
    setFormData(createInitialForm());
    setIsCreating(false);
  };

  const roleSelectValue = formData.assignedRoleCode || NONE_VALUE;

  const canSelectRole = !isLoadingRoleCodes && roleOptions.length > 0;

  const hasSelectedKnownRole = formData.assignedRoleCode && roleLabels[formData.assignedRoleCode];

  const roleSelectDisabled = isLoadingRoleCodes || (!canSelectRole && !hasSelectedKnownRole);

  const selectedRoleDescription = formData.assignedRoleCode
    ? formatRoleLabel(formData.assignedRoleCode)
    : '역할 배정 없이 인계합니다.';

  const selectedTargetDescription = formData.toUserId !== NONE_VALUE
    ? formatKnownUserLabel(memberOptions, formData.toUserId)
    : '담당자를 지정하지 않고 역할 중심으로 인계합니다.';

  const existingSelectedRoleItem = formData.assignedRoleCode && !roleLabels[formData.assignedRoleCode]
    ? formData.assignedRoleCode
    : null;

  const existingSelectedTargetItem =
    formData.toUserId !== NONE_VALUE
    && !memberOptions.some((member) => member.value === formData.toUserId)
      ? formData.toUserId
      : null;

  const resolvedMemberOptions = useMemo(
    () =>
      memberOptions.map((member) => ({
        ...member,
        label: member.label,
      })),
    [memberOptions],
  );

  const handleCreate = async () => {
    await createHandoff.mutateAsync({
      projectId,
      data: {
        toPhaseCode: formData.toPhaseCode,
        handoffTypeCode: formData.handoffTypeCode,
        ...(formData.toUserId !== NONE_VALUE && { toUserId: formData.toUserId }),
        ...(formData.assignedRoleCode && { assignedRoleCode: formData.assignedRoleCode }),
        ...(formData.conditionNote.trim() && { conditionNote: formData.conditionNote.trim() }),
        ...(formData.memo.trim() && { memo: formData.memo.trim() }),
      },
    });
    resetCreateForm();
  };

  const handleStatus = async (
    handoff: ProjectHandoff,
    handoffStatusCode: ProjectHandoff['handoffStatusCode'],
  ) => {
    await updateHandoff.mutateAsync({
      projectId,
      handoffId: handoff.handoffId,
      data: { handoffStatusCode },
    });
  };

  return (
    <div className="space-y-4">
      <CrmHandoffCandidatePanel projectId={projectId} project={project} canEditProject={canEditProject} />
      <ContractSnapshot contracts={contracts} />

      <section className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Handshake className="h-4 w-4" />
              인수인계
            </h3>
            <p className="text-xs text-muted-foreground">실행 담당 변경, 운영 전환, 종료 인계를 추적합니다.</p>
          </div>
          {canEditProject && (
            <Button size="sm" onClick={() => setIsCreating((value) => !value)}>
              {isCreating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {isCreating ? '닫기' : '인계 등록'}
            </Button>
          )}
        </div>

        {canEditProject && roleCodeStatusMessage && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-ssoo-warning-border bg-ssoo-warning-bg px-3 py-2 text-sm text-ssoo-warning">
            <span>{roleCodeStatusMessage}</span>
            {isRoleCodesError && (
              <Button variant="outline" size="sm" onClick={() => void refetchRoleCodes()}>
                다시 시도
              </Button>
            )}
          </div>
        )}

        {isCreating && (
          <div className="mb-4 rounded-lg border bg-muted p-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">인계 유형</p>
                <Select
                  value={formData.handoffTypeCode}
                  onValueChange={(value: ProjectHandoffTypeCode) =>
                    setFormData((prev) => ({ ...prev, handoffTypeCode: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HANDOFF_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">목표 단계</p>
                <Select
                  value={formData.toPhaseCode}
                  onValueChange={(value: ProjectPhase) =>
                    setFormData((prev) => ({ ...prev, toPhaseCode: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PHASE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">대상 담당자</p>
                <Select
                  value={formData.toUserId}
                  onValueChange={handleTargetUserChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>미지정</SelectItem>
                    {existingSelectedTargetItem && (
                      <SelectItem value={existingSelectedTargetItem}>프로젝트 멤버 외 사용자</SelectItem>
                    )}
                    {resolvedMemberOptions.map((member) => (
                      <SelectItem key={member.value} value={member.value}>
                        {member.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">배정 역할</p>
                <Select
                  value={roleSelectValue}
                  onValueChange={handleRoleCodeChange}
                  disabled={roleSelectDisabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingRoleCodes ? '역할 조회 중...' : '역할 선택'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>미지정</SelectItem>
                    {existingSelectedRoleItem && (
                      <SelectItem value={existingSelectedRoleItem}>등록된 역할</SelectItem>
                    )}
                    {roleOptions.map((option) => (
                      <SelectItem key={option.code} value={option.code}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {selectedRoleDescription}
                </p>
              </div>
              <div className="space-y-1.5 md:col-span-4">
                <p className="text-xs text-muted-foreground">
                  {selectedTargetDescription}
                </p>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <p className="text-xs font-medium text-muted-foreground">인계 조건</p>
                <Textarea
                  rows={2}
                  value={formData.conditionNote}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, conditionNote: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <p className="text-xs font-medium text-muted-foreground">메모</p>
                <Textarea
                  rows={2}
                  value={formData.memo}
                  onChange={(event) => setFormData((prev) => ({ ...prev, memo: event.target.value }))}
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                disabled={createHandoff.isPending}
                onClick={handleCreate}
              >
                <Plus className="h-4 w-4" />
                등록
              </Button>
            </div>
          </div>
        )}

        {isLoadingHandoffs ? (
          <div className="py-6 text-center text-sm text-muted-foreground">인수인계 정보를 불러오는 중...</div>
        ) : handoffs.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
            아직 등록된 인수인계가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {handoffs.map((handoff) => {
              const status = STATUS_META[handoff.handoffStatusCode];
              return (
                <div key={handoff.handoffId} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {optionLabel(HANDOFF_TYPE_OPTIONS, handoff.handoffTypeCode)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          {optionLabel(PHASE_OPTIONS, handoff.fromPhaseCode ?? undefined)}
                          <ArrowRight className="h-3 w-3" />
                          {optionLabel(PHASE_OPTIONS, handoff.toPhaseCode)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        요청 {formatPmsDateTime(handoff.requestedAt)}
                        {handoff.respondedAt ? ` · 응답 ${formatPmsDateTime(handoff.respondedAt)}` : ''}
                      </p>
                    </div>

                    {canEditProject && handoff.handoffStatusCode === 'pending' && (
                      <div className="flex flex-wrap gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updateHandoff.isPending}
                          onClick={() => handleStatus(handoff, 'accepted')}
                        >
                          <Check className="h-3.5 w-3.5" />
                          수락
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updateHandoff.isPending}
                          onClick={() => handleStatus(handoff, 'rejected')}
                        >
                          <X className="h-3.5 w-3.5" />
                          반려
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={updateHandoff.isPending}
                          onClick={() => handleStatus(handoff, 'cancelled')}
                        >
                          <RefreshCcw className="h-3.5 w-3.5" />
                          취소
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">대상 담당자</p>
                      <p>{formatKnownUserLabel(memberOptions, handoff.toUserId)}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">배정 역할</p>
                      <p>{formatRoleLabel(handoff.assignedRoleCode)}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">요청자</p>
                      <p>{formatKnownUserLabel(memberOptions, handoff.requestedByUserId)}</p>
                    </div>
                    {handoff.conditionNote && (
                      <div className="md:col-span-3">
                        <p className="mb-1 text-xs text-muted-foreground">인계 조건</p>
                        <p className="whitespace-pre-wrap">{handoff.conditionNote}</p>
                      </div>
                    )}
                    {handoff.memo && (
                      <div className="md:col-span-3">
                        <p className="mb-1 text-xs text-muted-foreground">메모</p>
                        <p className="whitespace-pre-wrap">{handoff.memo}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
