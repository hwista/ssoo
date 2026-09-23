'use client';

import type { ElementType } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ArrowRightLeft,
  Bot,
  CheckCircle2,
  FileText,
  FolderKanban,
  Gauge,
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';
import type {
  PmsHomeAccessProject,
  PmsHomeAllowedAction,
  PmsHomeFlowItem,
  PmsHomeMetrics,
  PmsHomePortfolioDashboard,
  PmsHomeRecentChange,
  PmsHomeRelation,
  PmsHomeRiskReportSummary,
  PmsHomeSignal,
  PmsHomeSignalSeverity,
  PmsHomeTargetTab,
  ProjectStageCode,
  ProjectStatusCode,
} from '@ssoo/types/pms';
import { useHomeSummary } from '@/hooks/queries';
import { useTabStore } from '@/stores';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPmsAmount, formatPmsNumber, formatPmsShortDate, getPmsTime } from '@/lib/pms-format';
import { cn } from '@/lib/utils';
import { Button } from '@ssoo/web-ui';
import { SSOO_CONTENT_PAGE_METRICS } from '@ssoo/web-shell';

const STATUS_META: Record<ProjectStatusCode, { label: string; shortLabel: string; icon: ElementType; tone: string; dot: string }> = {
  request: {
    label: '요청/인계',
    shortLabel: '요청',
    icon: FileText,
    tone: 'border-ssoo-warning-border bg-ssoo-warning-bg text-ssoo-warning',
    dot: 'bg-ssoo-warning',
  },
  proposal: {
    label: '제안 참조',
    shortLabel: '제안',
    icon: Send,
    tone: 'border-ssoo-info-border bg-ssoo-info-bg text-ssoo-info',
    dot: 'bg-ssoo-info',
  },
  execution: {
    label: '수행',
    shortLabel: '수행',
    icon: FolderKanban,
    tone: 'border-ssoo-success-border bg-ssoo-success-bg text-ssoo-success',
    dot: 'bg-ssoo-success',
  },
  transition: {
    label: '종료/전환',
    shortLabel: '전환',
    icon: ArrowRightLeft,
    tone: 'border-ssoo-accent-border bg-ssoo-accent-bg text-ssoo-accent',
    dot: 'bg-ssoo-accent',
  },
};

const STAGE_LABELS: Record<ProjectStageCode, string> = {
  waiting: '대기',
  in_progress: '진행중',
  done: '완료',
};

const RELATION_META: Record<PmsHomeRelation, { label: string; tone: string; icon: ElementType }> = {
  pm: { label: 'PM', tone: 'border-ssoo-primary/20 bg-ssoo-sitemap-bg text-ssoo-primary', icon: UserCheck },
  member: { label: '멤버', tone: 'border-ssoo-info-border bg-ssoo-info-bg text-ssoo-info', icon: Users },
  pmo: { label: 'PMO', tone: 'border-ssoo-accent-border bg-ssoo-accent-bg text-ssoo-accent', icon: Gauge },
  viewer: { label: '참조', tone: 'border-border bg-muted text-muted-foreground', icon: FileText },
};

const SEVERITY_TONE: Record<PmsHomeSignalSeverity, string> = {
  critical: 'text-ssoo-danger',
  warning: 'text-ssoo-warning',
  normal: 'text-foreground',
  info: 'text-muted-foreground',
};

type ProjectTarget = {
  projectId: string;
  projectName: string;
  primaryAction?: PmsHomeAllowedAction;
};

type ManagementTargetTab = Extract<PmsHomeTargetTab, 'members' | 'tasks' | 'milestones' | 'controls' | 'review' | 'deliverables' | 'closeConditions'>;
type QuickRoute = {
  title: string;
  meta: string;
  count?: number;
  menuCode: string;
  menuId: string;
  path: string;
  projectTarget?: ProjectTarget;
};

