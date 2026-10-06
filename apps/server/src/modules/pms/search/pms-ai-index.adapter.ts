import { ProjectAccessService } from '../project/project-access.service.js';
import type { AiIndexObjectRef } from '@ssoo/types/common';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { createHash } from 'crypto';
import { Injectable, OnModuleInit } from '@nestjs/common';
import type {
  AiIndexAdapterSyncRequest,
  AiIndexAdapterSyncResult,
  AiIndexChunkProjection,
  AiIndexJsonObject,
  AiIndexSensitivityCode,
} from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { AiIndexAdapter } from '../../common/ai-index/ai-index-adapter.js';
import { AiEmbeddingProviderService } from '../../common/ai-index/ai-embedding-provider.service.js';
import { AiIndexRegistryService } from '../../common/ai-index/ai-index-registry.service.js';

interface PmsProjectStatusProjection {
  statusCode: string;
  statusGoal: string;
  expectedStartAt: Date | null;
  expectedEndAt: Date | null;
  actualStartAt: Date | null;
  actualEndAt: Date | null;
  memo: string | null;
  updatedAt: Date;
}

interface PmsProjectRequestDetailProjection {
  requestSourceCode: string | null;
  requestChannelCode: string | null;
  requestSummary: string | null;
  requestReceivedAt: Date | null;
  requestPriorityCode: string | null;
  memo: string | null;
  updatedAt: Date;
}

interface PmsProjectProposalDetailProjection {
  proposalDueAt: Date | null;
  proposalSubmittedAt: Date | null;
  proposalVersion: number | null;
  estimateAmount: bigint | null;
  estimateUnitCode: string | null;
  proposalScopeSummary: string | null;
  decisionDeadlineAt: Date | null;
  memo: string | null;
  updatedAt: Date;
}

interface PmsProjectExecutionDetailProjection {
  contractSignedAt: Date | null;
  contractAmount: bigint | null;
  contractUnitCode: string | null;
  billingTypeCode: string | null;
  deliveryMethodCode: string | null;
  memo: string | null;
  updatedAt: Date;
}

interface PmsProjectTransitionDetailProjection {
  operationReservedAt: Date | null;
  operationStartAt: Date | null;
  transitionDueAt: Date | null;
  transitionSummary: string | null;
  memo: string | null;
  updatedAt: Date;
}

interface PmsUserLabelProjection {
  userName: string;
  displayName: string | null;
}

interface PmsOrganizationLabelProjection {
  orgCode: string;
  orgName: string;
}

interface PmsProjectMemberProjection {
  userId: bigint;
  roleCode: string;
  organizationId: bigint | null;
  accessLevel: string;
  isPhaseOwner: boolean;
}

interface PmsProjectOrgProjection {
  organizationId: bigint;
  roleCode: string;
  organization?: PmsOrganizationLabelProjection | null;
}

interface PmsProjectAclProjection {
  id: bigint;
  currentOwnerUserId: bigint | null;
  ownerOrganizationId: bigint | null;
  currentOwner?: PmsUserLabelProjection | null;
  ownerOrganization?: PmsOrganizationLabelProjection | null;
  projectMembers: PmsProjectMemberProjection[];
  projectOrgs: PmsProjectOrgProjection[];
}

interface PmsProjectProjection {
  id: bigint;
  projectName: string;
  statusCode: string;
  stageCode: string;
  doneResultCode: string | null;
  currentOwnerUserId: bigint | null;
  ownerOrganizationId: bigint | null;
  currentOwner: PmsUserLabelProjection | null;
  ownerOrganization: PmsOrganizationLabelProjection | null;
  customerId: bigint | null;
  plantId: bigint | null;
  systemInstanceId: bigint | null;
  handoffTypeCode: string | null;
  handoffStatusCode: string | null;
  handoffRequestedAt: Date | null;
  handoffConfirmedAt: Date | null;
  memo: string | null;
  updatedAt: Date;
  requestDetail: PmsProjectRequestDetailProjection | null;
  proposalDetail: PmsProjectProposalDetailProjection | null;
  executionDetail: PmsProjectExecutionDetailProjection | null;
  transitionDetail: PmsProjectTransitionDetailProjection | null;
  projectStatuses: PmsProjectStatusProjection[];
  projectMembers: PmsProjectMemberProjection[];
  projectOrgs: PmsProjectOrgProjection[];
}

interface PmsProjectMemberUserProjection {
  id: bigint;
  userName: string;
  displayName: string | null;
  email: string | null;
  departmentCode: string | null;
  positionCode: string | null;
}

interface PmsProjectMemberObjectProjection {
  projectId: bigint;
  userId: bigint;
  roleCode: string;
  organizationId: bigint | null;
  accessLevel: string;
  isPhaseOwner: boolean;
  assignedAt: Date;
  releasedAt: Date | null;
  allocationRate: number;
  memo: string | null;
  updatedAt: Date;
  user: PmsProjectMemberUserProjection;
  project: PmsProjectAclProjection & {
    projectName: string;
    statusCode: string;
    stageCode: string;
    updatedAt: Date;
  };
}

interface PmsProjectStatusObjectProjection {
  projectId: bigint;
  statusCode: string;
  statusGoal: string;
  statusOwnerUserId: bigint | null;
  expectedStartAt: Date | null;
  expectedEndAt: Date | null;
  actualStartAt: Date | null;
  actualEndAt: Date | null;
  closeConditionGroupCode: string | null;
  memo: string | null;
  updatedAt: Date;
  project: PmsProjectAclProjection & {
    projectName: string;
    statusCode: string;
    stageCode: string;
    updatedAt: Date;
  };
}

interface PmsTaskAssigneeProjection {
  id: bigint;
  userName: string;
  displayName: string | null;
}

interface PmsTaskWbsProjection {
  id: bigint;
  wbsCode: string;
  wbsName: string;
  statusCode: string;
}

interface PmsTaskParentProjection {
  id: bigint;
  taskCode: string;
  taskName: string;
}

interface PmsTaskProjectProjection extends PmsProjectAclProjection {
  id: bigint;
  projectName: string;
  statusCode: string;
  stageCode: string;
  currentOwnerUserId: bigint | null;
  ownerOrganizationId: bigint | null;
  updatedAt: Date;
  projectMembers: PmsProjectMemberProjection[];
  projectOrgs: PmsProjectOrgProjection[];
}

