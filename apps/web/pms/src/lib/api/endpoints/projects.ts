import { apiClient } from '../client';
import { ApiResponse, PaginatedResponse, ListParams } from '../types';

/**
 * 프로젝트 상태 코드
 */
export type ProjectStatusCode = 'request' | 'proposal' | 'execution' | 'transition';

/**
 * 프로젝트 단계 코드
 */
export type ProjectStageCode = 'waiting' | 'in_progress' | 'done';

/**
 * 프로젝트 소스 코드
 */
export type ProjectDoneResultCode =
  | 'accepted'
  | 'rejected'
  | 'won'
  | 'lost'
  | 'completed'
  | 'cancelled'
  | 'transferred'
  | 'hold';

/**
 * 프로젝트 DTO
 */
export interface Project {
  id: number;
  projectName: string;
  statusCode: ProjectStatusCode;
  stageCode: ProjectStageCode;
  doneResultCode?: ProjectDoneResultCode;
  customerId?: number;
  currentOwnerUserId?: number;
  memo?: string | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  requestDetail?: ProjectRequestDetail | null;
  proposalDetail?: ProjectProposalDetail | null;
  executionDetail?: ProjectExecutionDetail | null;
  transitionDetail?: ProjectTransitionDetail | null;
  projectStatuses?: ProjectStatusItem[];
}

export interface ProjectRequestDetail {
  requestSourceCode?: string | null;
  requestChannelCode?: string | null;
  requestSummary?: string | null;
  requestReceivedAt?: string | null;
  requestPriorityCode?: string | null;
  requestOwnerUserId?: number | string | null;
  memo?: string | null;
}

export interface ProjectProposalDetail {
  proposalOwnerUserId?: number | string | null;
  proposalDueAt?: string | null;
  proposalSubmittedAt?: string | null;
  proposalVersion?: number | null;
  estimateAmount?: number | string | null;
  estimateUnitCode?: string | null;
  proposalScopeSummary?: string | null;
  decisionDeadlineAt?: string | null;
  memo?: string | null;
}

export interface ProjectExecutionDetail {
  contractSignedAt?: string | null;
  contractAmount?: number | string | null;
  contractUnitCode?: string | null;
  billingTypeCode?: string | null;
  deliveryMethodCode?: string | null;
  nextProjectId?: number | string | null;
  memo?: string | null;
}

export interface ProjectTransitionDetail {
  operationOwnerUserId?: number | string | null;
  operationReservedAt?: string | null;
  operationStartAt?: string | null;
  transitionDueAt?: string | null;
  transitionSummary?: string | null;
  memo?: string | null;
}

export interface ProjectStatusItem {
  projectId: number | string;
  statusCode: ProjectStatusCode;
  statusGoal: string;
  statusOwnerUserId?: number | string | null;
  expectedStartAt?: string | null;
  expectedEndAt?: string | null;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  closeConditionGroupCode?: string | null;
  memo?: string | null;
}

/**
 * 프로젝트 생성 요청
 */
export interface CreateProjectRequest {
  projectName: string;
  statusCode?: ProjectStatusCode;
  stageCode?: ProjectStageCode;
  customerId?: string;
  description?: string;
}

/**
 * 프로젝트 수정 요청
 */
export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {
  doneResultCode?: ProjectDoneResultCode;
}

/**
 * 단계별 상세 Upsert 요청
 */
export interface UpsertRequestDetailRequest {
  requestSourceCode?: string;
  requestChannelCode?: string;
  requestSummary?: string;
  requestReceivedAt?: string;
  requestPriorityCode?: string;
  requestOwnerUserId?: string;
  memo?: string;
}

