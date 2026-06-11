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
  PmsHomeRecentChange,
  PmsHomeRelation,
  PmsHomeSignal,
  PmsHomeSignalSeverity,
  PmsHomeTargetTab,
  ProjectStageCode,
  ProjectStatusCode,
} from '@ssoo/types/pms';
import { useHomeSummary } from '@/hooks/queries';
import { useTabStore } from '@/stores';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const STATUS_META: Record<ProjectStatusCode, { label: string; shortLabel: string; icon: ElementType; tone: string; dot: string }> = {
  request: {
    label: '요청/인계',
    shortLabel: '요청',
    icon: FileText,
    tone: 'border-amber-200 bg-amber-50 text-amber-800',
    dot: 'bg-amber-500',
  },
  proposal: {
    label: '제안 참조',
    shortLabel: '제안',
    icon: Send,
    tone: 'border-blue-200 bg-blue-50 text-blue-800',
    dot: 'bg-blue-500',
  },
  execution: {
    label: '수행',
    shortLabel: '수행',
    icon: FolderKanban,
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    dot: 'bg-emerald-500',
  },
  transition: {
    label: '종료/전환',
    shortLabel: '전환',
    icon: ArrowRightLeft,
    tone: 'border-purple-200 bg-purple-50 text-purple-800',
    dot: 'bg-purple-500',
  },
};

const STAGE_LABELS: Record<ProjectStageCode, string> = {
  waiting: '대기',
  in_progress: '진행중',
  done: '완료',
};

const RELATION_META: Record<PmsHomeRelation, { label: string; tone: string; icon: ElementType }> = {
  pm: { label: 'PM', tone: 'border-ssoo-primary/20 bg-ssoo-sitemap-bg text-ssoo-primary', icon: UserCheck },
  member: { label: '멤버', tone: 'border-blue-200 bg-blue-50 text-blue-700', icon: Users },
  pmo: { label: 'PMO', tone: 'border-purple-200 bg-purple-50 text-purple-700', icon: Gauge },
  viewer: { label: '참조', tone: 'border-gray-200 bg-gray-50 text-gray-600', icon: FileText },
};

const SEVERITY_TONE: Record<PmsHomeSignalSeverity, string> = {
  critical: 'text-red-700',
  warning: 'text-amber-700',
  normal: 'text-gray-800',
  info: 'text-gray-500',
};

type ProjectTarget = {
  projectId: string;
  projectName: string;
  primaryAction?: PmsHomeAllowedAction;
};

type ManagementTargetTab = Extract<PmsHomeTargetTab, 'members' | 'tasks' | 'milestones' | 'controls' | 'deliverables' | 'closeConditions'>;

const MANAGEMENT_TARGET_TABS: ManagementTargetTab[] = [
  'members',
  'tasks',
  'milestones',
  'controls',
  'deliverables',
  'closeConditions',
];

function formatProjectCode(projectId: string): string {
  return `PRJ-${projectId.padStart(6, '0')}`;
}

function formatOwnerLabel(ownerUserId?: string | null): string {
  return ownerUserId ? `담당 ${ownerUserId}` : '담당 미지정';
}

