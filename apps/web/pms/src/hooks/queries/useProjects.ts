'use client';

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api';
import type {
  Project,
  ProjectFilters,
  CreateProjectRequest,
  UpdateProjectRequest,
  UpsertRequestDetailRequest,
  UpsertProposalDetailRequest,
  UpsertExecutionDetailRequest,
  UpsertTransitionDetailRequest,
  ProjectRequestDetail,
  ProjectProposalDetail,
  ProjectExecutionDetail,
  ProjectTransitionDetail,
  AdvanceStageRequest,
  TransitionResult,
  ProjectMember,
  CreateMemberRequest,
  UpdateMemberRequest,
  TaskItem,
  CreateTaskRequest,
  UpdateTaskRequest,
  MilestoneItem,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
  IssueItem,
  CreateIssueRequest,
  UpdateIssueRequest,
  DeliverableItem,
  UpsertDeliverableRequest,
  UpdateSubmissionRequest,
  CloseConditionItem,
  UpsertCloseConditionRequest,
  ToggleCheckRequest,
} from '@/lib/api/endpoints/projects';
import type { ApiResponse, PaginatedResponse } from '@/lib/api/types';

/**
 * Query Keys
 */
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters?: ProjectFilters) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: number) => [...projectKeys.details(), id] as const,
};

/**
 * 프로젝트 목록 조회
 */
export function useProjectList(
  filters?: ProjectFilters,
  options?: Omit<
    UseQueryOptions<ApiResponse<PaginatedResponse<Project>>, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: () => projectsApi.list(filters),
    staleTime: 5 * 60 * 1000, // 5분
    ...options,
  });
}

/**
 * 프로젝트 상세 조회 (모든 relation 포함)
 */
export function useProjectDetail(
  id: number,
  options?: Omit<UseQueryOptions<ApiResponse<Project>, Error>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectsApi.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * 프로젝트 생성
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectRequest) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * 프로젝트 수정
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProjectRequest }) =>
      projectsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * 프로젝트 삭제
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => projectsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// ─── 단계별 상세 Upsert Mutations ───

export function useUpsertRequestDetail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpsertRequestDetailRequest }) =>
      projectsApi.upsertRequestDetail(id, data),
    onSuccess: (_: ApiResponse<ProjectRequestDetail>, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useUpsertProposalDetail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpsertProposalDetailRequest }) =>
      projectsApi.upsertProposalDetail(id, data),
    onSuccess: (_: ApiResponse<ProjectProposalDetail>, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useUpsertExecutionDetail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpsertExecutionDetailRequest }) =>
      projectsApi.upsertExecutionDetail(id, data),
    onSuccess: (_: ApiResponse<ProjectExecutionDetail>, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useUpsertTransitionDetail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpsertTransitionDetailRequest }) =>
      projectsApi.upsertTransitionDetail(id, data),
    onSuccess: (_: ApiResponse<ProjectTransitionDetail>, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// ─── 상태 전이 ───

export function useAdvanceStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: AdvanceStageRequest }) =>
      projectsApi.advanceStage(id, data),
    onSuccess: (_: ApiResponse<TransitionResult>, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// ─── 멤버 ───

export const memberKeys = {
  all: (projectId: number) => [...projectKeys.detail(projectId), 'members'] as const,
};

export function useProjectMembers(projectId: number) {
  return useQuery({
    queryKey: memberKeys.all(projectId),
    queryFn: () => projectsApi.getMembers(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: CreateMemberRequest }) =>
      projectsApi.addMember(projectId, data),
    onSuccess: (_: ApiResponse<ProjectMember>, variables) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all(variables.projectId) });
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, userId, roleCode, data }: { projectId: number; userId: string; roleCode: string; data: UpdateMemberRequest }) =>
      projectsApi.updateMember(projectId, userId, roleCode, data),
    onSuccess: (_: ApiResponse<ProjectMember>, variables) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all(variables.projectId) });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, userId, roleCode }: { projectId: number; userId: string; roleCode: string }) =>
      projectsApi.removeMember(projectId, userId, roleCode),
    onSuccess: (_: ApiResponse<null>, variables) => {
      queryClient.invalidateQueries({ queryKey: memberKeys.all(variables.projectId) });
    },
  });
}

// ─── 태스크 ───

export const taskKeys = {
  all: (projectId: number) => [...projectKeys.detail(projectId), 'tasks'] as const,
};

export function useProjectTasks(projectId: number) {
  return useQuery({
    queryKey: taskKeys.all(projectId),
    queryFn: () => projectsApi.getTasks(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: CreateTaskRequest }) =>
      projectsApi.createTask(projectId, data),
    onSuccess: (_: ApiResponse<TaskItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all(variables.projectId) });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, taskId, data }: { projectId: number; taskId: string; data: UpdateTaskRequest }) =>
      projectsApi.updateTask(projectId, taskId, data),
    onSuccess: (_: ApiResponse<TaskItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all(variables.projectId) });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, taskId }: { projectId: number; taskId: string }) =>
      projectsApi.deleteTask(projectId, taskId),
    onSuccess: (_: ApiResponse<null>, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all(variables.projectId) });
    },
  });
}

// ─── 마일스톤 ───

export const milestoneKeys = {
  all: (projectId: number) => [...projectKeys.detail(projectId), 'milestones'] as const,
};

