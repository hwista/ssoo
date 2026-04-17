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
  ProjectOrgRoleCode,
  CreateProjectOrgRequest,
  ProjectRelationTypeCode,
  CreateProjectRelationRequest,
  ObjectiveItem,
  CreateObjectiveRequest,
  UpdateObjectiveRequest,
  WbsItem,
  CreateWbsRequest,
  UpdateWbsRequest,
  ProjectRequirementItem,
  CreateProjectRequirementRequest,
  UpdateProjectRequirementRequest,
  ProjectRiskItem,
  CreateProjectRiskRequest,
  UpdateProjectRiskRequest,
  ProjectChangeRequestItem,
  CreateProjectChangeRequest,
  UpdateProjectChangeRequest,
  ProjectEventItem,
  CreateProjectEventRequest,
  UpdateProjectEventRequest,
  TaskItem,
  CreateTaskRequest,
  UpdateTaskRequest,
  MilestoneItem,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
  IssueItem,
  CreateIssueRequest,
  UpdateIssueRequest,
  ProjectIssueItem,
  CreateProjectIssueRequest,
  UpdateProjectIssueRequest,
  DeliverableItem,
  UpsertDeliverableRequest,
  UpdateSubmissionRequest,
  CloseConditionItem,
  UpsertCloseConditionRequest,
  ToggleCheckRequest,
} from '@/lib/api/endpoints/projects';
import type { ApiResponse, PaginatedResponse } from '@/lib/api/types';
import type { PmsProjectAccessSnapshot } from '@ssoo/types/pms';

/**
 * Query Keys
 */
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters?: ProjectFilters) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: number) => [...projectKeys.details(), id] as const,
  access: (id: number) => [...projectKeys.detail(id), 'access'] as const,
};

const transitionReadinessKey = (projectId: number) =>
  [...projectKeys.all, 'transition-readiness', projectId] as const;

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

export function useProjectAccess(
  id: number,
  options?: Omit<
    UseQueryOptions<ApiResponse<PmsProjectAccessSnapshot>, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery({
    queryKey: projectKeys.access(id),
    queryFn: () => projectsApi.getAccess(id),
    enabled: !!id,
    staleTime: 60 * 1000,
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
      queryClient.invalidateQueries({ queryKey: projectOrgKeys.all(variables.id) });
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

export function useTransitionReadiness(projectId: number | undefined) {
  return useQuery({
    queryKey: projectId ? transitionReadinessKey(projectId) : [...projectKeys.all, 'transition-readiness', projectId],
    queryFn: () => projectsApi.getTransitionReadiness(projectId!),
    enabled: !!projectId,
    staleTime: 30 * 1000, // 30초 (전이 직전에 최신 데이터 필요)
  });
}

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

export const projectOrgKeys = {
  all: (projectId: number) => [...projectKeys.detail(projectId), 'organizations'] as const,
};

export const projectRelationKeys = {
  all: (projectId: number) => [...projectKeys.detail(projectId), 'relations'] as const,
};

export function useProjectMembers(projectId: number) {
  return useQuery({
    queryKey: memberKeys.all(projectId),
    queryFn: () => projectsApi.getMembers(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProjectOrgs(projectId: number) {
  return useQuery({
    queryKey: projectOrgKeys.all(projectId),
    queryFn: () => projectsApi.getProjectOrgs(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProjectRelations(projectId: number) {
  return useQuery({
    queryKey: projectRelationKeys.all(projectId),
    queryFn: () => projectsApi.getProjectRelations(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateProjectOrg() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: CreateProjectOrgRequest }) =>
      projectsApi.createProjectOrg(projectId, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: projectOrgKeys.all(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) });
    },
  });
}

export function useRemoveProjectOrg() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      organizationId,
      roleCode,
    }: {
      projectId: number;
      organizationId: string;
      roleCode: ProjectOrgRoleCode;
    }) => projectsApi.removeProjectOrg(projectId, organizationId, roleCode),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: projectOrgKeys.all(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) });
    },
  });
}

export function useCreateProjectRelation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: number;
      data: CreateProjectRelationRequest;
    }) => projectsApi.createProjectRelation(projectId, data),
    onSuccess: (_response, variables) => {
      const targetProjectId = Number.parseInt(String(variables.data.targetProjectId), 10);
      queryClient.invalidateQueries({ queryKey: projectRelationKeys.all(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) });
      if (!Number.isNaN(targetProjectId)) {
        queryClient.invalidateQueries({ queryKey: projectRelationKeys.all(targetProjectId) });
        queryClient.invalidateQueries({ queryKey: projectKeys.detail(targetProjectId) });
      }
    },
  });
}