function getDaysSince(dateStr: string): number {
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

function formatRelativeDate(dateStr: string): string {
  const days = getDaysSince(dateStr);
  if (days === 0) return '오늘';
  if (days === 1) return '어제';
  if (days < 30) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
}

function isManagementTargetTab(value?: PmsHomeTargetTab): value is ManagementTargetTab {
  return Boolean(value && MANAGEMENT_TARGET_TABS.includes(value as ManagementTargetTab));
}

function isActionable(action?: PmsHomeAllowedAction): boolean {
  return Boolean(action && action.kind !== 'view-project');
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
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium', meta.tone)}>{meta.label}</span>;
}

function StageBadge({ stage }: { stage: ProjectStageCode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">
      {STAGE_LABELS[stage] ?? stage}
    </span>
  );
}

function RelationBadge({ relation }: { relation: PmsHomeRelation }) {
  const meta = RELATION_META[relation];
  const Icon = meta.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold', meta.tone)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function LoadingHome() {
  return (
    <div className="h-full overflow-auto bg-gray-50 p-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
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
      <div className="rounded-xl border bg-white px-10 py-8 text-center shadow-sm">
        <AlertCircle className="mx-auto mb-3 h-9 w-9 text-red-400" />
        <p className="text-sm font-semibold text-gray-800">홈 요약을 불러오지 못했습니다.</p>
        <p className="mt-1 text-xs text-gray-500">잠시 후 다시 시도해주세요.</p>
      </div>
    </div>
  );
}

function BriefingPanel({ bullets, signalCount }: { bullets: string[]; signalCount: number }) {
  return (
    <section className="rounded-xl border border-ssoo-primary/15 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-ssoo-sitemap-bg p-2 text-ssoo-primary">
          <Bot className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">업무 브리핑</h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">정책 요약</span>
          </div>
          <div className="mt-3 space-y-2">
            {bullets.map((bullet) => (
              <div key={bullet} className="flex gap-2 text-sm text-gray-700">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ssoo-primary" />
                <span className="leading-5">{bullet}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden rounded-lg border bg-gray-50 px-3 py-2 text-center sm:block">
          <p className="text-[11px] font-medium text-gray-500">신호</p>
          <p className="text-xl font-bold text-gray-900">{signalCount}</p>
        </div>
      </div>
    </section>
  );
}

function MetricStrip({ metrics }: { metrics: PmsHomeMetrics }) {
  const items = [
    { label: '진행중', value: metrics.active, icon: FolderKanban, tone: 'text-emerald-700' },
    { label: '내 액션', value: metrics.directActions, icon: UserCheck, tone: 'text-ssoo-primary' },
    { label: '권한 프로젝트', value: metrics.actionableProjects, icon: ShieldCheck, tone: 'text-blue-700' },
    { label: '운영 신호', value: metrics.pmoSignals, icon: AlertCircle, tone: 'text-amber-700' },
    { label: '종료/전환', value: metrics.closeout, icon: CheckCircle2, tone: 'text-purple-700' },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((metric) => {
        const Icon = metric.icon;
        return (
          <div key={metric.label} className="rounded-xl border bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-gray-500">{metric.label}</p>
              <Icon className={cn('h-4 w-4', metric.tone)} />
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-950">{metric.value}</p>
          </div>
        );
      })}
    </section>
  );
}

function ActionPills({ actions, compact = false }: { actions: PmsHomeAllowedAction[]; compact?: boolean }) {
  const visibleActions = actions.filter((action) => action.kind !== 'view-project').slice(0, compact ? 2 : 4);

  if (visibleActions.length === 0) {
    return (
      <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-500">
        읽기 전용
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleActions.map((action) => (
        <span
          key={`${action.kind}-${action.targetTab}`}
          className="rounded-full border border-ssoo-primary/15 bg-ssoo-sitemap-bg px-2 py-0.5 text-[11px] font-semibold text-ssoo-primary"
        >
          {action.label}
        </span>
      ))}
      {actions.filter((action) => action.kind !== 'view-project').length > visibleActions.length ? (
        <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-500">
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
    <section className="rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">지금 봐야 할 것</h2>
        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">{signals.length}</span>
      </div>

      {visibleSignals.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500">지금 즉시 확인할 신호가 없습니다.</div>
      ) : (
        <div className="divide-y">
          {visibleSignals.map((signal) => (
            <button
              key={signal.id}
              type="button"
              onClick={() => openProjectDetail(openTab, signal)}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3 text-left transition hover:bg-gray-50"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-gray-900">{signal.projectName}</span>
                  <RelationBadge relation={signal.relation} />
                  <StatusBadge status={signal.statusCode} />
                  <StageBadge stage={signal.stageCode} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                  <span>{formatProjectCode(signal.projectId)}</span>
                  <span>{formatOwnerLabel(signal.currentOwnerUserId)}</span>
                  <span>업데이트 {formatRelativeDate(signal.updatedAt)}</span>
                  {signal.relatedSignalCount ? <span>외 {signal.relatedSignalCount}건</span> : null}
                </div>
              </div>
              <div className="flex min-w-[160px] items-center justify-end gap-2">
                <div className="text-right">
                  <p className={cn('text-xs font-semibold', SEVERITY_TONE[signal.severity])}>{signal.label}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{signal.reason}</p>
                  <p className="mt-1 text-[11px] font-semibold text-ssoo-primary">{signal.primaryAction?.label ?? signal.nextActionLabel}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300" />
              </div>
            </button>
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
    <section className="rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">내 액션</h2>
        <span className="text-xs text-gray-500">{directSignals.length}</span>
      </div>
      <div className="divide-y">
        {directSignals.map((signal) => (
          <button
            key={`action-${signal.id}`}
            type="button"
            onClick={() => openProjectDetail(openTab, signal)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-gray-50"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <RelationBadge relation={signal.relation} />
                <p className="truncate text-sm font-medium text-gray-900">{signal.projectName}</p>
              </div>
              <p className="mt-1 text-xs text-gray-500">{signal.label} · {signal.reason}</p>
            </div>
            <span className="shrink-0 text-xs font-semibold text-ssoo-primary">{signal.primaryAction?.label ?? signal.nextActionLabel}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function StatusFlow({ flow }: { flow: PmsHomeFlowItem[] }) {
  const total = Math.max(flow.reduce((sum, item) => sum + item.count, 0), 1);

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">운영 흐름</h2>
        <Gauge className="h-4 w-4 text-gray-400" />
      </div>
      <div className="space-y-3">
        {flow.map((item) => {
          const meta = STATUS_META[item.statusCode];
          const percent = Math.round((item.count / total) * 100);
          const Icon = meta.icon;
          return (
            <div key={item.statusCode}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 font-medium text-gray-700">
                  <Icon className="h-3.5 w-3.5 text-gray-400" />
                  {meta.label}
                </div>
                <span className="text-gray-500">{item.count}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div className={cn('h-2 rounded-full', meta.dot)} style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RecentChangeList({ recentChanges }: { recentChanges: PmsHomeRecentChange[] }) {
  const openTab = useTabStore((state) => state.openTab);

  return (
    <section className="rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">최근 움직임</h2>
        <span className="text-xs text-gray-500">{recentChanges.length}</span>
      </div>
      <div className="divide-y">
        {recentChanges.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">최근 프로젝트가 없습니다.</div>
        ) : (
          recentChanges.map((change) => (
            <button
              key={`${change.projectId}-${change.changedAt}`}
              type="button"
              onClick={() => openProjectDetail(openTab, change)}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3 text-left transition hover:bg-gray-50"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-medium text-gray-900">{change.projectName}</p>
                  <RelationBadge relation={change.relation} />
                </div>
                <p className="mt-1 text-xs text-gray-500">{formatProjectCode(change.projectId)} · {formatOwnerLabel(change.currentOwnerUserId)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={change.statusCode} />
                <span className="hidden text-xs font-semibold text-ssoo-primary sm:inline">{change.primaryAction?.label ?? '상세 보기'}</span>
                <span className="w-12 text-right text-xs text-gray-500">{formatRelativeDate(change.changedAt)}</span>
              </div>
            </button>
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
    <section className="rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">권한별 업무</h2>
        <span className="text-xs text-gray-500">{projects.filter((project) => isActionable(project.primaryAction)).length}</span>
      </div>
      <div className="divide-y">
        {visibleProjects.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">권한 기준으로 표시할 프로젝트가 없습니다.</div>
        ) : (
          visibleProjects.map((project) => (
            <button
              key={`access-${project.projectId}`}
              type="button"
              onClick={() => openProjectDetail(openTab, project)}
              className="w-full px-4 py-3 text-left transition hover:bg-gray-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-medium text-gray-900">{project.projectName}</p>
                    <RelationBadge relation={project.relation} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{formatProjectCode(project.projectId)} · {formatOwnerLabel(project.currentOwnerUserId)}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-ssoo-primary">{project.primaryAction?.label ?? '상세 보기'}</span>
              </div>
              <div className="mt-2">
                <ActionPills actions={project.allowedActions} compact />
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function QuickDrilldown({ signals }: { signals: PmsHomeSignal[] }) {
  const openTab = useTabStore((state) => state.openTab);
  const routes = [
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
  ];

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">바로 이동</h2>
      <div className="space-y-2">
        {routes.map((route) => (
          <button
            key={route.path}
            type="button"
            onClick={() => openTab({ ...route, title: route.title })}
            className="flex w-full items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-left transition hover:border-ssoo-primary/30 hover:bg-gray-50"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{route.title}</p>
              <p className="mt-0.5 text-xs text-gray-500">{route.meta}</p>
            </div>
            <div className="flex items-center gap-2">
              {typeof route.count === 'number' ? <span className="text-sm font-semibold text-gray-900">{route.count}</span> : null}
              <ArrowRight className="h-4 w-4 text-gray-300" />
            </div>
          </button>
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
    <div className="h-full overflow-auto bg-gray-50 p-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.7fr)]">
          <BriefingPanel bullets={summary.briefing} signalCount={summary.metrics.attention} />
          <MetricStrip metrics={summary.metrics} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
          <div className="space-y-4">
            <SignalQueue signals={summary.signals} />
            <MyActionPanel signals={summary.signals} />
            <RecentChangeList recentChanges={summary.recentChanges} />
          </div>
          <div className="space-y-4">
            <PermissionWorkPanel projects={summary.accessProjects} />
            <StatusFlow flow={summary.flow} />
            <QuickDrilldown signals={summary.signals} />
          </div>
        </div>
      </div>
    </div>
  );
}
