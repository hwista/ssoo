import type { ProjectMemberAccessLevel } from './member';

/**
 * 프로젝트 상태 코드
 * - request: 요청
 * - proposal: 제안
 * - execution: 실행
 * - transition: 전환
 */
export type ProjectStatusCode = 'request' | 'proposal' | 'execution' | 'transition';

/**
 * 프로젝트 단계 코드
 * - waiting: 대기
 * - in_progress: 진행 중
 * - done: 완료
 */
export type ProjectStageCode = 'waiting' | 'in_progress' | 'done';

/**
 * 프로젝트 canonical phase
 * - legacy `statusCode` 위에 덧씌우는 호환 레이어
 * - contract 는 이후 delivery 에서 실제 runtime 으로 확장 예정
 */
export type ProjectPhase = 'request' | 'proposal' | 'contract' | 'execution' | 'operation' | 'closed';

/**
 * 프로젝트 canonical lifecycle status
 */
export type ProjectLifecycleStatus = 'draft' | 'active' | 'on_hold' | 'cancelled' | 'completed';

/**
 * 완료 결과 코드 (done 상태에서만 사용)
 * - accepted: 수용 (request → proposal)
 * - rejected: 거부 (종료)
 * - won: 수주 (proposal → execution)
 * - lost: 실주 (종료)
 * - completed: 완료 (종료)
 * - transfer_pending: 전환 필요 (execution → transition)
 * - linked: 프로젝트 연계 (종료)
 * - cancelled: 취소 (종료)
 * - transferred: 전환완료 (종료)
 * - hold: 보류
 */
export type DoneResultCode =
  | 'accepted'
  | 'rejected'
  | 'won'
  | 'lost'
  | 'completed'
  | 'transfer_pending'
  | 'linked'
  | 'cancelled'
  | 'transferred'
  | 'hold';

export interface ProjectLifecycle {
  phase: ProjectPhase;
  status: ProjectLifecycleStatus;
  terminalReason?: DoneResultCode | null;
}

/**
 * 프로젝트 엔티티
 */
