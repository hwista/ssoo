'use client';

import { SsooErrorPanel } from '@ssoo/web-shell';
import { useMemo, useRef, useState } from 'react';
import { useCurrentTab } from '@/hooks/useCurrentTab';
import { useProjectDetail, useTransitionReadiness } from '@/hooks/queries';
import { useProjectCloseConditions, useProjectDeliverables } from '@/hooks/queries/useProjects';
import { LoadingState } from '@/components/common/StateDisplay';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, ListTodo, Flag, AlertCircle, FileOutput, ClipboardCheck, Handshake, MessageSquareText } from 'lucide-react';
import { useTabStore } from '@/stores';
import { BasicInfoSection } from './sections/BasicInfoSection';
import { ProjectControlDashboardPanel } from './sections/ProjectControlDashboardPanel';
import { RequestDetailTab } from './tabs/RequestDetailTab';
import { ProposalDetailTab } from './tabs/ProposalDetailTab';
import { ExecutionDetailTab } from './tabs/ExecutionDetailTab';
import { TransitionDetailTab } from './tabs/TransitionDetailTab';
import { MembersTab } from './tabs/MembersTab';
import { TasksTab } from './tabs/TasksTab';
import { MilestonesTab } from './tabs/MilestonesTab';
import { ControlsTab } from './tabs/ControlsTab';
import { DeliverablesTab } from './tabs/DeliverablesTab';
import { CloseConditionsTab } from './tabs/CloseConditionsTab';
import { HandoffsTab } from './tabs/HandoffsTab';
import { ReviewSummaryTab } from './tabs/ReviewSummaryTab';
import { StatusTimeline } from './sections/StatusTimeline';
import { StageActionBar } from './sections/StageActionBar';
import type { CloseConditionItem, DeliverableItem, Project, ProjectStatusCode, TransitionReadiness } from '@/lib/api/endpoints/projects';
import type { LucideIcon } from 'lucide-react';

type ManagementTabKey =
  | 'members'
  | 'tasks'
  | 'milestones'
  | 'controls'
  | 'deliverables'
  | 'closeConditions'
  | 'handoffs'
  | 'review';

const MANAGEMENT_TABS: { key: ManagementTabKey; label: string; icon: LucideIcon }[] = [
  { key: 'members', label: '멤버', icon: Users },
  { key: 'tasks', label: '태스크', icon: ListTodo },
  { key: 'milestones', label: '마일스톤', icon: Flag },
  { key: 'controls', label: '컨트롤', icon: AlertCircle },
  { key: 'deliverables', label: '산출물', icon: FileOutput },
  { key: 'closeConditions', label: '종료조건', icon: ClipboardCheck },
  { key: 'handoffs', label: '인수인계', icon: Handshake },
  { key: 'review', label: '리뷰', icon: MessageSquareText },
];

const STATUS_TABS: { key: ProjectStatusCode; label: string }[] = [
  { key: 'request', label: '요청' },
  { key: 'proposal', label: '제안' },
  { key: 'execution', label: '수행' },
  { key: 'transition', label: '전환' },
];

const CLOSEOUT_DONE_DELIVERABLE_STATUSES = new Set(['confirmed', 'approved', 'final', 'not_required']);

const DELIVERABLE_STATUS_LABELS: Record<string, string> = {
  not_submitted: '미제출',
  before_submit: '미제출',
  submitted: '제출',
  confirmed: '확정',
  approved: '승인',
  rejected: '반려',
  final: '최종',
  not_required: '면제',
};

interface CloseoutQueueItem {
  key: string;
  label: string;
  title: string;
  meta: string;
  tab: ManagementTabKey;
  actionLabel: string;
  testId: string;
  tone: string;
}

function isManagementTabKey(value?: string): value is ManagementTabKey {
  return Boolean(value && MANAGEMENT_TABS.some((tab) => tab.key === value));
}

function isBlockingDeliverable(item: DeliverableItem) {
  return !CLOSEOUT_DONE_DELIVERABLE_STATUSES.has(item.submissionStatusCode);
}