export interface UpsertProposalDetailRequest {
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

export interface UpsertExecutionDetailRequest {
  contractSignedAt?: string;
  contractAmount?: string;
  contractUnitCode?: string;
  billingTypeCode?: string;
  deliveryMethodCode?: string;
  nextProjectId?: string;
  memo?: string;
}

export interface UpsertTransitionDetailRequest {
  operationOwnerUserId?: string;
  operationReservedAt?: string;
  operationStartAt?: string;
  transitionDueAt?: string;
  transitionSummary?: string;
  memo?: string;
}

// ─── 상태 전이 ───

export type DoneResultCode =
  | 'accepted' | 'rejected' | 'won' | 'lost'
  | 'completed' | 'transfer_pending' | 'linked'
  | 'cancelled' | 'transferred' | 'hold';

export interface AdvanceStageRequest {
  targetStage: 'in_progress' | 'done';
  doneResultCode?: DoneResultCode;
  statusGoal?: string;
}

export interface TransitionResult {
  previousStatusCode: string;
  previousStageCode: string;
  currentStatusCode: string;
  currentStageCode: string;
  doneResultCode?: string | null;
  advancedToNextStatus: boolean;
}

// ─── 프로젝트 멤버 ───

export interface ProjectMember {
  projectId: number | string;
  userId: number | string;
  roleCode: string;
  assignedAt: string;
  releasedAt?: string | null;
  allocationRate: number;
  sortOrder: number;
  isActive: boolean;
  memo?: string | null;
  user?: {
    id: number | string;
    userName: string;
    displayName?: string | null;
    departmentCode?: string | null;
    positionCode?: string | null;
    email?: string;
  };
}

export interface CreateMemberRequest {
  userId: string;
  roleCode: string;
  assignedAt?: string;
  allocationRate?: number;
  memo?: string;
}

export interface UpdateMemberRequest {
  releasedAt?: string | null;
  allocationRate?: number;
  isActive?: boolean;
  memo?: string;
}

// ─── 태스크 ───

export interface TaskItem {
  id: number | string;
  projectId: number | string;
  parentTaskId?: number | string | null;
  taskCode: string;
  taskName: string;
  description?: string | null;
  taskTypeCode?: string | null;
  statusCode: string;
  priorityCode: string;
  assigneeUserId?: number | string | null;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  progressRate: number;
  estimatedHours?: number | null;
  actualHours?: number | null;
  depth: number;
  sortOrder: number;
  isActive: boolean;
  memo?: string | null;
  assignee?: { id: number | string; userName: string; displayName?: string | null } | null;
}

export interface CreateTaskRequest {
  parentTaskId?: string | null;
  taskCode: string;
  taskName: string;
  description?: string;
  taskTypeCode?: string;
  priorityCode?: string;
  assigneeUserId?: string;
  plannedStartAt?: string;
  plannedEndAt?: string;
  estimatedHours?: number;
  depth?: number;
  sortOrder?: number;
  memo?: string;
}

export interface UpdateTaskRequest {
  taskName?: string;
  description?: string;
  taskTypeCode?: string;
  statusCode?: string;
  priorityCode?: string;
  assigneeUserId?: string | null;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  progressRate?: number;
  estimatedHours?: number | null;
  actualHours?: number | null;
  sortOrder?: number;
  memo?: string;
}

// ─── 마일스톤 ───

export interface MilestoneItem {
  id: number | string;
  projectId: number | string;
  milestoneCode: string;
  milestoneName: string;
  description?: string | null;
  statusCode: string;
  dueAt?: string | null;
  achievedAt?: string | null;
  sortOrder: number;
  isActive: boolean;
  memo?: string | null;
}

export interface CreateMilestoneRequest {
  milestoneCode: string;
  milestoneName: string;
  description?: string;
  dueAt?: string;
  sortOrder?: number;
  memo?: string;
}

export interface UpdateMilestoneRequest {
  milestoneName?: string;
  description?: string;
  statusCode?: string;
  dueAt?: string | null;
  achievedAt?: string | null;
  sortOrder?: number;
  memo?: string;
}

// ─── 이슈 ───

export interface IssueItem {
  id: number | string;
  projectId: number | string;
  issueCode: string;
  issueTitle: string;
  description?: string | null;
  issueTypeCode: string;
  statusCode: string;
  priorityCode: string;
  reportedByUserId?: number | string | null;
  assigneeUserId?: number | string | null;
  reportedAt: string;
  dueAt?: string | null;
  resolvedAt?: string | null;
  resolution?: string | null;
  sortOrder: number;
  isActive: boolean;
  memo?: string | null;
  reportedBy?: { id: number | string; userName: string; displayName?: string | null } | null;
  assignee?: { id: number | string; userName: string; displayName?: string | null } | null;
}

export interface CreateIssueRequest {
  issueCode: string;
  issueTitle: string;
  description?: string;
  issueTypeCode: string;
  priorityCode?: string;
  assigneeUserId?: string;
  dueAt?: string;
  memo?: string;
}

export interface UpdateIssueRequest {
  issueTitle?: string;
  description?: string;
  issueTypeCode?: string;
  statusCode?: string;
  priorityCode?: string;
  assigneeUserId?: string | null;
  dueAt?: string | null;
  resolvedAt?: string | null;
  resolution?: string;
  memo?: string;
}

// ─── 산출물 ───

export interface DeliverableItem {
  projectId: number | string;
  statusCode: string;
  deliverableCode: string;
  deliverableName?: string;
  submissionStatusCode: string;
  submittedAt?: string | null;
  submittedBy?: number | string | null;
  originalFileName?: string | null;
  memo?: string | null;
  isActive: boolean;
  deliverable?: {
    deliverableName: string;
    description?: string | null;
    sortOrder: number;
  };
}

export interface UpsertDeliverableRequest {
  statusCode: string;
  deliverableCode: string;
  submissionStatusCode: string;
  memo?: string;
}

export interface UpdateSubmissionRequest {
  submissionStatusCode: string;
}

// ─── 종료 조건 ───

export interface CloseConditionItem {
  projectId: number | string;
  statusCode: string;
  conditionCode: string;
  requiresDeliverable: boolean;
  isChecked: boolean;
  checkedAt?: string | null;
  checkedBy?: number | string | null;
  sortOrder: number;
  memo?: string | null;
  isActive: boolean;
}

export interface UpsertCloseConditionRequest {
  statusCode: string;
  conditionCode: string;
  requiresDeliverable: boolean;
  sortOrder?: number;
  memo?: string;
}

export interface ToggleCheckRequest {
  isChecked: boolean;
}

/**
 * 프로젝트 필터
 */
export interface ProjectFilters extends ListParams {
  statusCode?: ProjectStatusCode;
  stageCode?: ProjectStageCode;
  customerId?: number;
}

interface ProjectListApiResponse {
  success: boolean;
  data?: Project[];
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
}

/**
 * 프로젝트 API
 */
export const projectsApi = {
  /**
   * 프로젝트 목록 조회
   */
  list: async (params?: ProjectFilters): Promise<ApiResponse<PaginatedResponse<Project>>> => {
    const requestParams = params
      ? {
          ...params,
          ...(params.pageSize !== undefined && { limit: params.pageSize }),
        }
      : undefined;
    const response = await apiClient.get<ProjectListApiResponse>('/projects', {
      params: requestParams,
    });

    if (!response.data.success || !response.data.data || !response.data.meta) {
      return {
        success: false,
        data: null,
        message: response.data.error?.message || '요청 처리 중 오류가 발생했습니다.',
      };
    }

    const pageSize = response.data.meta.limit || params?.pageSize || 10;
    const totalPages = pageSize ? Math.ceil(response.data.meta.total / pageSize) : 0;

    return {
      success: true,
      data: {
        items: response.data.data,
        total: response.data.meta.total,
        page: response.data.meta.page,
        pageSize,
        totalPages,
      },
      message: response.data.message || '',
    };
  },

  /**
   * 프로젝트 상세 조회
   */
  getById: async (id: number): Promise<ApiResponse<Project>> => {
    const response = await apiClient.get<ApiResponse<Project>>(`/projects/${id}`);
    return response.data;
  },

  /**
   * 프로젝트 생성
   */
  create: async (data: CreateProjectRequest): Promise<ApiResponse<Project>> => {
    const response = await apiClient.post<ApiResponse<Project>>('/projects', data);
    return response.data;
  },

  /**
   * 프로젝트 수정
   */
  update: async (id: number, data: UpdateProjectRequest): Promise<ApiResponse<Project>> => {
    const response = await apiClient.put<ApiResponse<Project>>(`/projects/${id}`, data);
    return response.data;
  },

  /**
   * 프로젝트 삭제
   */
  delete: async (id: number): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/projects/${id}`);
    return response.data;
  },

  // ─── 단계별 상세 Upsert ───

  upsertRequestDetail: async (id: number, data: UpsertRequestDetailRequest): Promise<ApiResponse<ProjectRequestDetail>> => {
    const response = await apiClient.put<ApiResponse<ProjectRequestDetail>>(`/projects/${id}/request-detail`, data);
    return response.data;
  },

  upsertProposalDetail: async (id: number, data: UpsertProposalDetailRequest): Promise<ApiResponse<ProjectProposalDetail>> => {
    const response = await apiClient.put<ApiResponse<ProjectProposalDetail>>(`/projects/${id}/proposal-detail`, data);
    return response.data;
  },

  upsertExecutionDetail: async (id: number, data: UpsertExecutionDetailRequest): Promise<ApiResponse<ProjectExecutionDetail>> => {
    const response = await apiClient.put<ApiResponse<ProjectExecutionDetail>>(`/projects/${id}/execution-detail`, data);
    return response.data;
  },

  upsertTransitionDetail: async (id: number, data: UpsertTransitionDetailRequest): Promise<ApiResponse<ProjectTransitionDetail>> => {
    const response = await apiClient.put<ApiResponse<ProjectTransitionDetail>>(`/projects/${id}/transition-detail`, data);
    return response.data;
  },

  // ─── 상태 전이 ───

  advanceStage: async (id: number, data: AdvanceStageRequest): Promise<ApiResponse<TransitionResult>> => {
    const response = await apiClient.post<ApiResponse<TransitionResult>>(`/projects/${id}/advance-stage`, data);
    return response.data;
  },

  // ─── 멤버 ───

  getMembers: async (projectId: number): Promise<ApiResponse<ProjectMember[]>> => {
    const response = await apiClient.get<ApiResponse<ProjectMember[]>>(`/projects/${projectId}/members`);
    return response.data;
  },

  addMember: async (projectId: number, data: CreateMemberRequest): Promise<ApiResponse<ProjectMember>> => {
    const response = await apiClient.post<ApiResponse<ProjectMember>>(`/projects/${projectId}/members`, data);
    return response.data;
  },

  updateMember: async (projectId: number, userId: string, roleCode: string, data: UpdateMemberRequest): Promise<ApiResponse<ProjectMember>> => {
    const response = await apiClient.put<ApiResponse<ProjectMember>>(`/projects/${projectId}/members/${userId}/${roleCode}`, data);
    return response.data;
  },

  removeMember: async (projectId: number, userId: string, roleCode: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/projects/${projectId}/members/${userId}/${roleCode}`);
    return response.data;
  },

  // ─── 태스크 ───

  getTasks: async (projectId: number): Promise<ApiResponse<TaskItem[]>> => {
    const response = await apiClient.get<ApiResponse<TaskItem[]>>(`/projects/${projectId}/tasks`);
    return response.data;
  },

  createTask: async (projectId: number, data: CreateTaskRequest): Promise<ApiResponse<TaskItem>> => {
    const response = await apiClient.post<ApiResponse<TaskItem>>(`/projects/${projectId}/tasks`, data);
    return response.data;
  },

  updateTask: async (projectId: number, taskId: string, data: UpdateTaskRequest): Promise<ApiResponse<TaskItem>> => {
    const response = await apiClient.put<ApiResponse<TaskItem>>(`/projects/${projectId}/tasks/${taskId}`, data);
    return response.data;
  },

  deleteTask: async (projectId: number, taskId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/projects/${projectId}/tasks/${taskId}`);
    return response.data;
  },

  // ─── 마일스톤 ───

  getMilestones: async (projectId: number): Promise<ApiResponse<MilestoneItem[]>> => {
    const response = await apiClient.get<ApiResponse<MilestoneItem[]>>(`/projects/${projectId}/milestones`);
    return response.data;
  },

  createMilestone: async (projectId: number, data: CreateMilestoneRequest): Promise<ApiResponse<MilestoneItem>> => {
    const response = await apiClient.post<ApiResponse<MilestoneItem>>(`/projects/${projectId}/milestones`, data);
    return response.data;
  },

  updateMilestone: async (projectId: number, milestoneId: string, data: UpdateMilestoneRequest): Promise<ApiResponse<MilestoneItem>> => {
    const response = await apiClient.put<ApiResponse<MilestoneItem>>(`/projects/${projectId}/milestones/${milestoneId}`, data);
    return response.data;
  },

  deleteMilestone: async (projectId: number, milestoneId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/projects/${projectId}/milestones/${milestoneId}`);
    return response.data;
  },

  // ─── 이슈 ───

  getIssues: async (projectId: number, filters?: { statusCode?: string; issueTypeCode?: string }): Promise<ApiResponse<IssueItem[]>> => {
    const response = await apiClient.get<ApiResponse<IssueItem[]>>(`/projects/${projectId}/issues`, { params: filters });
    return response.data;
  },

  createIssue: async (projectId: number, data: CreateIssueRequest): Promise<ApiResponse<IssueItem>> => {
    const response = await apiClient.post<ApiResponse<IssueItem>>(`/projects/${projectId}/issues`, data);
    return response.data;
  },

  updateIssue: async (projectId: number, issueId: string, data: UpdateIssueRequest): Promise<ApiResponse<IssueItem>> => {
    const response = await apiClient.put<ApiResponse<IssueItem>>(`/projects/${projectId}/issues/${issueId}`, data);
    return response.data;
  },

  deleteIssue: async (projectId: number, issueId: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/projects/${projectId}/issues/${issueId}`);
    return response.data;
  },

  // ─── 산출물 ───

  getDeliverables: async (projectId: number, statusCode?: string): Promise<ApiResponse<DeliverableItem[]>> => {
    const response = await apiClient.get<ApiResponse<DeliverableItem[]>>(`/projects/${projectId}/deliverables`, {
      params: statusCode ? { statusCode } : undefined,
    });
    return response.data;
  },

  upsertDeliverable: async (projectId: number, data: UpsertDeliverableRequest): Promise<ApiResponse<DeliverableItem>> => {
    const response = await apiClient.post<ApiResponse<DeliverableItem>>(`/projects/${projectId}/deliverables`, data);
    return response.data;
  },

  updateDeliverableSubmission: async (projectId: number, statusCode: string, deliverableCode: string, data: UpdateSubmissionRequest): Promise<ApiResponse<DeliverableItem>> => {
    const response = await apiClient.patch<ApiResponse<DeliverableItem>>(`/projects/${projectId}/deliverables/${statusCode}/${deliverableCode}/submission`, data);
    return response.data;
  },

  deleteDeliverable: async (projectId: number, statusCode: string, deliverableCode: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/projects/${projectId}/deliverables/${statusCode}/${deliverableCode}`);
    return response.data;
  },

  // ─── 종료 조건 ───

  getCloseConditions: async (projectId: number, statusCode?: string): Promise<ApiResponse<CloseConditionItem[]>> => {
    const response = await apiClient.get<ApiResponse<CloseConditionItem[]>>(`/projects/${projectId}/close-conditions`, {
      params: statusCode ? { statusCode } : undefined,
    });
    return response.data;
  },

  upsertCloseCondition: async (projectId: number, data: UpsertCloseConditionRequest): Promise<ApiResponse<CloseConditionItem>> => {
    const response = await apiClient.post<ApiResponse<CloseConditionItem>>(`/projects/${projectId}/close-conditions`, data);
    return response.data;
  },

  toggleCloseCondition: async (projectId: number, statusCode: string, conditionCode: string, data: ToggleCheckRequest): Promise<ApiResponse<CloseConditionItem>> => {
    const response = await apiClient.patch<ApiResponse<CloseConditionItem>>(`/projects/${projectId}/close-conditions/${statusCode}/${conditionCode}/check`, data);
    return response.data;
  },

  deleteCloseCondition: async (projectId: number, statusCode: string, conditionCode: string): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete<ApiResponse<null>>(`/projects/${projectId}/close-conditions/${statusCode}/${conditionCode}`);
    return response.data;
  },
};
