'use client';

import { SsooErrorNotice } from '@ssoo/web-shell';

import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CircleDollarSign,
  ClipboardCheck,
  FileOutput,
  ListTodo,
  MessageSquareText,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/StateDisplay';
import { useProjectDashboardSummary } from '@/hooks/queries/useProjects';
import { formatPmsAmount, formatPmsCount, formatPmsDate, formatPmsNumber } from '@/lib/pms-format';
import type { LucideIcon } from 'lucide-react';

type ProjectControlDashboardTargetTab =
  | 'tasks'
  | 'milestones'
  | 'controls'
  | 'deliverables'
  | 'closeConditions'
  | 'review';

interface ProjectControlDashboardPanelProps {
  projectId: number;
  onOpenManagementTab: (tab: ProjectControlDashboardTargetTab) => void;
}

interface DashboardCard {
  key: string;
  label: string;
  value: string;
  meta: string;
  icon: LucideIcon;
  tone: string;
  testId: string;
}

function formatDashboardHours(value: number | null | undefined) {
  return `${formatPmsNumber(value ?? 0)}h`;
}

export function ProjectControlDashboardPanel({
  projectId,
  onOpenManagementTab,
}: ProjectControlDashboardPanelProps) {
  const { data: response, isLoading, error, refetch } = useProjectDashboardSummary(projectId);
  const summary = response?.success ? response.data : null;

  if (isLoading) {
    return (
      <section className="rounded-lg border bg-card p-4 shadow-sm" data-testid="pms-project-control-dashboard">
        <LoadingSpinner message="프로젝트 통제 요약을 불러오는 중입니다." />
      </section>
    );
  }

  if (error || !summary) {
    return (
      <section className="rounded-lg border bg-card p-4 shadow-sm" data-testid="pms-project-control-dashboard">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">프로젝트 통제 요약</h2>
            <SsooErrorNotice as="p" compact className="mt-1 text-xs text-muted-foreground">
              비용·일정·성과·통제 상태를 불러오지 못했습니다.
            </SsooErrorNotice>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </Button>
        </div>
      </section>
    );
  }

  const cards: DashboardCard[] = [
    {
      key: 'cost',
      label: '계약 스냅샷',
      value: formatPmsAmount(summary.cost.contractTotalAmount, summary.cost.currencyCode),
      meta: `계약 ${formatPmsCount(summary.cost.contractCount)} · 대금 ${formatPmsCount(summary.cost.paymentCount)} · 수금 ${formatPmsAmount(summary.cost.paidPaymentAmount, summary.cost.currencyCode)}`,
      icon: CircleDollarSign,
      tone: 'border-ssoo-info-border bg-ssoo-info-bg text-ssoo-info',
      testId: 'pms-project-dashboard-cost-snapshot',
    },
    {
      key: 'schedule',
      label: '일정',
      value: `${summary.schedule.milestoneAchieved}/${summary.schedule.milestoneTotal} 마일스톤`,
      meta: `지연 작업 ${formatPmsCount(summary.schedule.taskDelayed)} · 다음 ${summary.schedule.nextMilestoneName ?? '없음'} ${formatPmsDate(summary.schedule.nextMilestoneDueAt)}`,
      icon: CalendarClock,
      tone: summary.schedule.taskDelayed + summary.schedule.milestoneDelayed > 0
        ? 'border-ssoo-warning-border bg-ssoo-warning-bg text-ssoo-warning'
        : 'border-ssoo-success-border bg-ssoo-success-bg text-ssoo-success',
      testId: 'pms-project-dashboard-schedule',
    },
    {
      key: 'performance',
      label: '성과',
      value: `${formatPmsNumber(summary.performance.completionRate)}%`,
      meta: `작업 평균 ${formatPmsNumber(summary.performance.averageTaskProgress)}% · 공수 ${formatDashboardHours(summary.performance.actualHours)}/${formatDashboardHours(summary.performance.estimatedHours)} · 산출물 ${summary.performance.deliverableCompleted}/${summary.performance.deliverableTotal} · 종료조건 ${summary.performance.closeConditionChecked}/${summary.performance.closeConditionTotal}`,
      icon: TrendingUp,
      tone: 'border-ssoo-success-border bg-ssoo-success-bg text-ssoo-success',
      testId: 'pms-project-dashboard-performance',
    },
    {
      key: 'controls',
      label: '통제/피드백',
      value: formatPmsCount(summary.readiness.blockerCount),
      meta: `열린 이슈 ${formatPmsCount(summary.controls.openIssueCount)} · 리스크 ${formatPmsCount(summary.controls.openRiskCount)} · 피드백 ${formatPmsCount(summary.controls.openLaunchFeedbackCount)}`,
      icon: AlertTriangle,
      tone: summary.readiness.blockerCount > 0
        ? 'border-ssoo-danger/30 bg-ssoo-danger/10 text-ssoo-danger'
        : 'border-border bg-muted text-muted-foreground',
      testId: 'pms-project-dashboard-controls',
    },
  ];

  const actions: Array<{
    label: string;
    tab: ProjectControlDashboardTargetTab;
    icon: LucideIcon;
    testId: string;
  }> = [
    { label: '작업', tab: 'tasks', icon: ListTodo, testId: 'pms-project-dashboard-action-tasks' },
    { label: '마일스톤', tab: 'milestones', icon: CalendarClock, testId: 'pms-project-dashboard-action-milestones' },
    { label: '통제', tab: 'controls', icon: AlertTriangle, testId: 'pms-project-dashboard-action-controls' },
    { label: '산출물', tab: 'deliverables', icon: FileOutput, testId: 'pms-project-dashboard-action-deliverables' },
    { label: '종료조건', tab: 'closeConditions', icon: ClipboardCheck, testId: 'pms-project-dashboard-action-close-conditions' },
    { label: '리뷰', tab: 'review', icon: MessageSquareText, testId: 'pms-project-dashboard-action-review' },
  ];

  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm" data-testid="pms-project-control-dashboard">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-ssoo-info" />
            <h2 className="text-sm font-semibold text-foreground">프로젝트 통제 요약</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{summary.readiness.nextActionLabel}</p>
        </div>
        <div className="shrink-0 rounded-full border px-2.5 py-1 text-caption-2xs font-semibold text-muted-foreground">
          {summary.readiness.canCompleteCurrentStage ? '종료 전 리뷰 가능' : '조치 필요'}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className={`rounded-lg border px-3 py-3 ${card.tone}`} data-testid={card.testId}>
              <div className="flex items-center gap-2 text-caption-2xs font-semibold opacity-80">
                <Icon className="h-3.5 w-3.5" />
                {card.label}
              </div>
              <div className="mt-2 text-base font-semibold">{card.value}</div>
              <div className="mt-1 line-clamp-2 text-caption-2xs opacity-80">{card.meta}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-md border border-dashed px-3 py-2 text-caption-2xs text-muted-foreground">
        {summary.cost.boundaryNote}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.tab}
              variant="outline"
              size="sm"
              data-testid={action.testId}
              onClick={() => onOpenManagementTab(action.tab)}
            >
              <Icon className="h-4 w-4" />
              {action.label}
            </Button>
          );
        })}
      </div>
    </section>
  );
}