interface PmsTaskProjection {
  id: bigint;
  projectId: bigint;
  wbsId: bigint | null;
  parentTaskId: bigint | null;
  taskCode: string;
  taskName: string;
  description: string | null;
  taskTypeCode: string | null;
  statusCode: string;
  priorityCode: string;
  assigneeUserId: bigint | null;
  plannedStartAt: Date | null;
  plannedEndAt: Date | null;
  actualStartAt: Date | null;
  actualEndAt: Date | null;
  progressRate: number;
  estimatedHours: { toString(): string } | number | null;
  actualHours: { toString(): string } | number | null;
  depth: number;
  sortOrder: number;
  memo: string | null;
  updatedAt: Date;
  assignee: PmsTaskAssigneeProjection | null;
  wbs: PmsTaskWbsProjection | null;
  parentTask: PmsTaskParentProjection | null;
  project: PmsTaskProjectProjection;
}

interface ProjectionSection {
  key: string;
  title: string;
  text: string;
}

function pickString(value: string | null | undefined): string | undefined {
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

function formatUserLabel(user: PmsUserLabelProjection | null | undefined): string | undefined {
  const displayName = pickString(user?.displayName);
  const userName = pickString(user?.userName);

  if (displayName && userName && displayName !== userName) {
    return `${displayName} · ${userName}`;
  }

  return displayName ?? userName;
}

function formatOrganizationLabel(
  organization: PmsOrganizationLabelProjection | null | undefined,
): string | undefined {
  const organizationName = pickString(organization?.orgName);
  const organizationCode = pickString(organization?.orgCode);

  if (organizationName && organizationCode && organizationName !== organizationCode) {
    return `${organizationName} · ${organizationCode}`;
  }

  return organizationName ?? organizationCode;
}

function findProjectOrgLabel(
  project: { projectOrgs: PmsProjectOrgProjection[] },
  organizationId: bigint | null | undefined,
): string | undefined {
  if (!organizationId) {
    return undefined;
  }

  const organization = project.projectOrgs.find((projectOrg) => projectOrg.organizationId === organizationId)?.organization;
  return formatOrganizationLabel(organization);
}

function parsePositiveBigIntId(value: string): bigint | null {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const id = BigInt(normalized);
  return id > 0n ? id : null;
}

function parseProjectStatusEntityId(value: string): { projectId: bigint; statusCode: string } | null {
  const [projectIdRaw, statusCodeRaw] = value.split(':');
  const projectId = projectIdRaw ? parsePositiveBigIntId(projectIdRaw) : null;
  const statusCode = pickString(statusCodeRaw);

  return projectId && statusCode ? { projectId, statusCode } : null;
}

function parseProjectMemberEntityId(value: string): { projectId: bigint; userId: bigint; roleCode: string } | null {
  const [projectIdRaw, userIdRaw, roleCodeRaw] = value.split(':');
  const projectId = projectIdRaw ? parsePositiveBigIntId(projectIdRaw) : null;
  const userId = userIdRaw ? parsePositiveBigIntId(userIdRaw) : null;
  const roleCode = pickString(roleCodeRaw);

  return projectId && userId && roleCode ? { projectId, userId, roleCode } : null;
}

function formatDate(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString().slice(0, 10) : undefined;
}

function formatDateTime(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString() : undefined;
}

function formatAmount(value: bigint | null | undefined, unitCode: string | null | undefined): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return `${value.toString()}${unitCode ? ` ${unitCode}` : ''}`;
}

function formatDecimal(value: { toString(): string } | number | null | undefined): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return value.toString();
}

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function appendLine(lines: string[], label: string, value: string | undefined): void {
  if (value) {
    lines.push(`${label}: ${value}`);
  }
}

function createSection(key: string, title: string, lines: string[]): ProjectionSection | null {
  const textLines = lines.filter((line) => line.trim().length > 0);
  if (textLines.length === 0) {
    return null;
  }

  return {
    key,
    title,
    text: [`## ${title}`, ...textLines].join('\n'),
  };
}

function buildSummary(project: PmsProjectProjection): string {
  return pickString(project.memo)
    ?? pickString(project.requestDetail?.requestSummary)
    ?? pickString(project.proposalDetail?.proposalScopeSummary)
    ?? pickString(project.transitionDetail?.transitionSummary)
    ?? `${project.statusCode} · ${project.stageCode}`;
}

function resolveSourceVersion(project: PmsProjectProjection): string {
  const updatedTimes = [
    project.updatedAt,
    project.requestDetail?.updatedAt,
    project.proposalDetail?.updatedAt,
    project.executionDetail?.updatedAt,
    project.transitionDetail?.updatedAt,
    ...project.projectStatuses.map((status) => status.updatedAt),
  ]
    .filter((value): value is Date => Boolean(value))
    .map((value) => value.getTime());
  const latestUpdatedAt = new Date(Math.max(...updatedTimes));
  return latestUpdatedAt.toISOString();
}