function getDeliverableTitle(item: DeliverableItem) {
  return item.deliverable?.deliverableName ?? item.deliverableName ?? item.deliverableCode;
}

function buildCloseoutQueue({
  deliverables,
  closeConditions,
  readiness,
}: {
  deliverables: DeliverableItem[];
  closeConditions: CloseConditionItem[];
  readiness: TransitionReadiness | null;
}): CloseoutQueueItem[] {
  const deliverableItems = deliverables
    .filter(isBlockingDeliverable)
    .slice(0, 2)
    .map((item) => ({
      key: `deliverable-${item.statusCode}-${item.deliverableCode}`,
      label: '산출물',
      title: getDeliverableTitle(item),
      meta: DELIVERABLE_STATUS_LABELS[item.submissionStatusCode] ?? item.submissionStatusCode,
      tab: 'deliverables' as const,
      actionLabel: item.submissionStatusCode === 'submitted' ? '확정 처리' : '제출 보완',
      testId: 'pms-closeout-queue-deliverable',
      tone: 'bg-ssoo-info-bg text-ssoo-info border-ssoo-info-border',
    }));

  const closeConditionItems = closeConditions
    .filter((item) => !item.isChecked)
    .slice(0, 2)
    .map((item) => ({
      key: `close-condition-${item.statusCode}-${item.conditionCode}`,
      label: '종료조건',
      title: item.conditionCode,
      meta: item.requiresDeliverable ? '산출물 필요' : '미체크',
      tab: 'closeConditions' as const,
      actionLabel: '충족 확인',
      testId: 'pms-closeout-queue-close-condition',
      tone: 'bg-ssoo-success-bg text-ssoo-success border-ssoo-success-border',
    }));

  if (deliverableItems.length > 0 || closeConditionItems.length > 0) {
    return [...deliverableItems, ...closeConditionItems].slice(0, 4);
  }

  return [
    {
      key: 'review-feedback',
      label: '리뷰',
      title: readiness?.canComplete ? '종료 전 리뷰/피드백 기록' : '현재 막힌 조건 공유',
      meta: readiness?.canComplete ? '종료 가능' : '점검 필요',
      tab: 'review',
      actionLabel: '피드백 기록',
      testId: 'pms-closeout-queue-review',
      tone: readiness?.canComplete
        ? 'bg-ssoo-success-bg text-ssoo-success border-ssoo-success-border'
        : 'bg-muted text-muted-foreground border-border',
    },
  ];
}

function getNextAction(project: Project, readiness: TransitionReadiness | null): string {
  if (project.stageCode !== 'in_progress') {
    return project.stageCode === 'waiting' ? '단계 시작 여부를 확인하세요.' : '완료 결과와 후속 상태를 확인하세요.';
  }
  if (readiness && !readiness.canComplete) {
    const pending = readiness.deliverables.pending + readiness.closeConditions.unchecked;
    return `완료 전 차단 항목 ${pending}건을 먼저 정리하세요.`;
  }
  if (project.statusCode === 'execution') return '수행 상태, 산출물, 종료조건을 점검하세요.';
  if (project.statusCode === 'transition') return '운영 전환 담당과 전환 예정일을 확인하세요.';
  return '현재 단계의 담당자, 일정, 메모를 확인하세요.';
}