export interface Project {
  id: string;
  projectName: string;
  memo?: string | null;
  customerId?: string | null;
  ownerOrganizationId?: string | null;
  statusCode: ProjectStatusCode;
  stageCode: ProjectStageCode;
  doneResultCode?: DoneResultCode;
  lifecycle: ProjectLifecycle;
  currentOwnerUserId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 프로젝트 생성 DTO
 */
export interface CreateProjectDto {
  projectName: string;
  description?: string;
  customerId?: string;
  ownerOrganizationId?: string;
  statusCode?: ProjectStatusCode;
  stageCode?: ProjectStageCode;
  ownerId?: string;
}

/**
 * 프로젝트 수정 DTO
 */
export interface UpdateProjectDto {
  projectName?: string;
  description?: string;
  customerId?: string | null;
  statusCode?: ProjectStatusCode;
  stageCode?: ProjectStageCode;
  doneResultCode?: DoneResultCode;
  ownerOrganizationId?: string | null;
  ownerId?: string;
}

// ─── 단계별 상세 ───

/**
 * 요청(Request) 상세
 */
export interface ProjectRequestDetail {
  projectId: string;
  requestSourceCode?: string | null;
  requestChannelCode?: string | null;
  requestSummary?: string | null;
  requestReceivedAt?: string | null;
  requestPriorityCode?: string | null;
  requestOwnerUserId?: string | null;
  memo?: string | null;
}

/**
 * 제안(Proposal) 상세
 */
export interface ProjectProposalDetail {
  projectId: string;
  proposalOwnerUserId?: string | null;
  proposalDueAt?: string | null;
  proposalSubmittedAt?: string | null;
  proposalVersion?: number | null;
  estimateAmount?: string | null;
  estimateUnitCode?: string | null;
  proposalScopeSummary?: string | null;
  decisionDeadlineAt?: string | null;
  memo?: string | null;
}

/**
 * 수행(Execution) 상세
 */
export interface ProjectExecutionDetail {
  projectId: string;
  contractSignedAt?: string | null;
  contractAmount?: string | null;
  contractUnitCode?: string | null;
  billingTypeCode?: string | null;
  deliveryMethodCode?: string | null;
  nextProjectId?: string | null;
  memo?: string | null;
}

/**
 * 전환(Transition) 상세
 */
export interface ProjectTransitionDetail {
  projectId: string;
  operationOwnerUserId?: string | null;
  operationReservedAt?: string | null;
  operationStartAt?: string | null;
  transitionDueAt?: string | null;
  transitionSummary?: string | null;
  memo?: string | null;
}

export type ProjectHandoffTypeCode =
  | 'phase_transition'
  | 'reassignment'
  | 'escalation'
  | 'closure';

export type ProjectHandoffStatusCode = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface ProjectHandoff {
  handoffId: string;
  projectId: string;
  fromPhaseCode?: ProjectPhase | null;
  toPhaseCode: ProjectPhase;
  handoffTypeCode: ProjectHandoffTypeCode;
  fromUserId?: string | null;
  toUserId?: string | null;
  requestedByUserId?: string | null;
  handoffStatusCode: ProjectHandoffStatusCode;
  conditionNote?: string | null;
  assignedRoleCode?: string | null;
  requestedAt: string;
  respondedAt?: string | null;
  respondedByUserId?: string | null;
  memo?: string | null;
}

export interface CreateProjectHandoffDto {
  fromPhaseCode?: ProjectPhase | null;
  toPhaseCode: ProjectPhase;
  handoffTypeCode?: ProjectHandoffTypeCode;
  fromUserId?: string;
  toUserId?: string;
  handoffStatusCode?: ProjectHandoffStatusCode;
  conditionNote?: string;
  assignedRoleCode?: string;
  memo?: string;
}

export interface UpdateProjectHandoffDto {
  toPhaseCode?: ProjectPhase;
  handoffTypeCode?: ProjectHandoffTypeCode;
  fromUserId?: string | null;
  toUserId?: string | null;
  handoffStatusCode?: ProjectHandoffStatusCode;
  conditionNote?: string | null;
  assignedRoleCode?: string | null;
  memo?: string | null;
}

export type ProjectContractTypeCode = 'new' | 'change_order' | 'amendment' | 'renewal';

export type ProjectContractStatusCode =
  | 'draft'
  | 'negotiating'
  | 'signed'
  | 'in_progress'
  | 'completed'
  | 'terminated';

export interface ProjectContract {
  contractId: string;
  projectId: string;
  contractCode: string;
  title: string;
  contractTypeCode: ProjectContractTypeCode;
  totalAmount?: string | null;
  currencyCode: string;
  contractStatusCode: ProjectContractStatusCode;
  contractDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  managerUserId?: string | null;
  billingTypeCode?: string | null;
  deliveryMethodCode?: string | null;
  isPrimary: boolean;
  memo?: string | null;
}

export interface CreateProjectContractDto {
  contractCode: string;
  title: string;
  contractTypeCode?: ProjectContractTypeCode;
  totalAmount?: string;
  currencyCode?: string;
  contractStatusCode?: ProjectContractStatusCode;
  contractDate?: string;
  startDate?: string;
  endDate?: string;
  managerUserId?: string;
  billingTypeCode?: string;
  deliveryMethodCode?: string;
  isPrimary?: boolean;
  memo?: string;
}

export interface UpdateProjectContractDto {
  contractCode?: string;
  title?: string;
  contractTypeCode?: ProjectContractTypeCode;
  totalAmount?: string | null;
  currencyCode?: string;
  contractStatusCode?: ProjectContractStatusCode;
  contractDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  managerUserId?: string | null;
  billingTypeCode?: string | null;
  deliveryMethodCode?: string | null;
  isPrimary?: boolean;
  memo?: string | null;
}

export type ContractPaymentTypeCode = 'advance' | 'interim' | 'final' | 'other';

export type ContractPaymentStatusCode =
  | 'scheduled'
  | 'requested'
  | 'invoiced'
  | 'paid'
  | 'overdue';

export interface ContractPayment {
  contractPaymentId: string;
  contractId: string;
  paymentTypeCode: ContractPaymentTypeCode;
  amount?: string | null;
  triggerEvent?: string | null;
  paymentStatusCode: ContractPaymentStatusCode;
  dueDate?: string | null;
  paidDate?: string | null;
  requestedByUserId?: string | null;
  sortOrder: number;
  memo?: string | null;
}

export interface CreateContractPaymentDto {
  paymentTypeCode?: ContractPaymentTypeCode;
  amount?: string;
  triggerEvent?: string;
  paymentStatusCode?: ContractPaymentStatusCode;
  dueDate?: string;
  paidDate?: string;
  requestedByUserId?: string;
  sortOrder?: number;
  memo?: string;
}

export interface UpdateContractPaymentDto {
  paymentTypeCode?: ContractPaymentTypeCode;
  amount?: string | null;
  triggerEvent?: string | null;
  paymentStatusCode?: ContractPaymentStatusCode;
  dueDate?: string | null;
  paidDate?: string | null;
  requestedByUserId?: string | null;
  sortOrder?: number;
  memo?: string | null;
}

export type ProjectOrgRoleCode = 'owner' | 'customer' | 'supplier' | 'partner';

export interface ProjectOrg {
  projectId: string;
  organizationId: string;
  roleCode: ProjectOrgRoleCode;
  isActive: boolean;
  memo?: string | null;
  lastSource?: string | null;
  lastActivity?: string | null;
  organization?: {
    orgId: string;
    orgCode: string;
    orgName: string;
    orgType: string;
    orgClass: string;
    scope: string;
    levelType?: string | null;
    isActive: boolean;
  } | null;
}

export interface CreateProjectOrgDto {
  roleCode: ProjectOrgRoleCode;
  organizationId?: string;
  customerId?: string;
  memo?: string;
}

export interface UpdateProjectOrgDto {
  memo?: string | null;
  isActive?: boolean;
}

export type ProjectRelationTypeCode = 'successor' | 'split' | 'merge' | 'linked';

export interface ProjectRelation {
  sourceProjectId: string;
  targetProjectId: string;
  relationTypeCode: ProjectRelationTypeCode;
  isActive: boolean;
  memo?: string | null;
  lastSource?: string | null;
  lastActivity?: string | null;
  sourceProject?: {
    id: string;
    projectName: string;
    statusCode: ProjectStatusCode;
    stageCode: ProjectStageCode;
  } | null;
  targetProject?: {
    id: string;
    projectName: string;
    statusCode: ProjectStatusCode;
    stageCode: ProjectStageCode;
  } | null;
}

export interface CreateProjectRelationDto {
  relationTypeCode: Extract<ProjectRelationTypeCode, 'linked'>;
  targetProjectId: string;
  memo?: string;
}

/**
 * 프로젝트 상태 이력
 */
export interface ProjectStatus {
  projectId: string;
  statusCode: ProjectStatusCode;
  statusGoal: string;
  statusOwnerUserId?: string | null;
  expectedStartAt?: string | null;
  expectedEndAt?: string | null;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  closeConditionGroupCode?: string | null;
  memo?: string | null;
}

/**
 * 프로젝트 통합 상세 응답 (모든 relation 포함)
 */
export interface ProjectDetail extends Project {
  requestDetail?: ProjectRequestDetail | null;
  proposalDetail?: ProjectProposalDetail | null;
  executionDetail?: ProjectExecutionDetail | null;
  transitionDetail?: ProjectTransitionDetail | null;
  handoffs?: ProjectHandoff[];
  contracts?: ProjectContract[];
  projectOrgs?: ProjectOrg[];
  projectStatuses?: ProjectStatus[];
}

// ─── 단계별 상세 Upsert DTO ───

export interface UpsertRequestDetailDto {
  requestSourceCode?: string;
  requestChannelCode?: string;
  requestSummary?: string;
  requestReceivedAt?: string;
  requestPriorityCode?: string;
  requestOwnerUserId?: string;
  memo?: string;
}

export interface UpsertProposalDetailDto {
  proposalOwnerUserId?: string;
  proposalDueAt?: string;
  proposalSubmittedAt?: string;
  proposalVersion?: number;
  estimateAmount?: string;
  estimateUnitCode?: string;
  proposalScopeSummary?: string;
  decisionDeadlineAt?: string;
  memo?: string;
}

export interface UpsertExecutionDetailDto {
  contractSignedAt?: string;
  contractAmount?: string;
  contractUnitCode?: string;
  billingTypeCode?: string;
  deliveryMethodCode?: string;
  nextProjectId?: string;
  memo?: string;
}

export interface UpsertTransitionDetailDto {
  operationOwnerUserId?: string;
  operationReservedAt?: string;
  operationStartAt?: string;
  transitionDueAt?: string;
  transitionSummary?: string;
  memo?: string;
}

// ─── 상태 전이 ───

/**
 * 단계 진행 요청 DTO
 * - targetStage: 'in_progress' 또는 'done'
 * - doneResultCode: targetStage가 'done'일 때 필수
 * - statusGoal: 다음 상태로 진입 시 목표 설명 (선택)
 */
export interface AdvanceStageDto {
  targetStage: 'in_progress' | 'done';
  doneResultCode?: DoneResultCode;
  statusGoal?: string;
}

import type { PermissionResolutionTrace } from '../common/access';

/**
 * 상태 전이 결과
 */
export interface TransitionResult {
  previousStatusCode: ProjectStatusCode;
  previousStageCode: ProjectStageCode;
  currentStatusCode: ProjectStatusCode;
  currentStageCode: ProjectStageCode;
  doneResultCode?: DoneResultCode | null;
  advancedToNextStatus: boolean;
  previousLifecycle: ProjectLifecycle;
  currentLifecycle: ProjectLifecycle;
}

export interface PmsProjectAccessFeatures {
  canViewProject: boolean;
  canEditProject: boolean;
  canManageMembers: boolean;
  canManageTasks: boolean;
  canManageMilestones: boolean;
  canManageIssues: boolean;
  canManageDeliverables: boolean;
  canManageCloseConditions: boolean;
  canAdvanceStage: boolean;
}

export interface PmsProjectAccessRoles {
  isProjectOwner: boolean;
  isOwnerOrganizationMember: boolean;
  isProjectMember: boolean;
  memberRoleCodes: string[];
  memberAccessLevels: ProjectMemberAccessLevel[];
  phaseOwnerRoleCodes: string[];
  memberOrganizationIds: string[];
}

export interface PmsProjectAccessSnapshot {
  projectId: string;
  ownerOrganizationId?: string | null;
  currentOwnerUserId?: string | null;
  features: PmsProjectAccessFeatures;
  roles: PmsProjectAccessRoles;
  policy: PermissionResolutionTrace;
}