function buildSections(project: PmsProjectProjection): ProjectionSection[] {
  const overviewLines: string[] = [];
  appendLine(overviewLines, 'Project', project.projectName);
  appendLine(overviewLines, 'Status', project.statusCode);
  appendLine(overviewLines, 'Stage', project.stageCode);
  appendLine(overviewLines, 'Done result', project.doneResultCode ?? undefined);
  appendLine(overviewLines, 'Memo', pickString(project.memo));
  appendLine(overviewLines, 'Owner', formatUserLabel(project.currentOwner));
  appendLine(overviewLines, 'Owner organization', formatOrganizationLabel(project.ownerOrganization));

  const requestLines: string[] = [];
  appendLine(requestLines, 'Request source', project.requestDetail?.requestSourceCode ?? undefined);
  appendLine(requestLines, 'Request channel', project.requestDetail?.requestChannelCode ?? undefined);
  appendLine(requestLines, 'Request priority', project.requestDetail?.requestPriorityCode ?? undefined);
  appendLine(requestLines, 'Request received at', formatDate(project.requestDetail?.requestReceivedAt));
  appendLine(requestLines, 'Request summary', pickString(project.requestDetail?.requestSummary));
  appendLine(requestLines, 'Request memo', pickString(project.requestDetail?.memo));

  const proposalLines: string[] = [];
  appendLine(proposalLines, 'Proposal due at', formatDate(project.proposalDetail?.proposalDueAt));
  appendLine(proposalLines, 'Proposal submitted at', formatDate(project.proposalDetail?.proposalSubmittedAt));
  appendLine(proposalLines, 'Proposal version', project.proposalDetail?.proposalVersion?.toString());
  appendLine(
    proposalLines,
    'Estimate amount',
    formatAmount(project.proposalDetail?.estimateAmount, project.proposalDetail?.estimateUnitCode),
  );
  appendLine(proposalLines, 'Decision deadline at', formatDate(project.proposalDetail?.decisionDeadlineAt));
  appendLine(proposalLines, 'Proposal scope summary', pickString(project.proposalDetail?.proposalScopeSummary));
  appendLine(proposalLines, 'Proposal memo', pickString(project.proposalDetail?.memo));

  const executionLines: string[] = [];
  appendLine(executionLines, 'Contract signed at', formatDate(project.executionDetail?.contractSignedAt));
  appendLine(
    executionLines,
    'Contract amount',
    formatAmount(project.executionDetail?.contractAmount, project.executionDetail?.contractUnitCode),
  );
  appendLine(executionLines, 'Billing type', project.executionDetail?.billingTypeCode ?? undefined);
  appendLine(executionLines, 'Delivery method', project.executionDetail?.deliveryMethodCode ?? undefined);
  appendLine(executionLines, 'Execution memo', pickString(project.executionDetail?.memo));

  const transitionLines: string[] = [];
  appendLine(transitionLines, 'Operation reserved at', formatDate(project.transitionDetail?.operationReservedAt));
  appendLine(transitionLines, 'Operation start at', formatDate(project.transitionDetail?.operationStartAt));
  appendLine(transitionLines, 'Transition due at', formatDate(project.transitionDetail?.transitionDueAt));
  appendLine(transitionLines, 'Transition summary', pickString(project.transitionDetail?.transitionSummary));
  appendLine(transitionLines, 'Transition memo', pickString(project.transitionDetail?.memo));

  const statusLines = project.projectStatuses.flatMap((status) => {
    const parts = [
      status.statusCode,
      status.statusGoal,
      formatDate(status.expectedStartAt) ? `expected ${formatDate(status.expectedStartAt)}~${formatDate(status.expectedEndAt) ?? ''}` : undefined,
      formatDate(status.actualStartAt) ? `actual ${formatDate(status.actualStartAt)}~${formatDate(status.actualEndAt) ?? ''}` : undefined,
      pickString(status.memo),
    ].filter((value): value is string => Boolean(value));
    return parts.length > 0 ? [`- ${parts.join(' / ')}`] : [];
  });

  const handoffLines: string[] = [];
  appendLine(handoffLines, 'Handoff type', project.handoffTypeCode ?? undefined);
  appendLine(handoffLines, 'Handoff status', project.handoffStatusCode ?? undefined);
  appendLine(handoffLines, 'Handoff requested at', formatDateTime(project.handoffRequestedAt));
  appendLine(handoffLines, 'Handoff confirmed at', formatDateTime(project.handoffConfirmedAt));

  return [
    createSection('overview', 'Project Overview', overviewLines),
    createSection('request', 'Request Detail', requestLines),
    createSection('proposal', 'Proposal Detail', proposalLines),
    createSection('execution', 'Execution Detail', executionLines),
    createSection('transition', 'Transition Detail', transitionLines),
    createSection('status', 'Status Timeline', statusLines),
    createSection('handoff', 'Handoff', handoffLines),
  ].filter((section): section is ProjectionSection => Boolean(section));
}

function buildChunks(project: PmsProjectProjection, sections: ProjectionSection[]): AiIndexChunkProjection[] {
  return sections.map((section, index) => ({
    chunkKey: `pms-project-${section.key}`,
    chunkSeq: index,
    chunkText: section.text,
    chunkHash: hashText(section.text),
    citationLabel: `${project.projectName} · ${section.title}`,
    metadata: {
      projectId: project.id.toString(),
      section: section.key,
      sectionTitle: section.title,
    },
  }));
}

function buildProjectScopedAclSnapshot(
  project: PmsProjectAclProjection,
  extraUserIds: Array<string | undefined> = [],
): AiIndexJsonObject {
  const ownerUserId = project.currentOwnerUserId?.toString();
  const memberUserIds = uniqueStrings(project.projectMembers.map((member) => member.userId.toString()));
  const readableUserIds = uniqueStrings([ownerUserId, ...extraUserIds, ...memberUserIds]);
  const organizationIds = uniqueStrings([
    project.ownerOrganizationId?.toString(),
    ...project.projectMembers.map((member) => member.organizationId?.toString()),
    ...project.projectOrgs.map((org) => org.organizationId.toString()),
  ]);

  return {
    projectId: project.id.toString(),
    ownerUserId: ownerUserId ?? '',
    readableUserIds,
    userIds: readableUserIds,
    organizationIds,
    projectMemberRoles: project.projectMembers.map((member) => ({
      userId: member.userId.toString(),
      roleCode: member.roleCode,
      accessLevel: member.accessLevel,
      organizationId: member.organizationId?.toString() ?? '',
      isPhaseOwner: member.isPhaseOwner,
    })),
    projectOrgRoles: project.projectOrgs.map((org) => ({
      organizationId: org.organizationId.toString(),
      roleCode: org.roleCode,
    })),
  };
}

function buildAclSnapshot(project: PmsProjectProjection): AiIndexJsonObject {
  return buildProjectScopedAclSnapshot(project);
}

function buildMetadata(project: PmsProjectProjection, sourceVersion: string): AiIndexJsonObject {
  return {
    projectId: project.id.toString(),
    statusCode: project.statusCode,
    stageCode: project.stageCode,
    doneResultCode: project.doneResultCode ?? '',
    customerId: project.customerId?.toString() ?? '',
    plantId: project.plantId?.toString() ?? '',
    systemInstanceId: project.systemInstanceId?.toString() ?? '',
    ownerOrganizationId: project.ownerOrganizationId?.toString() ?? '',
    currentOwnerUserId: project.currentOwnerUserId?.toString() ?? '',
    handoffTypeCode: project.handoffTypeCode ?? '',
    handoffStatusCode: project.handoffStatusCode ?? '',
    sourceVersion,
    updatedAt: project.updatedAt.toISOString(),
    projectStatusCount: project.projectStatuses.length,
    projectMemberCount: project.projectMembers.length,
    projectOrgCount: project.projectOrgs.length,
  };
}

function buildTaskSummary(task: PmsTaskProjection): string {
  return pickString(task.description)
    ?? pickString(task.memo)
    ?? `${task.statusCode} · ${task.priorityCode} · ${task.progressRate}%`;
}

function resolveTaskSourceVersion(task: PmsTaskProjection): string {
  const updatedTimes = [
    task.updatedAt,
    task.project.updatedAt,
  ]
    .filter((value): value is Date => Boolean(value))
    .map((value) => value.getTime());
  return new Date(Math.max(...updatedTimes)).toISOString();
}

