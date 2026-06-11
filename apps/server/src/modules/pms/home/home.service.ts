import { Injectable } from '@nestjs/common';
import type {
  PmsHomeAccessProject,
  PmsHomeAllowedAction,
  PmsHomeCapabilityKey,
  PmsHomeFlowItem,
  PmsHomeMetrics,
  PmsHomeRecentChange,
  PmsHomeRelation,
  PmsHomeRelationCounts,
  PmsHomeSignal,
  PmsHomeSignalKind,
  PmsHomeSignalSeverity,
  PmsHomeSummary,
  PmsHomeTargetTab,
  PmsProjectAccessFeatures,
  PmsProjectAccessSnapshot,
  ProjectStageCode,
  ProjectStatusCode,
} from '@ssoo/types';
import { DatabaseService } from '../../../database/database.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { isDeliverableSubmissionCompleted } from '../deliverable/deliverable.constants.js';
import { ProjectAccessService } from '../project/project-access.service.js';
import { ProjectService } from '../project/project.service.js';

type ProjectListItem = Awaited<ReturnType<ProjectService['findAll']>>['data'][number];

const HOME_PROJECT_LIMIT = 100;
const STATUS_ORDER: ProjectStatusCode[] = ['request', 'proposal', 'execution', 'transition'];
const TERMINAL_TASK_STATUSES = ['completed', 'cancelled'];
const OPEN_PROJECT_ISSUE_STATUSES = ['open', 'in_progress'];
const OPEN_RISK_STATUSES = ['identified', 'assessing', 'mitigating', 'open', 'in_progress'];
const ACTIVE_CHANGE_STATUSES = ['requested', 'reviewing', 'approved', 'in_progress'];
const PROJECT_DETAIL_PATH = '/project/detail';

const VIEW_ONLY_FEATURES: PmsProjectAccessFeatures = {
  canViewProject: true,
  canEditProject: false,
  canManageMembers: false,
  canManageTasks: false,
  canManageMilestones: false,
  canManageIssues: false,
  canManageDeliverables: false,
  canManageCloseConditions: false,
  canAdvanceStage: false,
};