export function useRemoveProjectRelation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      targetProjectId,
      relationTypeCode,
    }: {
      projectId: number;
      targetProjectId: string;
      relationTypeCode: Extract<ProjectRelationTypeCode, 'linked'>;
    }) => projectsApi.removeProjectRelation(projectId, targetProjectId, relationTypeCode),
    onSuccess: (_response, variables) => {
      const targetProjectId = Number.parseInt(variables.targetProjectId, 10);
      queryClient.invalidateQueries({ queryKey: projectRelationKeys.all(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.projectId) });
      if (!Number.isNaN(targetProjectId)) {
        queryClient.invalidateQueries({ queryKey: projectRelationKeys.all(targetProjectId) });
        queryClient.invalidateQueries({ queryKey: projectKeys.detail(targetProjectId) });
      }
    },
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

export const objectiveKeys = {
  all: (projectId: number) => [...projectKeys.detail(projectId), 'objectives'] as const,
};

export function useProjectObjectives(projectId: number) {
  return useQuery({
    queryKey: objectiveKeys.all(projectId),
    queryFn: () => projectsApi.getObjectives(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateObjective() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: CreateObjectiveRequest }) =>
      projectsApi.createObjective(projectId, data),
    onSuccess: (_: ApiResponse<ObjectiveItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: objectiveKeys.all(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: milestoneKeys.all(variables.projectId) });
    },
  });
}

export function useUpdateObjective() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      objectiveId,
      data,
    }: {
      projectId: number;
      objectiveId: string;
      data: UpdateObjectiveRequest;
    }) => projectsApi.updateObjective(projectId, objectiveId, data),
    onSuccess: (_: ApiResponse<ObjectiveItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: objectiveKeys.all(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: milestoneKeys.all(variables.projectId) });
    },
  });
}

export function useDeleteObjective() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, objectiveId }: { projectId: number; objectiveId: string }) =>
      projectsApi.deleteObjective(projectId, objectiveId),
    onSuccess: (_: ApiResponse<null>, variables) => {
      queryClient.invalidateQueries({ queryKey: objectiveKeys.all(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: milestoneKeys.all(variables.projectId) });
    },
  });
}

export const wbsKeys = {
  all: (projectId: number) => [...projectKeys.detail(projectId), 'wbs'] as const,
};

export function useProjectWbs(projectId: number) {
  return useQuery({
    queryKey: wbsKeys.all(projectId),
    queryFn: () => projectsApi.getWbs(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateWbs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: CreateWbsRequest }) =>
      projectsApi.createWbs(projectId, data),
    onSuccess: (_: ApiResponse<WbsItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: wbsKeys.all(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.all(variables.projectId) });
    },
  });
}

export function useUpdateWbs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      wbsId,
      data,
    }: {
      projectId: number;
      wbsId: string;
      data: UpdateWbsRequest;
    }) => projectsApi.updateWbs(projectId, wbsId, data),
    onSuccess: (_: ApiResponse<WbsItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: wbsKeys.all(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.all(variables.projectId) });
    },
  });
}

export function useDeleteWbs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, wbsId }: { projectId: number; wbsId: string }) =>
      projectsApi.deleteWbs(projectId, wbsId),
    onSuccess: (_: ApiResponse<null>, variables) => {
      queryClient.invalidateQueries({ queryKey: wbsKeys.all(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: taskKeys.all(variables.projectId) });
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

// ─── 컨트롤 도메인 ───

export const projectIssueKeys = {
  all: (projectId: number) => [...projectKeys.detail(projectId), 'control-issues'] as const,
};

export function useProjectControlIssues(projectId: number) {
  return useQuery({
    queryKey: projectIssueKeys.all(projectId),
    queryFn: () => projectsApi.getControlIssues(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateProjectIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: CreateProjectIssueRequest }) =>
      projectsApi.createProjectIssue(projectId, data),
    onSuccess: (_: ApiResponse<ProjectIssueItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: projectIssueKeys.all(variables.projectId) });
    },
  });
}

export function useUpdateProjectIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      projectIssueId,
      data,
    }: {
      projectId: number;
      projectIssueId: string;
      data: UpdateProjectIssueRequest;
    }) => projectsApi.updateProjectIssue(projectId, projectIssueId, data),
    onSuccess: (_: ApiResponse<ProjectIssueItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: projectIssueKeys.all(variables.projectId) });
    },
  });
}

export function useDeleteProjectIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, projectIssueId }: { projectId: number; projectIssueId: string }) =>
      projectsApi.deleteProjectIssue(projectId, projectIssueId),
    onSuccess: (_: ApiResponse<null>, variables) => {
      queryClient.invalidateQueries({ queryKey: projectIssueKeys.all(variables.projectId) });
    },
  });
}

export const requirementKeys = {
  all: (projectId: number) => [...projectKeys.detail(projectId), 'requirements'] as const,
};

export function useProjectRequirements(projectId: number) {
  return useQuery({
    queryKey: requirementKeys.all(projectId),
    queryFn: () => projectsApi.getRequirements(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: CreateProjectRequirementRequest }) =>
      projectsApi.createRequirement(projectId, data),
    onSuccess: (_: ApiResponse<ProjectRequirementItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: requirementKeys.all(variables.projectId) });
    },
  });
}