const MANAGEMENT_TARGET_TABS: ManagementTargetTab[] = [
  'members',
  'tasks',
  'milestones',
  'controls',
  'review',
  'deliverables',
  'closeConditions',
];

function formatProjectCode(projectId: string): string {
  return `PRJ-${projectId.padStart(6, '0')}`;
}

function formatOwnerLabel(ownerUserId?: string | null): string {
  return ownerUserId ? '담당 지정됨' : '담당 미지정';
}

function getDaysSince(dateStr: string): number {
  const then = getPmsTime(dateStr);
  if (!then) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

function formatRelativeDate(dateStr: string): string {
  const days = getDaysSince(dateStr);
  if (days === 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 30) return `${days}일 전`;
  return formatPmsShortDate(dateStr);
}

function formatHours(value: number): string {
  return `${formatPmsNumber(value, '0')}h`;
}

function formatSignedHours(value: number): string {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${formatPmsNumber(value, '0')}h`;
}

function getPortfolioEffortWidth(rate: number): string {
  return `${Math.max(0, Math.min(rate, 140))}%`;
}

function isManagementTargetTab(value?: PmsHomeTargetTab): value is ManagementTargetTab {
  return Boolean(value && MANAGEMENT_TARGET_TABS.includes(value as ManagementTargetTab));
}

function isActionable(action?: PmsHomeAllowedAction): boolean {
  return Boolean(action && action.kind !== 'view-project');
}

function findReviewAction(actions: PmsHomeAllowedAction[]): PmsHomeAllowedAction | undefined {
  return actions.find((action) => action.targetTab === 'review');
}

function openProjectDetail(openTab: ReturnType<typeof useTabStore.getState>['openTab'], target: ProjectTarget) {
  const params: Record<string, string> = { id: target.projectId };
  if (isManagementTargetTab(target.primaryAction?.targetTab)) {
    params.managementTab = target.primaryAction.targetTab;
  }

  openTab({
    menuCode: 'project.detail',
    menuId: `project.detail.${target.projectId}`,
    title: `${formatProjectCode(target.projectId)} ${target.projectName}`,
    path: '/project/detail',
    params,
    replaceExisting: false,
  });
}

function StatusBadge({ status }: { status: ProjectStatusCode }) {
  const meta = STATUS_META[status];
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-caption-2xs font-medium', meta.tone)}>{meta.label}</span>;
}

function StageBadge({ stage }: { stage: ProjectStageCode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-caption-2xs font-medium text-muted-foreground">
      {STAGE_LABELS[stage] ?? stage}
    </span>
  );
}

function RelationBadge({ relation }: { relation: PmsHomeRelation }) {
  const meta = RELATION_META[relation];
  const Icon = meta.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption-2xs font-semibold', meta.tone)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function LoadingHome() {
  return (
    <div className="h-full min-w-0 overflow-auto bg-muted p-4">
      <div className="mx-auto flex w-full min-w-0 flex-col gap-4" style={{ maxWidth: SSOO_CONTENT_PAGE_METRICS.mainContentWidthPx }}>
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function ErrorHome() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="rounded-xl border bg-card px-10 py-8 text-center shadow-sm">
        <AlertCircle className="mx-auto mb-3 h-9 w-9 text-ssoo-danger" />
        <p className="text-sm font-semibold text-foreground">홈 요약을 불러오지 못했습니다.</p>
        <p className="mt-1 text-xs text-muted-foreground">잠시 후 다시 시도해주세요.</p>
      </div>
    </div>
  );
}

function BriefingPanel({ bullets, signalCount }: { bullets: string[]; signalCount: number }) {
  return (
    <section className="rounded-xl border border-ssoo-primary/15 bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-ssoo-sitemap-bg p-2 text-ssoo-primary">
          <Bot className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">업무 브리핑</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-caption-2xs font-medium text-muted-foreground">정책 요약</span>
          </div>
          <div className="mt-3 space-y-2">
            {bullets.map((bullet) => (
              <div key={bullet} className="flex gap-2 text-sm text-muted-foreground">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ssoo-primary" />
                <span className="leading-5">{bullet}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden rounded-lg border bg-muted px-3 py-2 text-center sm:block">
          <p className="text-caption-2xs font-medium text-muted-foreground">신호</p>
          <p className="text-xl font-bold text-foreground">{signalCount}</p>
        </div>
      </div>
    </section>
  );
}

function MetricStrip({ metrics }: { metrics: PmsHomeMetrics }) {
  const items = [
    { label: '진행중', value: metrics.active, icon: FolderKanban, tone: 'text-ssoo-success' },
    { label: '내 액션', value: metrics.directActions, icon: UserCheck, tone: 'text-ssoo-primary' },
    { label: '권한 프로젝트', value: metrics.actionableProjects, icon: ShieldCheck, tone: 'text-ssoo-info' },
    { label: '피드백', value: metrics.feedback, icon: MessageSquareText, tone: 'text-ssoo-danger' },
    { label: '운영 신호', value: metrics.pmoSignals, icon: AlertCircle, tone: 'text-ssoo-warning' },
    { label: '종료/전환', value: metrics.closeout, icon: CheckCircle2, tone: 'text-ssoo-accent' },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((metric) => {
        const Icon = metric.icon;
        return (
          <div key={metric.label} className="rounded-xl border bg-card px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="break-keep text-xs font-medium text-muted-foreground">{metric.label}</p>
              <Icon className={cn('h-4 w-4', metric.tone)} />
            </div>
            <p className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</p>
          </div>
        );
      })}
    </section>
  );
}

function PortfolioDashboardPanel({ dashboard }: { dashboard: PmsHomePortfolioDashboard }) {
  const openTab = useTabStore((state) => state.openTab);
  const effortVarianceTone = dashboard.effortVarianceHours > 0 ? 'text-ssoo-danger' : 'text-ssoo-success';
  const kpis = [
    {
      label: '접근 프로젝트',
      value: dashboard.projectCount,
      meta: `진행중 ${dashboard.activeProjectCount}`,
      icon: FolderKanban,
      tone: 'text-ssoo-primary',
    },
    {
      label: 'CRM 스냅샷',
      value: formatPmsAmount(dashboard.crmContractSnapshotAmount, dashboard.crmContractSnapshotCurrencyCode, '0'),
      meta: `${dashboard.crmContractSnapshotCount}건`,
      icon: FileText,
      tone: 'text-ssoo-info',
    },
    {
      label: '대금 예정',
      value: formatPmsAmount(dashboard.scheduledPaymentSnapshotAmount, dashboard.crmContractSnapshotCurrencyCode, '0'),
      meta: `지연 ${dashboard.overduePaymentCount} · 임박 ${dashboard.dueSoonPaymentCount}`,
      icon: CheckCircle2,
      tone: 'text-ssoo-accent',
    },
    {
      label: '실제 공수',
      value: formatHours(dashboard.actualHours),
      meta: `예상 ${formatHours(dashboard.estimatedHours)}`,
      icon: Gauge,
      tone: 'text-ssoo-success',
    },
    {
      label: '통제/위험',
      value: dashboard.openControlCount,
      meta: `위험 ${dashboard.openRiskCount} · 변경 ${dashboard.activeChangeCount}`,
      icon: AlertCircle,
      tone: dashboard.openControlCount > 0 ? 'text-ssoo-warning' : 'text-muted-foreground',
    },
    {
      label: '피드백/종료',
      value: dashboard.launchFeedbackCount + dashboard.closeoutBlockedProjectCount,
      meta: `피드백 ${dashboard.launchFeedbackCount} · 막힘 ${dashboard.closeoutBlockedProjectCount}`,
      icon: MessageSquareText,
      tone: dashboard.launchFeedbackCount > 0 ? 'text-ssoo-danger' : 'text-muted-foreground',
    },
  ];

  return (
    <section className="rounded-xl border bg-card shadow-sm" data-testid="pms-home-portfolio-dashboard">
      <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Gauge className="h-4 w-4 text-ssoo-primary" />
            <h2 className="text-sm font-semibold text-foreground">포트폴리오 현황</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-caption-2xs font-medium text-muted-foreground">
              PM {dashboard.pmOwnedProjectCount} · PMO {dashboard.pmoVisibleProjectCount}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{dashboard.boundaryNote}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg border bg-muted px-3 py-2">
            <p className="font-semibold text-foreground">{dashboard.delayedMilestoneCount}</p>
            <p className="mt-0.5 text-muted-foreground">일정 지연</p>
          </div>
          <div className="rounded-lg border bg-muted px-3 py-2">
            <p className="font-semibold text-foreground">{dashboard.pendingDeliverableCount}</p>
            <p className="mt-0.5 text-muted-foreground">산출물 대기</p>
          </div>
          <div className="rounded-lg border bg-muted px-3 py-2">
            <p className="font-semibold text-foreground">{dashboard.staleProjectCount}</p>
            <p className="mt-0.5 text-muted-foreground">정체</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-6">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-lg border bg-background px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-medium text-muted-foreground">{item.label}</p>
                <Icon className={cn('h-4 w-4', item.tone)} />
              </div>
              <p className="mt-2 truncate text-lg font-semibold text-foreground">{item.value}</p>
              <p className="mt-1 truncate text-caption-2xs text-muted-foreground">{item.meta}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 border-t px-4 py-4 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)]">
        <div className="rounded-lg border bg-background p-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-foreground">공수 소진</span>
            <span className={cn('font-semibold', effortVarianceTone)}>
              {formatSignedHours(dashboard.effortVarianceHours)}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-2 rounded-full bg-ssoo-primary" style={{ width: getPortfolioEffortWidth(dashboard.effortBurnRate) }} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-caption-2xs text-muted-foreground">
            <span>{dashboard.effortBurnRate}%</span>
            <span>{formatHours(dashboard.actualHours)} / {formatHours(dashboard.estimatedHours)}</span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-muted px-2 py-2">
              <dt className="text-muted-foreground">열린 이슈</dt>
              <dd className="mt-1 font-semibold text-foreground">{dashboard.openIssueCount}</dd>
            </div>
            <div className="rounded-md bg-muted px-2 py-2">
              <dt className="text-muted-foreground">위험/변경</dt>
              <dd className="mt-1 font-semibold text-foreground">{dashboard.openRiskCount + dashboard.activeChangeCount}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border bg-background">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <h3 className="text-xs font-semibold text-foreground">우선 프로젝트</h3>
            <span className="text-caption-2xs text-muted-foreground">{dashboard.topProjects.length}</span>
          </div>
          {dashboard.topProjects.length === 0 ? (
            <div className="px-3 py-6 text-sm text-muted-foreground">표시할 프로젝트가 없습니다.</div>
          ) : (
            <div className="divide-y">
              {dashboard.topProjects.map((project) => (
                <Button variant="plain" size="plain"
                  key={`portfolio-${project.projectId}`}
                  type="button"
                  data-testid="pms-home-portfolio-project-action"
                  onClick={() => openProjectDetail(openTab, project)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-3 text-left transition hover:bg-muted"
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{project.projectName}</p>
                      <RelationBadge relation={project.relation} />
                      <StatusBadge status={project.statusCode} />
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {formatProjectCode(project.projectId)} · 공수 {formatHours(project.actualHours)} / {formatHours(project.estimatedHours)} · 통제 {project.openControlCount}
                    </p>
                  </div>
                  <div className="flex min-w-[112px] items-center justify-end gap-2">
                    <div className="text-right">
                      <p className={cn('text-xs font-semibold', project.launchFeedbackCount > 0 ? 'text-ssoo-danger' : 'text-foreground')}>
                        피드백 {project.launchFeedbackCount}
                      </p>
                      <p className="mt-0.5 text-caption-2xs text-muted-foreground">
                        종료 {project.closeoutBlockerCount} · 지연 {project.delayedMilestoneCount}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ActionPills({ actions, compact = false }: { actions: PmsHomeAllowedAction[]; compact?: boolean }) {
  const visibleActions = actions.filter((action) => action.kind !== 'view-project').slice(0, compact ? 2 : 4);

  if (visibleActions.length === 0) {
    return (
      <span className="inline-flex rounded-full border border-border bg-muted px-2 py-0.5 text-caption-2xs font-medium text-muted-foreground">
        읽기 전용
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleActions.map((action) => (
        <span
          key={`${action.kind}-${action.targetTab}`}
          className="rounded-full border border-ssoo-primary/15 bg-ssoo-sitemap-bg px-2 py-0.5 text-caption-2xs font-semibold text-ssoo-primary"
        >
          {action.label}
        </span>
      ))}
      {actions.filter((action) => action.kind !== 'view-project').length > visibleActions.length ? (
        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-caption-2xs font-medium text-muted-foreground">
          더보기
        </span>
      ) : null}
    </div>
  );
}

function SignalQueue({ signals }: { signals: PmsHomeSignal[] }) {
  const openTab = useTabStore((state) => state.openTab);
  const visibleSignals = signals.slice(0, 7);

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">지금 봐야 할 것</h2>
        <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{signals.length}</span>
      </div>

      {visibleSignals.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">지금 즉시 확인할 신호가 없습니다.</div>
      ) : (
        <div className="divide-y">
          {visibleSignals.map((signal) => (
            <Button variant="plain" size="plain"
              key={signal.id}
              type="button"
              data-testid="pms-home-signal-action"
              onClick={() => openProjectDetail(openTab, signal)}
              className="grid w-full min-w-0 grid-cols-1 gap-3 whitespace-normal break-words px-4 py-3 text-left transition hover:bg-muted sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">{signal.projectName}</span>
                  <RelationBadge relation={signal.relation} />
                  <StatusBadge status={signal.statusCode} />
                  <StageBadge stage={signal.stageCode} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{formatProjectCode(signal.projectId)}</span>
                  <span>{formatOwnerLabel(signal.currentOwnerUserId)}</span>
                  <span>업데이트 {formatRelativeDate(signal.updatedAt)}</span>
                  {signal.relatedSignalCount ? <span>외 {signal.relatedSignalCount}건</span> : null}
                </div>
              </div>
              <div className="flex min-w-0 items-center justify-end gap-2 sm:min-w-[160px]">
                <div className="text-right">
                  <p className={cn('text-xs font-semibold', SEVERITY_TONE[signal.severity])}>{signal.label}</p>
                  <p className="mt-0.5 text-caption-2xs text-muted-foreground">{signal.reason}</p>
                  <p className="mt-1 text-caption-2xs font-semibold text-ssoo-primary">{signal.primaryAction?.label ?? signal.nextActionLabel}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Button>
          ))}
        </div>
      )}
    </section>
  );
}

function MyActionPanel({ signals }: { signals: PmsHomeSignal[] }) {
  const openTab = useTabStore((state) => state.openTab);
  const directSignals = signals.filter((signal) => isActionable(signal.primaryAction)).slice(0, 4);
  if (directSignals.length === 0) return null;

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">내 액션</h2>
        <span className="text-xs text-muted-foreground">{directSignals.length}</span>
      </div>
      <div className="divide-y">
        {directSignals.map((signal) => (
          <Button variant="plain" size="plain"
            key={`action-${signal.id}`}
            type="button"
            data-testid="pms-home-my-action"
            onClick={() => openProjectDetail(openTab, signal)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-muted"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <RelationBadge relation={signal.relation} />
                <p className="truncate text-sm font-medium text-foreground">{signal.projectName}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{signal.label} · {signal.reason}</p>
            </div>
            <span className="shrink-0 text-xs font-semibold text-ssoo-primary">{signal.primaryAction?.label ?? signal.nextActionLabel}</span>
          </Button>
        ))}
      </div>
    </section>
  );
}

function LaunchFeedbackPanel({
  feedbackSignals,
  feedbackCount,
}: {
  feedbackSignals: PmsHomeSignal[];
  feedbackCount: number;
}) {
  const openTab = useTabStore((state) => state.openTab);
  const visibleSignals = feedbackSignals.slice(0, 5);

  return (
    <section className="rounded-xl border border-ssoo-danger/20 bg-card shadow-sm" data-testid="pms-home-launch-feedback-panel">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-ssoo-danger" />
          <h2 className="text-sm font-semibold text-foreground">런칭 피드백 큐</h2>
        </div>
        <span className="rounded-full bg-ssoo-danger/10 px-2 py-1 text-xs font-semibold text-ssoo-danger">
          {feedbackCount}
        </span>
      </div>
      {visibleSignals.length === 0 ? (
        <div className="px-4 py-5 text-sm text-muted-foreground">열린 런칭 피드백이 없습니다.</div>
      ) : (
        <div className="divide-y">
          {visibleSignals.map((signal) => (
            <Button variant="plain" size="plain"
              key={`feedback-${signal.id}`}
              type="button"
              data-testid="pms-home-launch-feedback-item"
              onClick={() => openProjectDetail(openTab, {
                projectId: signal.projectId,
                projectName: signal.projectName,
                primaryAction: signal.primaryAction ?? findReviewAction(signal.allowedActions),
              })}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3 text-left transition hover:bg-muted"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{signal.projectName}</p>
                  <RelationBadge relation={signal.relation} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatProjectCode(signal.projectId)} · {signal.reason} · 업데이트 {formatRelativeDate(signal.updatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('text-xs font-semibold', SEVERITY_TONE[signal.severity])}>
                  {signal.nextActionLabel}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Button>
          ))}
          {feedbackSignals.length > visibleSignals.length ? (
            <div className="px-4 py-2 text-xs text-muted-foreground">
              외 {feedbackSignals.length - visibleSignals.length}건은 리뷰 탭에서 이어서 확인합니다.
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function StatusFlow({ flow }: { flow: PmsHomeFlowItem[] }) {
  const total = Math.max(flow.reduce((sum, item) => sum + item.count, 0), 1);

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">운영 흐름</h2>
        <Gauge className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="space-y-3">
        {flow.map((item) => {
          const meta = STATUS_META[item.statusCode];
          const percent = Math.round((item.count / total) * 100);
          const Icon = meta.icon;
          return (
            <div key={item.statusCode}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 font-medium text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {meta.label}
                </div>
                <span className="text-muted-foreground">{item.count}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className={cn('h-2 rounded-full', meta.dot)} style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RiskReportSummaryPanel({ summary }: { summary: PmsHomeRiskReportSummary }) {
  const groups = [
    {
      title: '리스크',
      icon: AlertCircle,
      rows: [
        { label: '열린 리스크', value: summary.openRisks },
        { label: '상위 위험', value: summary.highRisks },
        { label: '담당 미지정', value: summary.unassignedRisks },
      ],
    },
    {
      title: '리포트',
      icon: FileText,
      rows: [
        { label: '계획됨', value: summary.plannedReports },
        { label: '준비됨', value: summary.readyReports },
        { label: '지연됨', value: summary.overdueReports },
      ],
    },
    {
      title: '운영 집계',
      icon: Gauge,
      rows: [
        { label: '차단 이슈', value: summary.blockingIssues },
        { label: '변경 요청', value: summary.activeChanges },
        { label: '전환 막힘', value: summary.closeoutBlockedProjects },
      ],
    },
  ];

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm" data-testid="pms-home-risk-report-summary">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">리스크/리포트 집계</h2>
        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-1">
        {groups.map((group) => {
          const Icon = group.icon;
          return (
            <div key={group.title} className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                {group.title}
              </div>
              <dl className="space-y-1.5">
                {group.rows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-3 text-xs">
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className="font-semibold text-foreground">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-xs text-muted-foreground">
        <div className="flex items-center justify-between gap-2">
          <span>마일스톤 지연</span>
          <strong className="text-foreground">{summary.delayedMilestones}</strong>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>산출물 대기</span>
          <strong className="text-foreground">{summary.pendingDeliverables}</strong>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>완료 리포트</span>
          <strong className="text-foreground">{summary.completedReports}</strong>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>검토 큐</span>
          <strong className="text-foreground">{summary.blockingIssues + summary.highRisks}</strong>
        </div>
      </div>
    </section>
  );
}

function RecentChangeList({ recentChanges }: { recentChanges: PmsHomeRecentChange[] }) {
  const openTab = useTabStore((state) => state.openTab);

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">최근 움직임</h2>
        <span className="text-xs text-muted-foreground">{recentChanges.length}</span>
      </div>
      <div className="divide-y">
        {recentChanges.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">최근 프로젝트가 없습니다.</div>
        ) : (
          recentChanges.map((change) => (
            <Button variant="plain" size="plain"
              key={`${change.projectId}-${change.changedAt}`}
              type="button"
              data-testid="pms-home-recent-change-action"
              onClick={() => openProjectDetail(openTab, change)}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3 text-left transition hover:bg-muted"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{change.projectName}</p>
                  <RelationBadge relation={change.relation} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{formatProjectCode(change.projectId)} · {formatOwnerLabel(change.currentOwnerUserId)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={change.statusCode} />
                <span className="hidden text-xs font-semibold text-ssoo-primary sm:inline">{change.primaryAction?.label ?? '상세 보기'}</span>
                <span className="w-12 text-right text-xs text-muted-foreground">{formatRelativeDate(change.changedAt)}</span>
              </div>
            </Button>
          ))
        )}
      </div>
    </section>
  );
}

function PermissionWorkPanel({ projects }: { projects: PmsHomeAccessProject[] }) {
  const openTab = useTabStore((state) => state.openTab);
  const visibleProjects = projects.slice(0, 5);

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">권한별 업무</h2>
        <span className="text-xs text-muted-foreground">{projects.filter((project) => isActionable(project.primaryAction)).length}</span>
      </div>
      <div className="divide-y">
        {visibleProjects.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">권한 기준으로 표시할 프로젝트가 없습니다.</div>
        ) : (
          visibleProjects.map((project) => (
            <Button variant="plain" size="plain"
              key={`access-${project.projectId}`}
              type="button"
              data-testid="pms-home-access-project-action"
              onClick={() => openProjectDetail(openTab, project)}
              className="flex w-full min-w-0 flex-col items-stretch gap-0 whitespace-normal break-words px-4 py-3 text-left transition hover:bg-muted"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{project.projectName}</p>
                    <RelationBadge relation={project.relation} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{formatProjectCode(project.projectId)} · {formatOwnerLabel(project.currentOwnerUserId)}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-ssoo-primary">{project.primaryAction?.label ?? '상세 보기'}</span>
              </div>
              <div className="mt-2">
                <ActionPills actions={project.allowedActions} compact />
              </div>
            </Button>
          ))
        )}
      </div>
    </section>
  );
}

function QuickDrilldown({ signals, feedbackCount }: { signals: PmsHomeSignal[]; feedbackCount: number }) {
  const openTab = useTabStore((state) => state.openTab);
  const reviewSignal =
    signals.find((signal) => signal.kind === 'review-feedback-open' && findReviewAction(signal.allowedActions))
    ?? signals.find((signal) => findReviewAction(signal.allowedActions));
  const reviewAction = reviewSignal ? findReviewAction(reviewSignal.allowedActions) : undefined;
  const operationalReviewSignalCount = signals.filter((signal) =>
    signal.kind === 'review-feedback-open'
    || signal.kind === 'project-issue-blocking'
    || signal.kind === 'project-risk-open'
    || signal.kind === 'recent-change',
  ).length;
  const reviewSignalCount = feedbackCount > 0 ? feedbackCount : operationalReviewSignalCount;
  const routes: QuickRoute[] = [
    { title: '내 프로젝트', meta: '업무 이어가기', count: undefined, menuCode: 'my-projects', menuId: 'my-projects', path: '/my-projects' },
    { title: '조치 필요', meta: '신호 모아보기', count: signals.length, menuCode: 'action-required', menuId: 'action-required', path: '/action-required' },
    {
      title: '종료/전환',
      meta: '완료 조건 확인',
      count: signals.filter((signal) => signal.kind === 'closeout-blocked' || signal.kind === 'stage-transition-ready').length,
      menuCode: 'closeout',
      menuId: 'closeout',
      path: '/closeout',
    },
    ...(reviewSignal && reviewAction
      ? [
          {
            title: '피드백 리뷰',
            meta: '이슈·리스크·변경 수집',
            count: reviewSignalCount > 0 ? reviewSignalCount : undefined,
            menuCode: 'feedback-review',
            menuId: `feedback-review.${reviewSignal.projectId}`,
            path: '/project/detail',
            projectTarget: {
              projectId: reviewSignal.projectId,
              projectName: reviewSignal.projectName,
              primaryAction: reviewAction,
            },
          },
        ]
      : []),
  ];

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">바로 이동</h2>
      <div className="space-y-2">
        {routes.map((route) => (
          <Button variant="plain" size="plain"
            key={route.menuId}
            type="button"
            data-testid={route.projectTarget ? 'pms-home-feedback-review-action' : 'pms-home-quick-route-action'}
            onClick={() => {
              if (route.projectTarget) {
                openProjectDetail(openTab, route.projectTarget);
                return;
              }
              openTab({
                menuCode: route.menuCode,
                menuId: route.menuId,
                title: route.title,
                path: route.path,
              });
            }}
            className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left transition hover:border-ssoo-primary/30 hover:bg-muted"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{route.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{route.meta}</p>
            </div>
            <div className="flex items-center gap-2">
              {typeof route.count === 'number' ? <span className="text-sm font-semibold text-foreground">{route.count}</span> : null}
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Button>
        ))}
      </div>
    </section>
  );
}

export function HomeDashboardPage() {
  const { data, isLoading, error } = useHomeSummary();
  const summary = data?.data;

  if (isLoading) return <LoadingHome />;
  if (error || !summary) return <ErrorHome />;

  return (
    <div className="h-full min-w-0 overflow-auto bg-muted p-4">
      <div className="mx-auto flex w-full min-w-0 flex-col gap-4" style={{ maxWidth: SSOO_CONTENT_PAGE_METRICS.mainContentWidthPx }}>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.7fr)]">
          <BriefingPanel bullets={summary.briefing} signalCount={summary.metrics.attention} />
          <MetricStrip metrics={summary.metrics} />
        </div>

        <PortfolioDashboardPanel dashboard={summary.portfolioDashboard} />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
          <div className="min-w-0 space-y-4">
            <SignalQueue signals={summary.signals} />
            <LaunchFeedbackPanel feedbackSignals={summary.feedbackSignals} feedbackCount={summary.metrics.feedback} />
            <MyActionPanel signals={summary.signals} />
            <RecentChangeList recentChanges={summary.recentChanges} />
          </div>
          <div className="min-w-0 space-y-4">
            <PermissionWorkPanel projects={summary.accessProjects} />
            <RiskReportSummaryPanel summary={summary.riskReportSummary} />
            <StatusFlow flow={summary.flow} />
            <QuickDrilldown signals={summary.signals} feedbackCount={summary.metrics.feedback} />
          </div>
        </div>
      </div>
    </div>
  );
}
