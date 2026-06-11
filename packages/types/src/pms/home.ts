import type { PmsProjectAccessFeatures, ProjectStageCode, ProjectStatusCode } from './project';

export type PmsHomeRelation = 'pm' | 'member' | 'pmo' | 'viewer';

export type PmsHomeCapabilityKey = keyof PmsProjectAccessFeatures;

export type PmsHomeActionKind =
  | 'view-project'
  | 'edit-project'
  | 'manage-members'
  | 'manage-tasks'
  | 'manage-milestones'
  | 'manage-issues'
  | 'manage-deliverables'
  | 'manage-close-conditions'
  | 'advance-stage';

export type PmsHomeTargetTab =
  | 'overview'
  | 'stage'
  | 'members'
  | 'tasks'
  | 'milestones'
  | 'controls'
  | 'deliverables'
  | 'closeConditions';

export type PmsHomeSignalKind =
  | 'my-task-due'
  | 'my-deliverable-due'
  | 'my-review-request'
  | 'project-stale'
  | 'project-unowned'
  | 'project-risk-open'
  | 'project-issue-blocking'
  | 'milestone-delayed'
  | 'deliverable-approval-pending'
  | 'closeout-blocked'
  | 'stage-transition-ready'
  | 'recent-change';

export type PmsHomeSignalSeverity = 'critical' | 'warning' | 'normal' | 'info';

export interface PmsHomeAllowedAction {
  kind: PmsHomeActionKind;
  label: string;
  targetPath: string;
  targetTab: PmsHomeTargetTab;
  requiredCapability?: PmsHomeCapabilityKey | null;
}

export interface PmsHomeSignal {
  id: string;
  projectId: string;
  projectName: string;
  statusCode: ProjectStatusCode;
  stageCode: ProjectStageCode;
  currentOwnerUserId?: string | null;
  ownerOrganizationId?: string | null;
  updatedAt: string;
  relation: PmsHomeRelation;
  kind: PmsHomeSignalKind;
  severity: PmsHomeSignalSeverity;
  label: string;
  reason: string;
  nextActionLabel: string;
  targetPath: string;
  targetTab: PmsHomeTargetTab;
  requiredCapability?: PmsHomeCapabilityKey | null;
  allowedActions: PmsHomeAllowedAction[];
  primaryAction?: PmsHomeAllowedAction;
  sortWeight: number;
  relatedSignalCount?: number;
}

export interface PmsHomeRelationCounts {
  pm: number;
  member: number;
  pmo: number;
  viewer: number;
}

export interface PmsHomeMetrics {
  active: number;
  directActions: number;
  attention: number;
  pmoSignals: number;
  closeout: number;
  stale: number;
  actionableProjects: number;
  readOnlyProjects: number;
}

export interface PmsHomeFlowItem {
  statusCode: ProjectStatusCode;
  count: number;
}

export interface PmsHomeRecentChange {
  projectId: string;
  projectName: string;
  statusCode: ProjectStatusCode;
  stageCode: ProjectStageCode;
  relation: PmsHomeRelation;
  title: string;
  changedAt: string;
  currentOwnerUserId?: string | null;
  allowedActions: PmsHomeAllowedAction[];
  primaryAction?: PmsHomeAllowedAction;
}

export interface PmsHomeAccessProject {
  projectId: string;
  projectName: string;
  statusCode: ProjectStatusCode;
  stageCode: ProjectStageCode;
  relation: PmsHomeRelation;
  currentOwnerUserId?: string | null;
  ownerOrganizationId?: string | null;
  updatedAt: string;
  features: PmsProjectAccessFeatures;
  allowedActions: PmsHomeAllowedAction[];
  primaryAction?: PmsHomeAllowedAction;
}

export interface PmsHomeSummary {
  generatedAt: string;
  relationCounts: PmsHomeRelationCounts;
  metrics: PmsHomeMetrics;
  briefing: string[];
  signals: PmsHomeSignal[];
  flow: PmsHomeFlowItem[];
  recentChanges: PmsHomeRecentChange[];
  accessProjects: PmsHomeAccessProject[];
}