@Injectable()
export class HomeService {
  constructor(
    private readonly db: DatabaseService,
    private readonly projectService: ProjectService,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async getSummary(currentUser: TokenPayload): Promise<PmsHomeSummary> {
    const { data: projects } = await this.projectService.findAll(
      { page: 1, limit: HOME_PROJECT_LIMIT },
      currentUser,
    );
    const generatedAt = new Date().toISOString();

    if (projects.length === 0) {
      return {
        generatedAt,
        relationCounts: { pm: 0, member: 0, pmo: 0, viewer: 0 },
        metrics: {
          active: 0,
          directActions: 0,
          attention: 0,
          pmoSignals: 0,
          closeout: 0,
          stale: 0,
          actionableProjects: 0,
          readOnlyProjects: 0,
        },
        briefing: ['열람 가능한 프로젝트가 아직 없습니다.'],
        signals: [],
        flow: this.buildFlow([]),
        recentChanges: [],
        accessProjects: [],
      };
    }

    const projectIds = projects.map((project) => project.id);
    const accessByProject = await this.resolveAccessByProject(projects, currentUser);
    const relationByProject = new Map<string, PmsHomeRelation>();
    const relationCounts: PmsHomeRelationCounts = { pm: 0, member: 0, pmo: 0, viewer: 0 };

    for (const project of projects) {
      const relation = this.resolveRelation(accessByProject.get(this.key(project.id)));
      relationByProject.set(this.key(project.id), relation);
      relationCounts[relation] += 1;
    }

    const [
      tasks,
      milestones,
      deliverables,
      closeConditions,
      projectIssues,
      risks,
      changeRequests,
    ] = await Promise.all([
      this.db.client.task.findMany({
        where: {
          projectId: { in: projectIds },
          isActive: true,
          statusCode: { notIn: TERMINAL_TASK_STATUSES },
        },
        select: { projectId: true, assigneeUserId: true, plannedEndAt: true, priorityCode: true },
      }),
      this.db.client.milestone.findMany({
        where: {
          projectId: { in: projectIds },
          isActive: true,
          statusCode: { notIn: ['achieved', 'cancelled'] },
        },
        select: { projectId: true, dueAt: true, statusCode: true },
      }),
      this.db.client.projectDeliverable.findMany({
        where: { projectId: { in: projectIds }, isActive: true },
        select: { projectId: true, submissionStatusCode: true, updatedAt: true },
      }),
      this.db.client.projectCloseCondition.findMany({
        where: { projectId: { in: projectIds }, isActive: true, isChecked: false },
        select: { projectId: true, statusCode: true },
      }),
      this.db.client.projectIssue.findMany({
        where: {
          projectId: { in: projectIds },
          isActive: true,
          statusCode: { in: OPEN_PROJECT_ISSUE_STATUSES },
        },
        select: { projectId: true, priorityCode: true, ownerUserId: true },
      }),
      this.db.client.projectRisk.findMany({
        where: {
          projectId: { in: projectIds },
          isActive: true,
          statusCode: { in: OPEN_RISK_STATUSES },
        },
        select: { projectId: true, impactCode: true, likelihoodCode: true, ownerUserId: true },
      }),
      this.db.client.projectChangeRequest.findMany({
        where: {
          projectId: { in: projectIds },
          isActive: true,
          statusCode: { in: ACTIVE_CHANGE_STATUSES },
        },
        select: { projectId: true, priorityCode: true, ownerUserId: true },
      }),
    ]);

    const taskMap = this.groupByProject(tasks);
    const milestoneMap = this.groupByProject(milestones);
    const deliverableMap = this.groupByProject(deliverables);
    const closeConditionMap = this.groupByProject(closeConditions);
    const projectIssueMap = this.groupByProject(projectIssues);
    const riskMap = this.groupByProject(risks);
    const changeRequestMap = this.groupByProject(changeRequests);
    const rawSignals: PmsHomeSignal[] = [];
    const currentUserId = BigInt(currentUser.userId);

    for (const project of projects) {
      const projectKey = this.key(project.id);
      const relation = relationByProject.get(projectKey) ?? 'viewer';
      const access = accessByProject.get(projectKey);
      const tasksForProject = taskMap.get(projectKey) ?? [];
      const milestonesForProject = milestoneMap.get(projectKey) ?? [];
      const deliverablesForProject = deliverableMap.get(projectKey) ?? [];
      const closeConditionsForProject = closeConditionMap.get(projectKey) ?? [];
      const issuesForProject = projectIssueMap.get(projectKey) ?? [];
      const risksForProject = riskMap.get(projectKey) ?? [];
      const changesForProject = changeRequestMap.get(projectKey) ?? [];

      this.addProjectStateSignals(rawSignals, project, relation, access);
      this.addMyTaskSignals(rawSignals, project, relation, access, tasksForProject, currentUserId);
      this.addManagementSignals(rawSignals, project, relation, access, {
        milestones: milestonesForProject,
        deliverables: deliverablesForProject,
        closeConditions: closeConditionsForProject,
        issues: issuesForProject,
        risks: risksForProject,
        changes: changesForProject,
      });
    }

    const accessProjects = this.buildAccessProjects(projects, relationByProject, accessByProject);
    const signals = this.collapseSignals(rawSignals);
    const metrics = this.buildMetrics(projects, rawSignals, accessProjects);

    return {
      generatedAt,
      relationCounts,
      metrics,
      briefing: this.buildBriefing(projects, signals, metrics),
      signals,
      flow: this.buildFlow(projects),
      recentChanges: this.buildRecentChanges(projects, relationByProject, accessByProject),
      accessProjects,
    };
  }

  private async resolveAccessByProject(
    projects: ProjectListItem[],
    currentUser: TokenPayload,
  ): Promise<Map<string, PmsProjectAccessSnapshot>> {
    const entries = await Promise.all(
      projects.map(async (project) => {
        const access = await this.projectAccessService.getProjectAccess(project.id, currentUser);
        return [this.key(project.id), access] as const;
      }),
    );
    return new Map(entries);
  }

  private resolveRelation(access?: PmsProjectAccessSnapshot): PmsHomeRelation {
    if (!access) return 'viewer';
    if (access.roles.isProjectOwner || access.features.canAdvanceStage) return 'pm';
    if (access.roles.isProjectMember) return 'member';
    if (access.roles.isOwnerOrganizationMember || access.policy.hasSystemOverride) return 'pmo';
    return 'viewer';
  }

  private addProjectStateSignals(
    signals: PmsHomeSignal[],
    project: ProjectListItem,
    relation: PmsHomeRelation,
    access?: PmsProjectAccessSnapshot,
  ) {
    const days = this.daysSince(project.updatedAt);
    const relationBoost = this.relationBoost(relation);

    if (project.stageCode === 'in_progress' && days >= 7) {
      signals.push(this.buildSignal(project, {
        relation: relation === 'viewer' ? 'pmo' : relation,
        kind: 'project-stale',
        severity: days >= 14 ? 'critical' : 'warning',
        label: '업데이트 정체',
        reason: `${days}일 동안 변동 없음`,
        nextActionLabel: '진행 확인',
        targetTab: 'overview',
        requiredCapability: null,
        sortWeight: 90 + relationBoost + Math.min(days, 30),
      }, access));
    }

    if (project.stageCode === 'in_progress' && !project.currentOwnerUserId) {
      signals.push(this.buildSignal(project, {
        relation: 'pmo',
        kind: 'project-unowned',
        severity: 'critical',
        label: '담당 미지정',
        reason: '현재 책임자 확인 필요',
        nextActionLabel: '담당 지정',
        targetTab: 'overview',
        requiredCapability: 'canEditProject',
        sortWeight: 120,
      }, access));
    }
  }

  private addMyTaskSignals(
    signals: PmsHomeSignal[],
    project: ProjectListItem,
    relation: PmsHomeRelation,
    access: PmsProjectAccessSnapshot | undefined,
    tasks: Array<{ assigneeUserId: bigint | null; plannedEndAt: Date | null; priorityCode: string }>,
    currentUserId: bigint,
  ) {
    const dueTasks = tasks.filter((task) =>
      task.assigneeUserId === currentUserId
      && task.plannedEndAt
      && this.isDueWithin(task.plannedEndAt, 7),
    );
    if (dueTasks.length === 0) return;

    const overdueCount = dueTasks.filter((task) => task.plannedEndAt && task.plannedEndAt.getTime() < this.startOfToday().getTime()).length;
    signals.push(this.buildSignal(project, {
      relation: relation === 'viewer' || relation === 'pmo' ? 'member' : relation,
      kind: 'my-task-due',
      severity: overdueCount > 0 ? 'critical' : 'warning',
      label: '내 작업 마감',
      reason: overdueCount > 0 ? `지연 ${overdueCount}건 포함` : `7일 내 ${dueTasks.length}건`,
      nextActionLabel: '작업 확인',
      targetTab: 'tasks',
      requiredCapability: 'canManageTasks',
      sortWeight: 126 + (overdueCount * 4),
    }, access));
  }

  private addManagementSignals(
    signals: PmsHomeSignal[],
    project: ProjectListItem,
    relation: PmsHomeRelation,
    access: PmsProjectAccessSnapshot | undefined,
    source: {
      milestones: Array<{ dueAt: Date | null; statusCode: string }>;
      deliverables: Array<{ submissionStatusCode: string }>;
      closeConditions: Array<{ statusCode: string }>;
      issues: Array<{ priorityCode: string; ownerUserId: bigint | null }>;
      risks: Array<{ impactCode: string; likelihoodCode: string; ownerUserId: bigint | null }>;
      changes: Array<{ priorityCode: string; ownerUserId: bigint | null }>;
    },
  ) {
    const managementRelation = relation === 'pm' || relation === 'pmo';
    if (!managementRelation) return;

    const relationBoost = this.relationBoost(relation);
    const delayedMilestones = source.milestones.filter((milestone) =>
      milestone.dueAt && milestone.dueAt.getTime() < this.startOfToday().getTime(),
    );
    const pendingDeliverables = source.deliverables.filter((deliverable) =>
      !isDeliverableSubmissionCompleted(deliverable.submissionStatusCode),
    );
    const blockingIssues = source.issues.filter((issue) =>
      ['critical', 'high'].includes(issue.priorityCode),
    );
    const highRisks = source.risks.filter((risk) =>
      ['critical', 'high'].includes(risk.impactCode) || risk.likelihoodCode === 'high',
    );
    const highChanges = source.changes.filter((change) =>
      ['critical', 'high'].includes(change.priorityCode),
    );
    const closeoutConditions = source.closeConditions.filter((condition) =>
      condition.statusCode === project.statusCode,
    );

    if (blockingIssues.length > 0) {
      signals.push(this.buildSignal(project, {
        relation,
        kind: 'project-issue-blocking',
        severity: blockingIssues.some((issue) => issue.priorityCode === 'critical') ? 'critical' : 'warning',
        label: '차단 이슈',
        reason: `${blockingIssues.length}건 확인 필요`,
        nextActionLabel: '이슈 확인',
        targetTab: 'controls',
        requiredCapability: 'canManageIssues',
        sortWeight: 116 + relationBoost + blockingIssues.length,
      }, access));
    }

    if (highRisks.length > 0) {
      signals.push(this.buildSignal(project, {
        relation,
        kind: 'project-risk-open',
        severity: highRisks.some((risk) => risk.impactCode === 'critical') ? 'critical' : 'warning',
        label: '위험 신호',
        reason: `${highRisks.length}건 열림`,
        nextActionLabel: '리스크 확인',
        targetTab: 'controls',
        requiredCapability: 'canManageIssues',
        sortWeight: 106 + relationBoost + highRisks.length,
      }, access));
    }

    if (delayedMilestones.length > 0) {
      signals.push(this.buildSignal(project, {
        relation,
        kind: 'milestone-delayed',
        severity: 'warning',
        label: '마일스톤 지연',
        reason: `${delayedMilestones.length}건 기한 경과`,
        nextActionLabel: '일정 확인',
        targetTab: 'milestones',
        requiredCapability: 'canManageMilestones',
        sortWeight: 100 + relationBoost + delayedMilestones.length,
      }, access));
    }

    if (pendingDeliverables.length > 0) {
      signals.push(this.buildSignal(project, {
        relation,
        kind: 'deliverable-approval-pending',
        severity: 'normal',
        label: '산출물 대기',
        reason: `${pendingDeliverables.length}건 미완료`,
        nextActionLabel: '산출물 확인',
        targetTab: 'deliverables',
        requiredCapability: 'canManageDeliverables',
        sortWeight: 88 + relationBoost + pendingDeliverables.length,
      }, access));
    }

    if (
      closeoutConditions.length > 0
      && (project.statusCode === 'transition' || project.statusCode === 'execution')
    ) {
      signals.push(this.buildSignal(project, {
        relation,
        kind: 'closeout-blocked',
        severity: 'warning',
        label: '종료 조건 미충족',
        reason: `${closeoutConditions.length}개 남음`,
        nextActionLabel: '종료 조건 보기',
        targetTab: 'closeConditions',
        requiredCapability: 'canManageCloseConditions',
        sortWeight: 94 + relationBoost + closeoutConditions.length,
      }, access));
    }

    if (
      project.statusCode === 'execution'
      && project.stageCode === 'done'
      && closeoutConditions.length === 0
      && pendingDeliverables.length === 0
    ) {
      signals.push(this.buildSignal(project, {
        relation,
        kind: 'stage-transition-ready',
        severity: 'normal',
        label: '전환 준비',
        reason: '완료 조건 확인 가능',
        nextActionLabel: '전환 확인',
        targetTab: 'stage',
        requiredCapability: 'canAdvanceStage',
        sortWeight: 86 + relationBoost,
      }, access));
    }

    if (highChanges.length > 0) {
      signals.push(this.buildSignal(project, {
        relation,
        kind: 'recent-change',
        severity: 'info',
        label: '주요 변경',
        reason: `${highChanges.length}건 검토 필요`,
        nextActionLabel: '변경 확인',
        targetTab: 'controls',
        requiredCapability: 'canManageIssues',
        sortWeight: 74 + relationBoost + highChanges.length,
      }, access));
    }
  }

  private buildSignal(
    project: ProjectListItem,
    input: {
      relation: PmsHomeRelation;
      kind: PmsHomeSignalKind;
      severity: PmsHomeSignalSeverity;
      label: string;
      reason: string;
      nextActionLabel: string;
      targetTab: PmsHomeTargetTab;
      requiredCapability?: PmsHomeCapabilityKey | null;
      sortWeight: number;
    },
    access?: PmsProjectAccessSnapshot,
  ): PmsHomeSignal {
    const allowedActions = this.buildAllowedActions(project, access);
    const primaryAction = this.resolvePrimaryAction(
      allowedActions,
      input.requiredCapability ?? null,
      input.targetTab,
    );

    return {
      id: `${project.id.toString()}-${input.kind}`,
      projectId: project.id.toString(),
      projectName: project.projectName,
      statusCode: project.statusCode as ProjectStatusCode,
      stageCode: project.stageCode as ProjectStageCode,
      currentOwnerUserId: project.currentOwnerUserId?.toString() ?? null,
      ownerOrganizationId: project.ownerOrganizationId?.toString() ?? null,
      updatedAt: project.updatedAt.toISOString(),
      targetPath: PROJECT_DETAIL_PATH,
      ...input,
      nextActionLabel: primaryAction?.label ?? input.nextActionLabel,
      allowedActions,
      primaryAction,
    };
  }

  private collapseSignals(signals: PmsHomeSignal[]): PmsHomeSignal[] {
    const byProject = new Map<string, PmsHomeSignal[]>();
    for (const signal of signals) {
      const group = byProject.get(signal.projectId) ?? [];
      group.push(signal);
      byProject.set(signal.projectId, group);
    }

    return Array.from(byProject.values())
      .map((group) => {
        const sorted = [...group].sort(this.sortSignals);
        return {
          ...sorted[0],
          relatedSignalCount: Math.max(0, group.length - 1),
        };
      })
      .sort(this.sortSignals);
  }

  private buildMetrics(
    projects: ProjectListItem[],
    signals: PmsHomeSignal[],
    accessProjects: PmsHomeAccessProject[],
  ): PmsHomeMetrics {
    return {
      active: projects.filter((project) => project.stageCode === 'in_progress').length,
      directActions: signals.filter((signal) => this.isActionable(signal.primaryAction)).length,
      attention: signals.length,
      pmoSignals: signals.filter((signal) => signal.relation === 'pmo').length,
      closeout: signals.filter((signal) => signal.kind === 'closeout-blocked' || signal.kind === 'stage-transition-ready').length,
      stale: signals.filter((signal) => signal.kind === 'project-stale').length,
      actionableProjects: accessProjects.filter((project) => this.isActionable(project.primaryAction)).length,
      readOnlyProjects: accessProjects.filter((project) => !this.isActionable(project.primaryAction)).length,
    };
  }

  private buildBriefing(
    projects: ProjectListItem[],
    signals: PmsHomeSignal[],
    metrics: PmsHomeMetrics,
  ): string[] {
    if (projects.length === 0) return ['열람 가능한 프로젝트가 아직 없습니다.'];

    const bullets: string[] = [];
    const critical = signals.find((signal) => signal.severity === 'critical');
    if (critical) {
      bullets.push(`${this.relationLabel(critical.relation)} · ${critical.projectName}: ${critical.label} · ${critical.reason}`);
    }
    if (metrics.directActions > 0) {
      bullets.push(`내가 바로 봐야 할 PM/멤버 신호 ${metrics.directActions}건이 있습니다.`);
    }
    if (metrics.pmoSignals > 0) {
      bullets.push(`운영 관점에서 놓치면 위험한 프로젝트 신호 ${metrics.pmoSignals}건이 있습니다.`);
    }
    if (bullets.length < 3) {
      bullets.push(`진행 중 프로젝트 ${metrics.active}건 기준으로 최근 변동을 확인하세요.`);
    }

    return bullets.slice(0, 3);
  }

  private buildFlow(projects: ProjectListItem[]): PmsHomeFlowItem[] {
    return STATUS_ORDER.map((statusCode) => ({
      statusCode,
      count: projects.filter((project) => project.statusCode === statusCode).length,
    }));
  }

  private buildRecentChanges(
    projects: ProjectListItem[],
    relationByProject: Map<string, PmsHomeRelation>,
    accessByProject: Map<string, PmsProjectAccessSnapshot>,
  ): PmsHomeRecentChange[] {
    return [...projects]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 6)
      .map((project) => {
        const allowedActions = this.buildAllowedActions(project, accessByProject.get(this.key(project.id)));
        return {
          projectId: project.id.toString(),
          projectName: project.projectName,
          statusCode: project.statusCode as ProjectStatusCode,
          stageCode: project.stageCode as ProjectStageCode,
          relation: relationByProject.get(this.key(project.id)) ?? 'viewer',
          title: `${project.projectName} 최근 업데이트`,
          changedAt: project.updatedAt.toISOString(),
          currentOwnerUserId: project.currentOwnerUserId?.toString() ?? null,
          allowedActions,
          primaryAction: this.resolvePrimaryAction(allowedActions, null, 'overview'),
        };
      });
  }

