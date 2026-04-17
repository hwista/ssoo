import type { ProjectStatusCode } from './project';

export type ProjectIssueTypeCode =
  | 'bug'
  | 'impediment'
  | 'inquiry'
  | 'improvement';

export type ProjectIssueStatusCode =
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'deferred';

export interface ProjectIssue {
  projectIssueId: string;
  projectId: string;
  issueCode: string;
  issueTitle: string;
  description?: string | null;
  issueTypeCode: ProjectIssueTypeCode;
  statusCode: ProjectIssueStatusCode;
  priorityCode: string;
  reportedByUserId?: string | null;
  ownerUserId?: string | null;
  reportedAt: string;
  dueAt?: string | null;
  resolvedAt?: string | null;
  resolution?: string | null;
  sortOrder: number;
  memo?: string | null;
}

export interface CreateProjectIssueDto {
  issueCode: string;
  issueTitle: string;
  description?: string;
  issueTypeCode: ProjectIssueTypeCode;
  statusCode?: ProjectIssueStatusCode;
  priorityCode?: string;
  reportedByUserId?: string;
  ownerUserId?: string;
  assigneeUserId?: string;
  reportedAt?: string;
  dueAt?: string;
  resolvedAt?: string;
  resolution?: string;
  sortOrder?: number;
  memo?: string;
}

export interface UpdateProjectIssueDto {
  issueTitle?: string;
  description?: string | null;
  issueTypeCode?: ProjectIssueTypeCode;
  statusCode?: ProjectIssueStatusCode;
  priorityCode?: string;
  ownerUserId?: string | null;
  assigneeUserId?: string | null;
  dueAt?: string | null;
  resolvedAt?: string | null;
  resolution?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  memo?: string | null;
}

export type ProjectRequirementStatusCode =
  | 'open'
  | 'in_progress'
  | 'done'
  | 'closed';

export interface ProjectRequirement {
  requirementId: string;
  projectId: string;
  requirementCode: string;
  requirementTitle: string;
  description?: string | null;
  statusCode: ProjectRequirementStatusCode;
  priorityCode: string;
  ownerUserId?: string | null;
  dueAt?: string | null;
  sortOrder: number;
  memo?: string | null;
}

export interface CreateProjectRequirementDto {
  requirementCode: string;
  requirementTitle: string;
  description?: string;
  statusCode?: ProjectRequirementStatusCode;
  priorityCode?: string;
  ownerUserId?: string;
  dueAt?: string;
  sortOrder?: number;
  memo?: string;
}

export interface UpdateProjectRequirementDto {
  requirementTitle?: string;
  description?: string | null;
  statusCode?: ProjectRequirementStatusCode;
  priorityCode?: string;
  ownerUserId?: string | null;
  dueAt?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  memo?: string | null;
}

export type ProjectRiskStatusCode =
  | 'identified'
  | 'monitoring'
  | 'mitigated'
  | 'closed';

export interface ProjectRisk {
  riskId: string;
  projectId: string;
  riskCode: string;
  riskTitle: string;
  description?: string | null;
  statusCode: ProjectRiskStatusCode;
  impactCode: string;
  likelihoodCode: string;
  responsePlan?: string | null;
  ownerUserId?: string | null;
  dueAt?: string | null;
  sortOrder: number;
  memo?: string | null;
}

export interface CreateProjectRiskDto {
  riskCode: string;
  riskTitle: string;
  description?: string;
  statusCode?: ProjectRiskStatusCode;
  impactCode?: string;
  likelihoodCode?: string;
  responsePlan?: string;
  ownerUserId?: string;
  dueAt?: string;
  sortOrder?: number;
  memo?: string;
}

export interface UpdateProjectRiskDto {
  riskTitle?: string;
  description?: string | null;
  statusCode?: ProjectRiskStatusCode;
  impactCode?: string;
  likelihoodCode?: string;
  responsePlan?: string | null;
  ownerUserId?: string | null;
  dueAt?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  memo?: string | null;
}

export type ProjectChangeRequestStatusCode =
  | 'requested'
  | 'reviewing'
  | 'approved'
  | 'rejected'
  | 'implemented';

export interface ProjectChangeRequest {
  changeRequestId: string;
  projectId: string;
  changeCode: string;
  changeTitle: string;
  description?: string | null;
  statusCode: ProjectChangeRequestStatusCode;
  priorityCode: string;
  requestedAt: string;
  decidedAt?: string | null;
  ownerUserId?: string | null;
  sortOrder: number;
  memo?: string | null;
}

export interface CreateProjectChangeRequestDto {
  changeCode: string;
  changeTitle: string;
  description?: string;
  statusCode?: ProjectChangeRequestStatusCode;
  priorityCode?: string;
  ownerUserId?: string;
  requestedAt?: string;
  decidedAt?: string;
  sortOrder?: number;
  memo?: string;
}

export interface UpdateProjectChangeRequestDto {
  changeTitle?: string;
  description?: string | null;
  statusCode?: ProjectChangeRequestStatusCode;
  priorityCode?: string;
  ownerUserId?: string | null;
  requestedAt?: string;
  decidedAt?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  memo?: string | null;
}

export type ProjectEventTypeCode =
  | 'general'
  | 'meeting'
  | 'report'
  | 'review'
  | 'handoff';

export type ProjectEventStatusCode =
  | 'planned'
  | 'completed'
  | 'cancelled';

export interface ProjectEvent {
  eventId: string;
  projectId: string;
  eventCode: string;
  eventName: string;
  description?: string | null;
  eventTypeCode: ProjectEventTypeCode;
  statusCode: ProjectEventStatusCode;
  scheduledAt?: string | null;
  occurredAt?: string | null;
  summary?: string | null;
  ownerUserId?: string | null;
  sortOrder: number;
  memo?: string | null;
}

export interface ProjectEventRollup {
  statusCodes: ProjectStatusCode[];
  deliverables: {
    total: number;
    completed: number;
    pending: number;
    byStatus: Record<string, number>;
  };
  closeConditions: {
    total: number;
    checked: number;
    unchecked: number;
    requiresDeliverable: number;
  };
  readiness: {
    isReady: boolean;
    blockingDeliverables: number;
    blockingCloseConditions: number;
  };
}

export interface ProjectEventWithRollup extends ProjectEvent {
  rollup: ProjectEventRollup;
}

export interface CreateProjectEventDto {
  eventCode: string;
  eventName: string;
  description?: string;
  eventTypeCode?: ProjectEventTypeCode;
  statusCode?: ProjectEventStatusCode;
  scheduledAt?: string;
  occurredAt?: string;
  summary?: string;
  ownerUserId?: string;
  sortOrder?: number;
  memo?: string;
}

export interface UpdateProjectEventDto {
  eventName?: string;
  description?: string | null;
  eventTypeCode?: ProjectEventTypeCode;
  statusCode?: ProjectEventStatusCode;
  scheduledAt?: string | null;
  occurredAt?: string | null;
  summary?: string | null;
  ownerUserId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  memo?: string | null;
}