function buildTaskSections(task: PmsTaskProjection): ProjectionSection[] {
  const overviewLines: string[] = [];
  appendLine(overviewLines, 'Task', task.taskName);
  appendLine(overviewLines, 'Task code', task.taskCode);
  appendLine(overviewLines, 'Project', task.project.projectName);
  appendLine(overviewLines, 'Project status', task.project.statusCode);
  appendLine(overviewLines, 'Project stage', task.project.stageCode);
  appendLine(overviewLines, 'Task type', task.taskTypeCode ?? undefined);
  appendLine(overviewLines, 'Status', task.statusCode);
  appendLine(overviewLines, 'Priority', task.priorityCode);
  appendLine(overviewLines, 'Progress', `${task.progressRate}%`);
  appendLine(overviewLines, 'Description', pickString(task.description));
  appendLine(overviewLines, 'Memo', pickString(task.memo));

  const scheduleLines: string[] = [];
  appendLine(scheduleLines, 'Planned start', formatDate(task.plannedStartAt));
  appendLine(scheduleLines, 'Planned end', formatDate(task.plannedEndAt));
  appendLine(scheduleLines, 'Actual start', formatDate(task.actualStartAt));
  appendLine(scheduleLines, 'Actual end', formatDate(task.actualEndAt));
  appendLine(scheduleLines, 'Estimated hours', formatDecimal(task.estimatedHours));
  appendLine(scheduleLines, 'Actual hours', formatDecimal(task.actualHours));

  const assignmentLines: string[] = [];
  appendLine(assignmentLines, 'Assignee name', pickString(task.assignee?.displayName) ?? pickString(task.assignee?.userName));
  appendLine(assignmentLines, 'WBS code', task.wbs?.wbsCode);
  appendLine(assignmentLines, 'WBS name', task.wbs?.wbsName);
  appendLine(assignmentLines, 'WBS status', task.wbs?.statusCode);
  appendLine(assignmentLines, 'Parent task code', task.parentTask?.taskCode);
  appendLine(assignmentLines, 'Parent task name', task.parentTask?.taskName);
  appendLine(assignmentLines, 'Depth', task.depth.toString());
  appendLine(assignmentLines, 'Sort order', task.sortOrder.toString());

  return [
    createSection('overview', 'Task Overview', overviewLines),
    createSection('schedule', 'Task Schedule', scheduleLines),
    createSection('assignment', 'Task Assignment and WBS', assignmentLines),
  ].filter((section): section is ProjectionSection => Boolean(section));
}

function buildTaskChunks(task: PmsTaskProjection, sections: ProjectionSection[]): AiIndexChunkProjection[] {
  return sections.map((section, index) => ({
    chunkKey: `pms-task-${section.key}`,
    chunkSeq: index,
    chunkText: section.text,
    chunkHash: hashText(section.text),
    citationLabel: `${task.project.projectName} · ${task.taskName} · ${section.title}`,
    metadata: {
      projectId: task.projectId.toString(),
      taskId: task.id.toString(),
      taskCode: task.taskCode,
      section: section.key,
      sectionTitle: section.title,
    },
  }));
}

function buildTaskAclSnapshot(task: PmsTaskProjection): AiIndexJsonObject {
  const assigneeUserId = task.assigneeUserId?.toString();
  const snapshot = buildProjectScopedAclSnapshot(task.project, [assigneeUserId]);

  return {
    ...snapshot,
    assigneeUserId: assigneeUserId ?? '',
    projectId: task.projectId.toString(),
  };
}

function buildTaskMetadata(task: PmsTaskProjection, sourceVersion: string): AiIndexJsonObject {
  return {
    projectId: task.projectId.toString(),
    projectName: task.project.projectName,
    projectStatusCode: task.project.statusCode,
    projectStageCode: task.project.stageCode,
    taskId: task.id.toString(),
    taskCode: task.taskCode,
    taskTypeCode: task.taskTypeCode ?? '',
    statusCode: task.statusCode,
    priorityCode: task.priorityCode,
    assigneeUserId: task.assigneeUserId?.toString() ?? '',
    wbsId: task.wbsId?.toString() ?? '',
    parentTaskId: task.parentTaskId?.toString() ?? '',
    progressRate: task.progressRate,
    sourceVersion,
    updatedAt: task.updatedAt.toISOString(),
  };
}

function resolveProjectMemberEntityId(member: PmsProjectMemberObjectProjection): string {
  return `${member.projectId.toString()}:${member.userId.toString()}:${member.roleCode}`;
}

function resolveProjectStatusEntityId(status: PmsProjectStatusObjectProjection): string {
  return `${status.projectId.toString()}:${status.statusCode}`;
}

function buildProjectMemberSummary(member: PmsProjectMemberObjectProjection): string {
  const userLabel = pickString(member.user.displayName) ?? pickString(member.user.userName) ?? member.userId.toString();
  return `${userLabel} · ${member.roleCode} · ${member.accessLevel}`;
}

function resolveProjectMemberSourceVersion(member: PmsProjectMemberObjectProjection): string {
  const latestUpdatedAt = Math.max(member.updatedAt.getTime(), member.project.updatedAt.getTime());
  return new Date(latestUpdatedAt).toISOString();
}

function buildProjectMemberSections(member: PmsProjectMemberObjectProjection): ProjectionSection[] {
  const userLabel = pickString(member.user.displayName) ?? pickString(member.user.userName) ?? member.userId.toString();
  const assignmentLines: string[] = [];
  appendLine(assignmentLines, 'Project', member.project.projectName);
  appendLine(assignmentLines, 'Member', userLabel);
  appendLine(assignmentLines, 'User name', pickString(member.user.userName));
  appendLine(assignmentLines, 'Email', pickString(member.user.email));
  appendLine(assignmentLines, 'Department', pickString(member.user.departmentCode));
  appendLine(assignmentLines, 'Position', pickString(member.user.positionCode));
  appendLine(assignmentLines, 'Role', member.roleCode);
  appendLine(assignmentLines, 'Access level', member.accessLevel);
  appendLine(assignmentLines, 'Phase owner', member.isPhaseOwner ? 'yes' : 'no');
  appendLine(assignmentLines, 'Organization', findProjectOrgLabel(member.project, member.organizationId));
  appendLine(assignmentLines, 'Allocation rate', `${member.allocationRate}%`);
  appendLine(assignmentLines, 'Assigned at', formatDate(member.assignedAt));
  appendLine(assignmentLines, 'Released at', formatDate(member.releasedAt));
  appendLine(assignmentLines, 'Memo', pickString(member.memo));

  const projectLines: string[] = [];
  appendLine(projectLines, 'Project status', member.project.statusCode);
  appendLine(projectLines, 'Project stage', member.project.stageCode);
  appendLine(projectLines, 'Project owner', formatUserLabel(member.project.currentOwner));
  appendLine(projectLines, 'Project owner organization', formatOrganizationLabel(member.project.ownerOrganization));

  return [
    createSection('assignment', 'Project Member Assignment', assignmentLines),
    createSection('project-context', 'Project Context', projectLines),
  ].filter((section): section is ProjectionSection => Boolean(section));
}