function ProjectReadinessPanel({
  project,
  readiness,
  deliverables,
  closeConditions,
  isCloseoutQueueLoading,
  onOpenManagementTab,
}: {
  project: Project;
  readiness: TransitionReadiness | null;
  deliverables: DeliverableItem[];
  closeConditions: CloseConditionItem[];
  isCloseoutQueueLoading: boolean;
  onOpenManagementTab: (tab: ManagementTabKey) => void;
}) {
  const blockingDeliverables = readiness?.deliverables.pending ?? 0;
  const blockingCloseConditions = readiness?.closeConditions.unchecked ?? 0;
  const completedDeliverables = readiness?.deliverables.completed ?? readiness?.deliverables.approved ?? 0;
  const canComplete = readiness?.canComplete ?? false;
  const nextAction = getNextAction(project, readiness);
  const closeoutQueue = buildCloseoutQueue({ deliverables, closeConditions, readiness });
  const visibleQueueCount = closeoutQueue.length;
  const hiddenBlockingCount = Math.max(
    0,
    deliverables.filter(isBlockingDeliverable).length +
      closeConditions.filter((item) => !item.isChecked).length -
      visibleQueueCount,
  );

  const cards = [
    {
      label: '다음 액션',
      value: nextAction,
      tone: 'bg-ssoo-info-bg border-ssoo-info-border text-ssoo-info',
    },
    {
      label: '막힌 조건',
      value: readiness ? `${blockingDeliverables + blockingCloseConditions}건` : '확인 중',
      tone: blockingDeliverables + blockingCloseConditions > 0
        ? 'bg-ssoo-warning-bg border-ssoo-warning-border text-ssoo-warning'
        : 'bg-ssoo-success-bg border-ssoo-success-border text-ssoo-success',
    },
    {
      label: '종료 가능 여부',
      value: readiness ? (canComplete ? '가능' : '대기') : '확인 중',
      tone: canComplete ? 'bg-ssoo-success-bg border-ssoo-success-border text-ssoo-success' : 'bg-muted border-border text-muted-foreground',
    },
  ];

  const actions = [
    {
      label: blockingDeliverables > 0 ? '산출물 정리' : '산출물 확인',
      description: readiness
        ? `${completedDeliverables}/${readiness.deliverables.total} 완료`
        : '산출물 상태 확인',
      tab: 'deliverables' as const,
      testId: 'pms-closeout-deliverables-action',
    },
    {
      label: blockingCloseConditions > 0 ? '종료조건 체크' : '종료조건 확인',
      description: readiness
        ? `${readiness.closeConditions.checked}/${readiness.closeConditions.total} 체크`
        : '종료조건 상태 확인',
      tab: 'closeConditions' as const,
      testId: 'pms-closeout-close-conditions-action',
    },
    {
      label: '리뷰/피드백',
      description: canComplete ? '최종 리뷰 남기기' : '막힌 조건 공유',
      tab: 'review' as const,
      testId: 'pms-closeout-review-action',
    },
  ];

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm" data-testid="pms-closeout-panel">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-ssoo-success" />
        <h2 className="text-sm font-semibold text-muted-foreground">PM 실행 closeout</h2>
        <span className="text-xs text-muted-foreground">산출물·종료조건 기준의 현재 조치 판단</span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className={`rounded-lg border px-3 py-2 ${card.tone}`}>
            <div className="text-caption-2xs font-medium opacity-80">{card.label}</div>
            <div className="mt-1 text-sm font-semibold">{card.value}</div>
          </div>
        ))}
      </div>
      {readiness && !readiness.canComplete && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>미확정 산출물 {blockingDeliverables}/{readiness.deliverables.total}</span>
          <span>미체크 종료조건 {blockingCloseConditions}/{readiness.closeConditions.total}</span>
        </div>
      )}
      <div className="mt-4 border-t pt-3">
        <div className="mb-2 text-caption-2xs font-semibold text-muted-foreground">조치 바로가기</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {actions.map((action) => (
            <Button
              key={action.tab}
              variant="outline"
              size="sm"
              data-testid={action.testId}
              className="h-auto w-full justify-start px-3 py-2 text-left"
              onClick={() => onOpenManagementTab(action.tab)}
            >
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{action.label}</span>
                <span className="block truncate text-caption-2xs font-normal text-muted-foreground">
                  {action.description}
                </span>
              </span>
            </Button>
          ))}
        </div>
      </div>
      <div className="mt-4 border-t pt-3" data-testid="pms-closeout-resolution-queue">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-caption-2xs font-semibold text-muted-foreground">처리 큐</div>
          {hiddenBlockingCount > 0 && (
            <div className="text-caption-2xs text-muted-foreground">외 {hiddenBlockingCount}건</div>
          )}
        </div>
        {isCloseoutQueueLoading ? (
          <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
            현재 단계의 산출물과 종료조건을 불러오는 중입니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {closeoutQueue.map((item) => (
              <Button
                key={item.key}
                variant="plain"
                size="plain"
                type="button"
                data-testid={item.testId}
                className="w-full justify-start rounded-md border bg-card px-3 py-2 text-left transition hover:border-ssoo-info-border hover:bg-ssoo-info-bg"
                onClick={() => onOpenManagementTab(item.tab)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-caption-xs font-semibold ${item.tone}`}>
                        {item.label}
                      </span>
                      <span className="text-caption-2xs text-muted-foreground">{item.meta}</span>
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold text-foreground">{item.title}</div>
                  </div>
                  <span className="shrink-0 text-caption-2xs font-semibold text-ssoo-info">{item.actionLabel}</span>
                </div>
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectDetailPage() {
  const tab = useCurrentTab();
  const { openTab } = useTabStore();
  const projectId = Number(tab?.params?.id);
  const requestedManagementTab = tab?.params?.managementTab;
  const initialManagementTab = isManagementTabKey(requestedManagementTab)
    ? requestedManagementTab
    : 'members';
  const [activeStatusTab, setActiveStatusTab] = useState<ProjectStatusCode | null>(null);
  const [currentManagementTab, setCurrentManagementTab] = useState<ManagementTabKey>(initialManagementTab);
  const managementSectionRef = useRef<HTMLDivElement | null>(null);

  const { data: response, isLoading, error, refetch } = useProjectDetail(projectId);
  const { data: readinessResponse } = useTransitionReadiness(projectId || undefined);

  const project: Project | null = useMemo(() => {
    if (!response?.success || !response.data) return null;
    return response.data;
  }, [response]);

  const closeoutProjectId = project?.statusCode ? projectId : 0;
  const { data: deliverablesResponse, isLoading: isDeliverablesLoading } = useProjectDeliverables(
    closeoutProjectId,
    project?.statusCode,
  );
  const { data: closeConditionsResponse, isLoading: isCloseConditionsLoading } = useProjectCloseConditions(
    closeoutProjectId,
    project?.statusCode,
  );

  // Set initial active tab to match project's current status
  const currentStatusTab = activeStatusTab ?? project?.statusCode ?? 'request';

  if (!projectId) {
    return <SsooErrorPanel kind="not-found" description="프로젝트 ID가 없습니다."
      actions={[{ label: '프로젝트 목록으로', intent: 'exit', onClick: () => { openTab({ menuCode: 'my-projects', menuId: 'my-projects', title: '내 프로젝트', path: '/my-projects', closable: true }); } }]} />;
  }

  if (isLoading) {
    return <LoadingState message="프로젝트 정보를 불러오는 중..." fullHeight />;
  }

  if (error || !project) {
    return (
      <SsooErrorPanel error={error} kind={error ? undefined : 'not-found'}
        title="프로젝트 정보를 불러오지 못했습니다" onRetry={() => refetch()}
        actions={[{ label: '프로젝트 목록으로', intent: 'exit', onClick: () => { openTab({ menuCode: 'my-projects', menuId: 'my-projects', title: '내 프로젝트', path: '/my-projects', closable: true }); } }]} />
    );
  }

  const handleBack = () => {
    const statusPath = `/${project.statusCode}`;
    openTab({
      menuCode: `${project.statusCode}.list`,
      menuId: `${project.statusCode}.list`,
      title: `${STATUS_TABS.find(t => t.key === project.statusCode)?.label ?? ''} 목록`,
      path: statusPath,
    });
  };

  const handleOpenManagementTab = (managementTab: ManagementTabKey) => {
    setCurrentManagementTab(managementTab);
    requestAnimationFrame(() => {
      managementSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="flex h-full flex-col" data-testid="pms-project-detail">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              PRJ-{String(project.id).padStart(6, '0')}
            </p>
            <h1 className="truncate text-lg font-semibold">{project.projectName}</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-6 overflow-auto p-4 sm:p-6">
        {/* Basic Info */}
        <BasicInfoSection project={project} onUpdated={() => refetch()} />

        {/* Stage Action Bar */}
        <StageActionBar
          projectId={projectId}
          statusCode={project.statusCode}
          stageCode={project.stageCode}
          doneResultCode={project.doneResultCode}
          onTransitioned={() => refetch()}
        />

        <ProjectControlDashboardPanel
          projectId={projectId}
          onOpenManagementTab={handleOpenManagementTab}
        />

        <ProjectReadinessPanel
          project={project}
          readiness={readinessResponse?.data ?? null}
          deliverables={deliverablesResponse?.data ?? []}
          closeConditions={closeConditionsResponse?.data ?? []}
          isCloseoutQueueLoading={isDeliverablesLoading || isCloseConditionsLoading}
          onOpenManagementTab={handleOpenManagementTab}
        />

        {/* Status Tabs */}
        <div className="border rounded-lg bg-card">
          <div className="flex overflow-x-auto border-b">
            {STATUS_TABS.map((st) => (
              <Button variant="plain" size="plain"
                key={st.key}
                data-testid={`pms-status-tab-${st.key}`}
                onClick={() => setActiveStatusTab(st.key)}
                className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  currentStatusTab === st.key
                    ? 'border-ssoo-primary text-ssoo-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {st.label}
                {project.statusCode === st.key && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-caption-xs rounded bg-ssoo-primary/10 text-ssoo-primary">
                    현재
                  </span>
                )}
              </Button>
            ))}
          </div>

          <div className="p-4">
            {currentStatusTab === 'request' && (
              <RequestDetailTab projectId={projectId} detail={project.requestDetail ?? null} onSaved={() => refetch()} />
            )}
            {currentStatusTab === 'proposal' && (
              <ProposalDetailTab projectId={projectId} detail={project.proposalDetail ?? null} onSaved={() => refetch()} />
            )}
            {currentStatusTab === 'execution' && (
              <ExecutionDetailTab projectId={projectId} detail={project.executionDetail ?? null} onSaved={() => refetch()} />
            )}
            {currentStatusTab === 'transition' && (
              <TransitionDetailTab projectId={projectId} detail={project.transitionDetail ?? null} onSaved={() => refetch()} />
            )}
          </div>
        </div>

        {/* Management Tabs (멤버/태스크/마일스톤/컨트롤) */}
        <div ref={managementSectionRef} className="bg-card rounded-lg border shadow-sm">
          <div className="border-b px-4">
            <div className="flex gap-1 overflow-x-auto">
              {MANAGEMENT_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button variant="plain" size="plain"
                    key={tab.key}
                    data-testid={`pms-management-tab-${tab.key}`}
                    onClick={() => setCurrentManagementTab(tab.key)}
                    className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                      currentManagementTab === tab.key
                        ? 'border-ssoo-info-border text-ssoo-info'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="p-4">
            {currentManagementTab === 'members' && <MembersTab projectId={projectId} />}
            {currentManagementTab === 'tasks' && <TasksTab projectId={projectId} />}
            {currentManagementTab === 'milestones' && <MilestonesTab projectId={projectId} />}
            {currentManagementTab === 'controls' && <ControlsTab projectId={projectId} />}
            {currentManagementTab === 'deliverables' && <DeliverablesTab projectId={projectId} statusCode={project.statusCode} />}
            {currentManagementTab === 'closeConditions' && <CloseConditionsTab projectId={projectId} statusCode={project.statusCode} />}
            {currentManagementTab === 'handoffs' && <HandoffsTab projectId={projectId} project={project} />}
            {currentManagementTab === 'review' && <ReviewSummaryTab projectId={projectId} />}
          </div>
        </div>

        {/* Status Timeline */}
        {project.projectStatuses && project.projectStatuses.length > 0 && (
          <StatusTimeline statuses={project.projectStatuses} currentStatusCode={project.statusCode} />
        )}
      </div>
    </div>
  );
}