export function useProjectMilestones(projectId: number) {
  return useQuery({
    queryKey: milestoneKeys.all(projectId),
    queryFn: () => projectsApi.getMilestones(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: CreateMilestoneRequest }) =>
      projectsApi.createMilestone(projectId, data),
    onSuccess: (_: ApiResponse<MilestoneItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: milestoneKeys.all(variables.projectId) });
    },
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, milestoneId, data }: { projectId: number; milestoneId: string; data: UpdateMilestoneRequest }) =>
      projectsApi.updateMilestone(projectId, milestoneId, data),
    onSuccess: (_: ApiResponse<MilestoneItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: milestoneKeys.all(variables.projectId) });
    },
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, milestoneId }: { projectId: number; milestoneId: string }) =>
      projectsApi.deleteMilestone(projectId, milestoneId),
    onSuccess: (_: ApiResponse<null>, variables) => {
      queryClient.invalidateQueries({ queryKey: milestoneKeys.all(variables.projectId) });
    },
  });
}

// ─── 이슈 ───

export const issueKeys = {
  all: (projectId: number) => [...projectKeys.detail(projectId), 'issues'] as const,
};

export function useProjectIssues(projectId: number, filters?: { statusCode?: string; issueTypeCode?: string }) {
  return useQuery({
    queryKey: [...issueKeys.all(projectId), filters] as const,
    queryFn: () => projectsApi.getIssues(projectId, filters),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: CreateIssueRequest }) =>
      projectsApi.createIssue(projectId, data),
    onSuccess: (_: ApiResponse<IssueItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: issueKeys.all(variables.projectId) });
    },
  });
}

export function useUpdateIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, issueId, data }: { projectId: number; issueId: string; data: UpdateIssueRequest }) =>
      projectsApi.updateIssue(projectId, issueId, data),
    onSuccess: (_: ApiResponse<IssueItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: issueKeys.all(variables.projectId) });
    },
  });
}

export function useDeleteIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, issueId }: { projectId: number; issueId: string }) =>
      projectsApi.deleteIssue(projectId, issueId),
    onSuccess: (_: ApiResponse<null>, variables) => {
      queryClient.invalidateQueries({ queryKey: issueKeys.all(variables.projectId) });
    },
  });
}

// ─── 산출물 ───

export const deliverableKeys = {
  all: (projectId: number) => [...projectKeys.detail(projectId), 'deliverables'] as const,
};

export function useProjectDeliverables(projectId: number, statusCode?: string) {
  return useQuery({
    queryKey: [...deliverableKeys.all(projectId), statusCode] as const,
    queryFn: () => projectsApi.getDeliverables(projectId, statusCode),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpsertDeliverable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: UpsertDeliverableRequest }) =>
      projectsApi.upsertDeliverable(projectId, data),
    onSuccess: (_: ApiResponse<DeliverableItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: deliverableKeys.all(variables.projectId) });
    },
  });
}

export function useUpdateDeliverableSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, statusCode, deliverableCode, data }: { projectId: number; statusCode: string; deliverableCode: string; data: UpdateSubmissionRequest }) =>
      projectsApi.updateDeliverableSubmission(projectId, statusCode, deliverableCode, data),
    onSuccess: (_: ApiResponse<DeliverableItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: deliverableKeys.all(variables.projectId) });
    },
  });
}

export function useDeleteDeliverable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, statusCode, deliverableCode }: { projectId: number; statusCode: string; deliverableCode: string }) =>
      projectsApi.deleteDeliverable(projectId, statusCode, deliverableCode),
    onSuccess: (_: ApiResponse<null>, variables) => {
      queryClient.invalidateQueries({ queryKey: deliverableKeys.all(variables.projectId) });
    },
  });
}

// ─── 종료 조건 ───

export const closeConditionKeys = {
  all: (projectId: number) => [...projectKeys.detail(projectId), 'close-conditions'] as const,
};

export function useProjectCloseConditions(projectId: number, statusCode?: string) {
  return useQuery({
    queryKey: [...closeConditionKeys.all(projectId), statusCode] as const,
    queryFn: () => projectsApi.getCloseConditions(projectId, statusCode),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpsertCloseCondition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: UpsertCloseConditionRequest }) =>
      projectsApi.upsertCloseCondition(projectId, data),
    onSuccess: (_: ApiResponse<CloseConditionItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: closeConditionKeys.all(variables.projectId) });
    },
  });
}

export function useToggleCloseCondition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, statusCode, conditionCode, data }: { projectId: number; statusCode: string; conditionCode: string; data: ToggleCheckRequest }) =>
      projectsApi.toggleCloseCondition(projectId, statusCode, conditionCode, data),
    onSuccess: (_: ApiResponse<CloseConditionItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: closeConditionKeys.all(variables.projectId) });
    },
  });
}

export function useDeleteCloseCondition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, statusCode, conditionCode }: { projectId: number; statusCode: string; conditionCode: string }) =>
      projectsApi.deleteCloseCondition(projectId, statusCode, conditionCode),
    onSuccess: (_: ApiResponse<null>, variables) => {
      queryClient.invalidateQueries({ queryKey: closeConditionKeys.all(variables.projectId) });
    },
  });
}