function buildProjectMemberChunks(
  member: PmsProjectMemberObjectProjection,
  sections: ProjectionSection[],
): AiIndexChunkProjection[] {
  const userLabel = pickString(member.user.displayName) ?? pickString(member.user.userName) ?? member.userId.toString();
  return sections.map((section, index) => ({
    chunkKey: `pms-project-member-${section.key}`,
    chunkSeq: index,
    chunkText: section.text,
    chunkHash: hashText(section.text),
    citationLabel: `${member.project.projectName} · ${userLabel} · ${section.title}`,
    metadata: {
      projectId: member.projectId.toString(),
      userId: member.userId.toString(),
      roleCode: member.roleCode,
      section: section.key,
      sectionTitle: section.title,
    },
  }));
}

function buildProjectMemberMetadata(
  member: PmsProjectMemberObjectProjection,
  sourceVersion: string,
): AiIndexJsonObject {
  return {
    projectId: member.projectId.toString(),
    projectName: member.project.projectName,
    projectStatusCode: member.project.statusCode,
    projectStageCode: member.project.stageCode,
    userId: member.userId.toString(),
    userName: member.user.userName,
    displayName: member.user.displayName ?? '',
    roleCode: member.roleCode,
    accessLevel: member.accessLevel,
    organizationId: member.organizationId?.toString() ?? '',
    isPhaseOwner: member.isPhaseOwner,
    allocationRate: member.allocationRate,
    assignedAt: member.assignedAt.toISOString(),
    releasedAt: member.releasedAt?.toISOString() ?? '',
    sourceVersion,
    updatedAt: member.updatedAt.toISOString(),
  };
}

function buildProjectMemberAclSnapshot(member: PmsProjectMemberObjectProjection): AiIndexJsonObject {
  return {
    ...buildProjectScopedAclSnapshot(member.project, [member.userId.toString()]),
    memberUserId: member.userId.toString(),
    memberRoleCode: member.roleCode,
    memberAccessLevel: member.accessLevel,
    isPhaseOwner: member.isPhaseOwner,
  };
}

function buildProjectStatusSummary(status: PmsProjectStatusObjectProjection): string {
  return pickString(status.statusGoal)
    ?? pickString(status.memo)
    ?? `${status.project.statusCode} · ${status.project.stageCode}`;
}

function resolveProjectStatusSourceVersion(status: PmsProjectStatusObjectProjection): string {
  const latestUpdatedAt = Math.max(status.updatedAt.getTime(), status.project.updatedAt.getTime());
  return new Date(latestUpdatedAt).toISOString();
}

function buildProjectStatusSections(status: PmsProjectStatusObjectProjection): ProjectionSection[] {
  const detailLines: string[] = [];
  appendLine(detailLines, 'Project', status.project.projectName);
  appendLine(detailLines, 'Lifecycle status', status.statusCode);
  appendLine(detailLines, 'Status goal', pickString(status.statusGoal));
  appendLine(detailLines, 'Close condition group', pickString(status.closeConditionGroupCode));
  appendLine(detailLines, 'Memo', pickString(status.memo));

  const scheduleLines: string[] = [];
  appendLine(scheduleLines, 'Expected start', formatDate(status.expectedStartAt));
  appendLine(scheduleLines, 'Expected end', formatDate(status.expectedEndAt));
  appendLine(scheduleLines, 'Actual start', formatDate(status.actualStartAt));
  appendLine(scheduleLines, 'Actual end', formatDate(status.actualEndAt));

  const projectLines: string[] = [];
  appendLine(projectLines, 'Project current status', status.project.statusCode);
  appendLine(projectLines, 'Project stage', status.project.stageCode);
  appendLine(projectLines, 'Project owner', formatUserLabel(status.project.currentOwner));
  appendLine(projectLines, 'Project owner organization', formatOrganizationLabel(status.project.ownerOrganization));

  return [
    createSection('detail', 'Project Status Detail', detailLines),
    createSection('schedule', 'Project Status Schedule', scheduleLines),
    createSection('project-context', 'Project Context', projectLines),
  ].filter((section): section is ProjectionSection => Boolean(section));
}

function buildProjectStatusChunks(
  status: PmsProjectStatusObjectProjection,
  sections: ProjectionSection[],
): AiIndexChunkProjection[] {
  return sections.map((section, index) => ({
    chunkKey: `pms-project-status-${section.key}`,
    chunkSeq: index,
    chunkText: section.text,
    chunkHash: hashText(section.text),
    citationLabel: `${status.project.projectName} · ${status.statusCode} · ${section.title}`,
    metadata: {
      projectId: status.projectId.toString(),
      statusCode: status.statusCode,
      section: section.key,
      sectionTitle: section.title,
    },
  }));
}

function buildProjectStatusMetadata(
  status: PmsProjectStatusObjectProjection,
  sourceVersion: string,
): AiIndexJsonObject {
  return {
    projectId: status.projectId.toString(),
    projectName: status.project.projectName,
    projectStatusCode: status.project.statusCode,
    projectStageCode: status.project.stageCode,
    statusCode: status.statusCode,
    statusOwnerUserId: status.statusOwnerUserId?.toString() ?? '',
    expectedStartAt: status.expectedStartAt?.toISOString() ?? '',
    expectedEndAt: status.expectedEndAt?.toISOString() ?? '',
    actualStartAt: status.actualStartAt?.toISOString() ?? '',
    actualEndAt: status.actualEndAt?.toISOString() ?? '',
    closeConditionGroupCode: status.closeConditionGroupCode ?? '',
    sourceVersion,
    updatedAt: status.updatedAt.toISOString(),
  };
}

function buildProjectStatusAclSnapshot(status: PmsProjectStatusObjectProjection): AiIndexJsonObject {
  return {
    ...buildProjectScopedAclSnapshot(status.project, [status.statusOwnerUserId?.toString()]),
    statusOwnerUserId: status.statusOwnerUserId?.toString() ?? '',
    statusCode: status.statusCode,
  };
}

@Injectable()
export class PmsAiIndexAdapter implements AiIndexAdapter, OnModuleInit {
  readonly sourceApp = 'pms';
  readonly label = 'PMS';
  readonly sourceKind = 'domain';
  readonly adapterCode = 'pms.project.ai-index';