export function useUpdateRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      requirementId,
      data,
    }: {
      projectId: number;
      requirementId: string;
      data: UpdateProjectRequirementRequest;
    }) => projectsApi.updateRequirement(projectId, requirementId, data),
    onSuccess: (_: ApiResponse<ProjectRequirementItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: requirementKeys.all(variables.projectId) });
    },
  });
}

export function useDeleteRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, requirementId }: { projectId: number; requirementId: string }) =>
      projectsApi.deleteRequirement(projectId, requirementId),
    onSuccess: (_: ApiResponse<null>, variables) => {
      queryClient.invalidateQueries({ queryKey: requirementKeys.all(variables.projectId) });
    },
  });
}

export const riskKeys = {
  all: (projectId: number) => [...projectKeys.detail(projectId), 'risks'] as const,
};

export function useProjectRisks(projectId: number) {
  return useQuery({
    queryKey: riskKeys.all(projectId),
    queryFn: () => projectsApi.getRisks(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateRisk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: CreateProjectRiskRequest }) =>
      projectsApi.createRisk(projectId, data),
    onSuccess: (_: ApiResponse<ProjectRiskItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: riskKeys.all(variables.projectId) });
    },
  });
}

export function useUpdateRisk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, riskId, data }: { projectId: number; riskId: string; data: UpdateProjectRiskRequest }) =>
      projectsApi.updateRisk(projectId, riskId, data),
    onSuccess: (_: ApiResponse<ProjectRiskItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: riskKeys.all(variables.projectId) });
    },
  });
}

export function useDeleteRisk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, riskId }: { projectId: number; riskId: string }) =>
      projectsApi.deleteRisk(projectId, riskId),
    onSuccess: (_: ApiResponse<null>, variables) => {
      queryClient.invalidateQueries({ queryKey: riskKeys.all(variables.projectId) });
    },
  });
}

export const changeRequestKeys = {
  all: (projectId: number) => [...projectKeys.detail(projectId), 'change-requests'] as const,
};

export function useProjectChangeRequests(projectId: number) {
  return useQuery({
    queryKey: changeRequestKeys.all(projectId),
    queryFn: () => projectsApi.getChangeRequests(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateChangeRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: CreateProjectChangeRequest }) =>
      projectsApi.createChangeRequest(projectId, data),
    onSuccess: (_: ApiResponse<ProjectChangeRequestItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: changeRequestKeys.all(variables.projectId) });
    },
  });
}

export function useUpdateChangeRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      changeRequestId,
      data,
    }: {
      projectId: number;
      changeRequestId: string;
      data: UpdateProjectChangeRequest;
    }) => projectsApi.updateChangeRequest(projectId, changeRequestId, data),
    onSuccess: (_: ApiResponse<ProjectChangeRequestItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: changeRequestKeys.all(variables.projectId) });
    },
  });
}

export function useDeleteChangeRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, changeRequestId }: { projectId: number; changeRequestId: string }) =>
      projectsApi.deleteChangeRequest(projectId, changeRequestId),
    onSuccess: (_: ApiResponse<null>, variables) => {
      queryClient.invalidateQueries({ queryKey: changeRequestKeys.all(variables.projectId) });
    },
  });
}

export const eventKeys = {
  all: (projectId: number) => [...projectKeys.detail(projectId), 'events'] as const,
};

export function useProjectEvents(projectId: number) {
  return useQuery({
    queryKey: eventKeys.all(projectId),
    queryFn: () => projectsApi.getEvents(projectId),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: CreateProjectEventRequest }) =>
      projectsApi.createEvent(projectId, data),
    onSuccess: (_: ApiResponse<ProjectEventItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all(variables.projectId) });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, eventId, data }: { projectId: number; eventId: string; data: UpdateProjectEventRequest }) =>
      projectsApi.updateEvent(projectId, eventId, data),
    onSuccess: (_: ApiResponse<ProjectEventItem>, variables) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all(variables.projectId) });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, eventId }: { projectId: number; eventId: string }) =>
      projectsApi.deleteEvent(projectId, eventId),
    onSuccess: (_: ApiResponse<null>, variables) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all(variables.projectId) });
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
      queryClient.invalidateQueries({ queryKey: eventKeys.all(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: transitionReadinessKey(variables.projectId) });
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
      queryClient.invalidateQueries({ queryKey: eventKeys.all(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: transitionReadinessKey(variables.projectId) });
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
      queryClient.invalidateQueries({ queryKey: eventKeys.all(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: transitionReadinessKey(variables.projectId) });
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
      queryClient.invalidateQueries({ queryKey: eventKeys.all(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: transitionReadinessKey(variables.projectId) });
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
      queryClient.invalidateQueries({ queryKey: eventKeys.all(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: transitionReadinessKey(variables.projectId) });
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
      queryClient.invalidateQueries({ queryKey: eventKeys.all(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: transitionReadinessKey(variables.projectId) });
    },
  });
}