  private buildAccessProjects(
    projects: ProjectListItem[],
    relationByProject: Map<string, PmsHomeRelation>,
    accessByProject: Map<string, PmsProjectAccessSnapshot>,
  ): PmsHomeAccessProject[] {
    return projects
      .map((project) => {
        const access = accessByProject.get(this.key(project.id));
        const allowedActions = this.buildAllowedActions(project, access);
        return {
          projectId: project.id.toString(),
          projectName: project.projectName,
          statusCode: project.statusCode as ProjectStatusCode,
          stageCode: project.stageCode as ProjectStageCode,
          relation: relationByProject.get(this.key(project.id)) ?? 'viewer',
          currentOwnerUserId: project.currentOwnerUserId?.toString() ?? null,
          ownerOrganizationId: project.ownerOrganizationId?.toString() ?? null,
          updatedAt: project.updatedAt.toISOString(),
          features: access?.features ?? VIEW_ONLY_FEATURES,
          allowedActions,
          primaryAction: this.resolvePrimaryAction(allowedActions, null, 'overview'),
        };
      })
      .sort((a, b) => {
        const actionDiff = Number(this.isActionable(b.primaryAction)) - Number(this.isActionable(a.primaryAction));
        if (actionDiff !== 0) return actionDiff;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }

  private buildAllowedActions(
    project: ProjectListItem,
    access?: PmsProjectAccessSnapshot,
  ): PmsHomeAllowedAction[] {
    const features = access?.features ?? VIEW_ONLY_FEATURES;
    const actions: PmsHomeAllowedAction[] = [];

    if (features.canViewProject) {
      actions.push(this.buildAction('view-project', '상세 보기', 'overview'));
    }
    if (features.canEditProject) {
      actions.push(this.buildAction('edit-project', '기본정보 수정', 'overview', 'canEditProject'));
    }
    if (features.canManageMembers) {
      actions.push(this.buildAction('manage-members', '멤버 관리', 'members', 'canManageMembers'));
    }
    if (features.canManageTasks) {
      actions.push(this.buildAction('manage-tasks', '작업 조치', 'tasks', 'canManageTasks'));
    }
    if (features.canManageMilestones) {
      actions.push(this.buildAction('manage-milestones', '일정 조치', 'milestones', 'canManageMilestones'));
    }
    if (features.canManageIssues) {
      actions.push(this.buildAction('manage-issues', '컨트롤 조치', 'controls', 'canManageIssues'));
    }
    if (features.canManageDeliverables) {
      actions.push(this.buildAction('manage-deliverables', '산출물 조치', 'deliverables', 'canManageDeliverables'));
    }
    if (features.canManageCloseConditions) {
      actions.push(this.buildAction('manage-close-conditions', '종료조건 조치', 'closeConditions', 'canManageCloseConditions'));
    }
    if (features.canAdvanceStage && project.stageCode !== 'done') {
      actions.push(this.buildAction('advance-stage', project.stageCode === 'waiting' ? '단계 시작' : '단계 완료', 'stage', 'canAdvanceStage'));
    }

    return actions;
  }

  private buildAction(
    kind: PmsHomeAllowedAction['kind'],
    label: string,
    targetTab: PmsHomeTargetTab,
    requiredCapability: PmsHomeCapabilityKey | null = null,
  ): PmsHomeAllowedAction {
    return {
      kind,
      label,
      targetPath: PROJECT_DETAIL_PATH,
      targetTab,
      requiredCapability,
    };
  }

  private resolvePrimaryAction(
    allowedActions: PmsHomeAllowedAction[],
    requiredCapability: PmsHomeCapabilityKey | null,
    targetTab: PmsHomeTargetTab,
  ): PmsHomeAllowedAction | undefined {
    if (requiredCapability) {
      const capabilityAction = allowedActions.find((action) => action.requiredCapability === requiredCapability);
      if (capabilityAction) return capabilityAction;
    }

    return (
      allowedActions.find((action) => action.targetTab === targetTab && action.kind !== 'view-project')
      ?? allowedActions.find((action) => action.kind !== 'view-project')
      ?? allowedActions[0]
    );
  }

  private isActionable(action?: PmsHomeAllowedAction): boolean {
    return Boolean(action && action.kind !== 'view-project');
  }

  private groupByProject<T extends { projectId: bigint }>(rows: T[]): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const row of rows) {
      const key = this.key(row.projectId);
      const group = map.get(key) ?? [];
      group.push(row);
      map.set(key, group);
    }
    return map;
  }

  private key(value: bigint): string {
    return value.toString();
  }

  private daysSince(date: Date): number {
    return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
  }

  private isDueWithin(date: Date, days: number): boolean {
    const dueTime = date.getTime();
    const today = this.startOfToday().getTime();
    return dueTime <= today + (days * 86_400_000);
  }

  private startOfToday(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private relationBoost(relation: PmsHomeRelation): number {
    if (relation === 'member') return 22;
    if (relation === 'pm') return 18;
    if (relation === 'pmo') return 12;
    return 0;
  }

  private relationLabel(relation: PmsHomeRelation): string {
    if (relation === 'pm') return 'PM';
    if (relation === 'member') return '멤버';
    if (relation === 'pmo') return 'PMO';
    return '참조';
  }

  private sortSignals(a: PmsHomeSignal, b: PmsHomeSignal): number {
    const weightDiff = b.sortWeight - a.sortWeight;
    if (weightDiff !== 0) return weightDiff;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  }
}