  get capabilities() {
    const embeddingReady = this.embeddingProvider.getStatus('default').ready;

    return {
      keyword: true,
      metadata: true,
      semantic: embeddingReady,
      vector: embeddingReady,
      ragContext: embeddingReady,
      indexing: true,
    };
  }

  constructor(
    private readonly db: DatabaseService,
    private readonly registry: AiIndexRegistryService,
    private readonly embeddingProvider: AiEmbeddingProviderService,
    private readonly access: ProjectAccessService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async canRead(request: AiIndexObjectRef, user: TokenPayload): Promise<boolean> {
    let projectId: bigint | null = null;
    if (request.entityType === 'project') projectId = parsePositiveBigIntId(request.entityId);
    else if (request.entityType === 'task') {
      const id = parsePositiveBigIntId(request.entityId);
      if (id) projectId = (await this.db.client.task.findUnique({ where: { id }, select: { projectId: true } }))?.projectId ?? null;
    } else if (request.entityType === 'projectMember') {
      const ref = parseProjectMemberEntityId(request.entityId);
      if (ref && await this.findProjectMemberProjection(ref.projectId, ref.userId, ref.roleCode)) projectId = ref.projectId;
    } else if (request.entityType === 'projectStatus') {
      const ref = parseProjectStatusEntityId(request.entityId);
      if (ref && await this.findProjectStatusProjection(ref.projectId, ref.statusCode)) projectId = ref.projectId;
    }
    if (!projectId || !await this.db.client.project.count({ where: { id: projectId, isActive: true } })) return false;
    return (await this.access.getProjectAccess(projectId, user)).features.canViewProject;
  }

  async syncObject(request: AiIndexAdapterSyncRequest): Promise<AiIndexAdapterSyncResult> {
    if (
      request.entityType !== 'project'
      && request.entityType !== 'task'
      && request.entityType !== 'projectMember'
      && request.entityType !== 'projectStatus'
    ) {
      return {
        status: 'skipped',
        reasonCode: 'unsupported_entity_type',
        reasonMessage: `PMS AI index supports project, task, projectMember, and projectStatus entities only: ${request.entityType}`,
      };
    }

    if (request.entityType === 'task') {
      return this.syncTaskObject(request);
    }

    if (request.entityType === 'projectMember') {
      return this.syncProjectMemberObject(request);
    }

    if (request.entityType === 'projectStatus') {
      return this.syncProjectStatusObject(request);
    }

    return this.syncProjectObject(request);
  }

  private async syncProjectObject(request: AiIndexAdapterSyncRequest): Promise<AiIndexAdapterSyncResult> {
    const projectId = parsePositiveBigIntId(request.entityId);
    if (!projectId) {
      return {
        status: 'skipped',
        reasonCode: 'invalid_project_id',
        reasonMessage: `PMS AI index project id is invalid: ${request.entityId}`,
      };
    }

    if (request.jobType === 'delete') {
      return {
        status: 'deleted',
        reasonCode: 'deleted_by_source',
        reasonMessage: 'PMS source requested AI index deletion.',
      };
    }

    const project = await this.findProjectProjection(projectId);
    if (!project) {
      return {
        status: 'skipped',
        reasonCode: 'missing_project',
        reasonMessage: `PMS project does not exist or is inactive: ${request.entityId}`,
      };
    }

    const sourceVersion = request.sourceVersion ?? resolveSourceVersion(project);
    const sections = buildSections(project);
    const bodyText = sections.map((section) => section.text).join('\n\n');
    const summary = buildSummary(project);
    const aclSnapshot = buildAclSnapshot(project);
    const sensitivity: AiIndexSensitivityCode = 'internal';

    return {
      status: 'indexed',
      projection: {
        sourceApp: 'pms',
        sourceName: 'PMS',
        sourceKind: 'domain',
        adapterCode: this.adapterCode,
        embeddingProfileCode: 'default',
        capabilities: this.capabilities,
        entityType: 'project',
        entityId: project.id.toString(),
        sourceVersion,
        title: project.projectName,
        bodyText,
        summary,
        target: {
          sourceApp: 'pms',
          path: '/project/detail',
        },
        metadata: buildMetadata(project, sourceVersion),
        contentHash: hashText(bodyText),
        sensitivity,
        acl: {
          accessScope: 'acl',
          sensitivity,
          searchEligible: true,
          contextEligible: true,
          policyHash: hashText(JSON.stringify(aclSnapshot)),
          snapshot: aclSnapshot,
        },
        chunks: buildChunks(project, sections),
      },
    };
  }

  private async syncTaskObject(request: AiIndexAdapterSyncRequest): Promise<AiIndexAdapterSyncResult> {
    const taskId = parsePositiveBigIntId(request.entityId);
    if (!taskId) {
      return {
        status: 'skipped',
        reasonCode: 'invalid_task_id',
        reasonMessage: `PMS AI index task id is invalid: ${request.entityId}`,
      };
    }

    if (request.jobType === 'delete') {
      return {
        status: 'deleted',
        reasonCode: 'deleted_by_source',
        reasonMessage: 'PMS task source requested AI index deletion.',
      };
    }

    const task = await this.findTaskProjection(taskId);
    if (!task) {
      return {
        status: 'skipped',
        reasonCode: 'missing_task',
        reasonMessage: `PMS task does not exist or is inactive: ${request.entityId}`,
      };
    }

    const sourceVersion = request.sourceVersion ?? resolveTaskSourceVersion(task);
    const sections = buildTaskSections(task);
    const bodyText = sections.map((section) => section.text).join('\n\n');
    const summary = buildTaskSummary(task);
    const aclSnapshot = buildTaskAclSnapshot(task);
    const sensitivity: AiIndexSensitivityCode = 'internal';

    return {
      status: 'indexed',
      projection: {
        sourceApp: 'pms',
        sourceName: 'PMS',
        sourceKind: 'domain',
        adapterCode: this.adapterCode,
        embeddingProfileCode: 'default',
        capabilities: this.capabilities,
        entityType: 'task',
        entityId: task.id.toString(),
        sourceVersion,
        title: task.taskName,
        bodyText,
        summary,
        target: {
          sourceApp: 'pms',
          path: '/project/detail',
        },
        metadata: buildTaskMetadata(task, sourceVersion),
        contentHash: hashText(bodyText),
        sensitivity,
        acl: {
          accessScope: 'acl',
          sensitivity,
          searchEligible: true,
          contextEligible: true,
          policyHash: hashText(JSON.stringify(aclSnapshot)),
          snapshot: aclSnapshot,
        },
        chunks: buildTaskChunks(task, sections),
      },
    };
  }

  private async syncProjectMemberObject(request: AiIndexAdapterSyncRequest): Promise<AiIndexAdapterSyncResult> {
    const parsed = parseProjectMemberEntityId(request.entityId);
    if (!parsed) {
      return {
        status: 'skipped',
        reasonCode: 'invalid_project_member_id',
        reasonMessage: `PMS AI index project member id is invalid: ${request.entityId}`,
      };
    }

    if (request.jobType === 'delete') {
      return {
        status: 'deleted',
        reasonCode: 'deleted_by_source',
        reasonMessage: 'PMS project member source requested AI index deletion.',
      };
    }

    const member = await this.findProjectMemberProjection(parsed.projectId, parsed.userId, parsed.roleCode);
    if (!member) {
      return {
        status: 'skipped',
        reasonCode: 'missing_project_member',
        reasonMessage: `PMS project member does not exist or is inactive: ${request.entityId}`,
      };
    }

    const sourceVersion = request.sourceVersion ?? resolveProjectMemberSourceVersion(member);
    const sections = buildProjectMemberSections(member);
    const bodyText = sections.map((section) => section.text).join('\n\n');
    const summary = buildProjectMemberSummary(member);
    const aclSnapshot = buildProjectMemberAclSnapshot(member);
    const sensitivity: AiIndexSensitivityCode = 'internal';
    const userLabel = pickString(member.user.displayName) ?? pickString(member.user.userName) ?? member.userId.toString();

    return {
      status: 'indexed',
      projection: {
        sourceApp: 'pms',
        sourceName: 'PMS',
        sourceKind: 'domain',
        adapterCode: this.adapterCode,
        embeddingProfileCode: 'default',
        capabilities: this.capabilities,
        entityType: 'projectMember',
        entityId: resolveProjectMemberEntityId(member),
        sourceVersion,
        title: `${member.project.projectName} · ${userLabel} · ${member.roleCode}`,
        bodyText,
        summary,
        target: {
          sourceApp: 'pms',
          path: '/project/detail',
        },
        metadata: buildProjectMemberMetadata(member, sourceVersion),
        contentHash: hashText(bodyText),
        sensitivity,
        acl: {
          accessScope: 'acl',
          sensitivity,
          searchEligible: true,
          contextEligible: true,
          policyHash: hashText(JSON.stringify(aclSnapshot)),
          snapshot: aclSnapshot,
        },
        chunks: buildProjectMemberChunks(member, sections),
      },
    };
  }

  private async syncProjectStatusObject(request: AiIndexAdapterSyncRequest): Promise<AiIndexAdapterSyncResult> {
    const parsed = parseProjectStatusEntityId(request.entityId);
    if (!parsed) {
      return {
        status: 'skipped',
        reasonCode: 'invalid_project_status_id',
        reasonMessage: `PMS AI index project status id is invalid: ${request.entityId}`,
      };
    }

    if (request.jobType === 'delete') {
      return {
        status: 'deleted',
        reasonCode: 'deleted_by_source',
        reasonMessage: 'PMS project status source requested AI index deletion.',
      };
    }

    const status = await this.findProjectStatusProjection(parsed.projectId, parsed.statusCode);
    if (!status) {
      return {
        status: 'skipped',
        reasonCode: 'missing_project_status',
        reasonMessage: `PMS project status does not exist or is inactive: ${request.entityId}`,
      };
    }

    const sourceVersion = request.sourceVersion ?? resolveProjectStatusSourceVersion(status);
    const sections = buildProjectStatusSections(status);
    const bodyText = sections.map((section) => section.text).join('\n\n');
    const summary = buildProjectStatusSummary(status);
    const aclSnapshot = buildProjectStatusAclSnapshot(status);
    const sensitivity: AiIndexSensitivityCode = 'internal';

    return {
      status: 'indexed',
      projection: {
        sourceApp: 'pms',
        sourceName: 'PMS',
        sourceKind: 'domain',
        adapterCode: this.adapterCode,
        embeddingProfileCode: 'default',
        capabilities: this.capabilities,
        entityType: 'projectStatus',
        entityId: resolveProjectStatusEntityId(status),
        sourceVersion,
        title: `${status.project.projectName} · ${status.statusCode}`,
        bodyText,
        summary,
        target: {
          sourceApp: 'pms',
          path: '/project/detail',
        },
        metadata: buildProjectStatusMetadata(status, sourceVersion),
        contentHash: hashText(bodyText),
        sensitivity,
        acl: {
          accessScope: 'acl',
          sensitivity,
          searchEligible: true,
          contextEligible: true,
          policyHash: hashText(JSON.stringify(aclSnapshot)),
          snapshot: aclSnapshot,
        },
        chunks: buildProjectStatusChunks(status, sections),
      },
    };
  }

  private async findProjectProjection(projectId: bigint): Promise<PmsProjectProjection | null> {
    const now = new Date();
    return this.db.client.project.findUnique({
      where: {
        id: projectId,
        isActive: true,
      },
      select: {
        id: true,
        projectName: true,
        statusCode: true,
        stageCode: true,
        doneResultCode: true,
        currentOwnerUserId: true,
        ownerOrganizationId: true,
        currentOwner: {
          select: {
            userName: true,
            displayName: true,
          },
        },
        ownerOrganization: {
          select: {
            orgCode: true,
            orgName: true,
          },
        },
        customerId: true,
        plantId: true,
        systemInstanceId: true,
        handoffTypeCode: true,
        handoffStatusCode: true,
        handoffRequestedAt: true,
        handoffConfirmedAt: true,
        memo: true,
        updatedAt: true,
        requestDetail: {
          select: {
            requestSourceCode: true,
            requestChannelCode: true,
            requestSummary: true,
            requestReceivedAt: true,
            requestPriorityCode: true,
            memo: true,
            updatedAt: true,
          },
        },
        proposalDetail: {
          select: {
            proposalDueAt: true,
            proposalSubmittedAt: true,
            proposalVersion: true,
            estimateAmount: true,
            estimateUnitCode: true,
            proposalScopeSummary: true,
            decisionDeadlineAt: true,
            memo: true,
            updatedAt: true,
          },
        },
        executionDetail: {
          select: {
            contractSignedAt: true,
            contractAmount: true,
            contractUnitCode: true,
            billingTypeCode: true,
            deliveryMethodCode: true,
            memo: true,
            updatedAt: true,
          },
        },
        transitionDetail: {
          select: {
            operationReservedAt: true,
            operationStartAt: true,
            transitionDueAt: true,
            transitionSummary: true,
            memo: true,
            updatedAt: true,
          },
        },
        projectStatuses: {
          where: { isActive: true },
          orderBy: { statusCode: 'asc' },
          select: {
            statusCode: true,
            statusGoal: true,
            expectedStartAt: true,
            expectedEndAt: true,
            actualStartAt: true,
            actualEndAt: true,
            memo: true,
            updatedAt: true,
          },
        },
        projectMembers: {
          where: {
            isActive: true,
            OR: [{ releasedAt: null }, { releasedAt: { gte: now } }],
          },
          orderBy: [{ sortOrder: 'asc' }, { roleCode: 'asc' }],
          select: {
            userId: true,
            roleCode: true,
            organizationId: true,
            accessLevel: true,
            isPhaseOwner: true,
          },
        },
        projectOrgs: {
          where: { isActive: true },
          orderBy: { roleCode: 'asc' },
          select: {
            organizationId: true,
            roleCode: true,
            organization: {
              select: {
                orgCode: true,
                orgName: true,
              },
            },
          },
        },
      },
    });
  }

  private async findTaskProjection(taskId: bigint): Promise<PmsTaskProjection | null> {
    const now = new Date();
    return this.db.client.task.findFirst({
      where: {
        id: taskId,
        isActive: true,
        project: {
          isActive: true,
        },
      },
      select: {
        id: true,
        projectId: true,
        wbsId: true,
        parentTaskId: true,
        taskCode: true,
        taskName: true,
        description: true,
        taskTypeCode: true,
        statusCode: true,
        priorityCode: true,
        assigneeUserId: true,
        plannedStartAt: true,
        plannedEndAt: true,
        actualStartAt: true,
        actualEndAt: true,
        progressRate: true,
        estimatedHours: true,
        actualHours: true,
        depth: true,
        sortOrder: true,
        memo: true,
        updatedAt: true,
        assignee: {
          select: {
            id: true,
            userName: true,
            displayName: true,
          },
        },
        wbs: {
          select: {
            id: true,
            wbsCode: true,
            wbsName: true,
            statusCode: true,
          },
        },
        parentTask: {
          select: {
            id: true,
            taskCode: true,
            taskName: true,
          },
        },
        project: {
          select: {
            id: true,
            projectName: true,
            statusCode: true,
            stageCode: true,
            currentOwnerUserId: true,
            ownerOrganizationId: true,
            currentOwner: {
              select: {
                userName: true,
                displayName: true,
              },
            },
            ownerOrganization: {
              select: {
                orgCode: true,
                orgName: true,
              },
            },
            updatedAt: true,
            projectMembers: {
              where: {
                isActive: true,
                OR: [{ releasedAt: null }, { releasedAt: { gte: now } }],
              },
              orderBy: [{ sortOrder: 'asc' }, { roleCode: 'asc' }],
              select: {
                userId: true,
                roleCode: true,
                organizationId: true,
                accessLevel: true,
                isPhaseOwner: true,
              },
            },
            projectOrgs: {
              where: { isActive: true },
              orderBy: { roleCode: 'asc' },
              select: {
                organizationId: true,
                roleCode: true,
                organization: {
                  select: {
                    orgCode: true,
                    orgName: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  private async findProjectMemberProjection(
    projectId: bigint,
    userId: bigint,
    roleCode: string,
  ): Promise<PmsProjectMemberObjectProjection | null> {
    const now = new Date();
    return this.db.client.projectMember.findFirst({
      where: {
        projectId,
        userId,
        roleCode,
        isActive: true,
        OR: [{ releasedAt: null }, { releasedAt: { gte: now } }],
        project: {
          isActive: true,
        },
      },
      select: {
        projectId: true,
        userId: true,
        roleCode: true,
        organizationId: true,
        accessLevel: true,
        isPhaseOwner: true,
        assignedAt: true,
        releasedAt: true,
        allocationRate: true,
        memo: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            userName: true,
            displayName: true,
            email: true,
            departmentCode: true,
            positionCode: true,
          },
        },
        project: {
          select: {
            id: true,
            projectName: true,
            statusCode: true,
            stageCode: true,
            currentOwnerUserId: true,
            ownerOrganizationId: true,
            currentOwner: {
              select: {
                userName: true,
                displayName: true,
              },
            },
            ownerOrganization: {
              select: {
                orgCode: true,
                orgName: true,
              },
            },
            updatedAt: true,
            projectMembers: {
              where: {
                isActive: true,
                OR: [{ releasedAt: null }, { releasedAt: { gte: now } }],
              },
              orderBy: [{ sortOrder: 'asc' }, { roleCode: 'asc' }],
              select: {
                userId: true,
                roleCode: true,
                organizationId: true,
                accessLevel: true,
                isPhaseOwner: true,
              },
            },
            projectOrgs: {
              where: { isActive: true },
              orderBy: { roleCode: 'asc' },
              select: {
                organizationId: true,
                roleCode: true,
                organization: {
                  select: {
                    orgCode: true,
                    orgName: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  private async findProjectStatusProjection(
    projectId: bigint,
    statusCode: string,
  ): Promise<PmsProjectStatusObjectProjection | null> {
    const now = new Date();
    return this.db.client.projectStatus.findFirst({
      where: {
        projectId,
        statusCode,
        isActive: true,
        project: {
          isActive: true,
        },
      },
      select: {
        projectId: true,
        statusCode: true,
        statusGoal: true,
        statusOwnerUserId: true,
        expectedStartAt: true,
        expectedEndAt: true,
        actualStartAt: true,
        actualEndAt: true,
        closeConditionGroupCode: true,
        memo: true,
        updatedAt: true,
        project: {
          select: {
            id: true,
            projectName: true,
            statusCode: true,
            stageCode: true,
            currentOwnerUserId: true,
            ownerOrganizationId: true,
            currentOwner: {
              select: {
                userName: true,
                displayName: true,
              },
            },
            ownerOrganization: {
              select: {
                orgCode: true,
                orgName: true,
              },
            },
            updatedAt: true,
            projectMembers: {
              where: {
                isActive: true,
                OR: [{ releasedAt: null }, { releasedAt: { gte: now } }],
              },
              orderBy: [{ sortOrder: 'asc' }, { roleCode: 'asc' }],
              select: {
                userId: true,
                roleCode: true,
                organizationId: true,
                accessLevel: true,
                isPhaseOwner: true,
              },
            },
            projectOrgs: {
              where: { isActive: true },
              orderBy: { roleCode: 'asc' },
              select: {
                organizationId: true,
                roleCode: true,
                organization: {
                  select: {
                    orgCode: true,
                    orgName: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}
