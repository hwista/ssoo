'use client';

import { useMemo, useState } from 'react';
import { useCurrentTab } from '@/hooks/useCurrentTab';
import { useProjectDetail, useTransitionReadiness } from '@/hooks/queries';
import { LoadingState, ErrorState } from '@/components/common/StateDisplay';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, ListTodo, Flag, AlertCircle, FileOutput, ClipboardCheck } from 'lucide-react';
import { useTabStore } from '@/stores';
import { BasicInfoSection } from './sections/BasicInfoSection';
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
import { StatusTimeline } from './sections/StatusTimeline';
import { StageActionBar } from './sections/StageActionBar';
import type { Project, ProjectStatusCode, TransitionReadiness } from '@/lib/api/endpoints/projects';
import type { LucideIcon } from 'lucide-react';

type ManagementTabKey =
  | 'members'
  | 'tasks'
  | 'milestones'
  | 'controls'
  | 'deliverables'
  | 'closeConditions';

const MANAGEMENT_TABS: { key: ManagementTabKey; label: string; icon: LucideIcon }[] = [
  { key: 'members', label: '멤버', icon: Users },
  { key: 'tasks', label: '태스크', icon: ListTodo },
  { key: 'milestones', label: '마일스톤', icon: Flag },
  { key: 'controls', label: '컨트롤', icon: AlertCircle },
  { key: 'deliverables', label: '산출물', icon: FileOutput },
  { key: 'closeConditions', label: '종료조건', icon: ClipboardCheck },
];

const STATUS_TABS: { key: ProjectStatusCode; label: string }[] = [
  { key: 'request', label: '요청' },
  { key: 'proposal', label: '제안' },
  { key: 'execution', label: '수행' },
  { key: 'transition', label: '전환' },
];

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
}: {
  project: Project;
  readiness: TransitionReadiness | null;
}) {
  const blockingDeliverables = readiness?.deliverables.pending ?? 0;
  const blockingCloseConditions = readiness?.closeConditions.unchecked ?? 0;
  const canComplete = readiness?.canComplete ?? false;
  const nextAction = getNextAction(project, readiness);

  const cards = [
    {
      label: '다음 액션',
      value: nextAction,
      tone: 'bg-blue-50 border-blue-100 text-blue-800',
    },
    {
      label: '막힌 조건',
      value: readiness ? `${blockingDeliverables + blockingCloseConditions}건` : '확인 중',
      tone: blockingDeliverables + blockingCloseConditions > 0
        ? 'bg-amber-50 border-amber-100 text-amber-800'
        : 'bg-green-50 border-green-100 text-green-800',
    },
    {
      label: '종료 가능 여부',
      value: readiness ? (canComplete ? '가능' : '대기') : '확인 중',
      tone: canComplete ? 'bg-green-50 border-green-100 text-green-800' : 'bg-gray-50 border-gray-100 text-gray-700',
    },
  ];

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-green-600" />
        <h2 className="text-sm font-semibold text-gray-700">PM 실행 closeout</h2>
        <span className="text-xs text-muted-foreground">산출물·종료조건 기준의 현재 조치 판단</span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className={`rounded-lg border px-3 py-2 ${card.tone}`}>
            <div className="text-[11px] font-medium opacity-80">{card.label}</div>
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
    </div>
  );
}

export function ProjectDetailPage() {
  const tab = useCurrentTab();
  const { openTab } = useTabStore();
  const projectId = Number(tab?.params?.id);
  const [activeStatusTab, setActiveStatusTab] = useState<ProjectStatusCode | null>(null);
  const [currentManagementTab, setCurrentManagementTab] = useState<ManagementTabKey>('members');

  const { data: response, isLoading, error, refetch } = useProjectDetail(projectId);
  const { data: readinessResponse } = useTransitionReadiness(projectId || undefined);

  const project: Project | null = useMemo(() => {
    if (!response?.success || !response.data) return null;
    return response.data;
  }, [response]);

  // Set initial active tab to match project's current status
  const currentStatusTab = activeStatusTab ?? project?.statusCode ?? 'request';

  if (!projectId) {
    return <ErrorState error="프로젝트 ID가 없습니다." />;
  }

  if (isLoading) {
    return <LoadingState message="프로젝트 정보를 불러오는 중..." fullHeight />;
  }

  if (error || !project) {
    return (
      <ErrorState
        error={error?.message || '프로젝트를 찾을 수 없습니다.'}
        onRetry={() => refetch()}
      />
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-xs text-muted-foreground">
              PRJ-{String(project.id).padStart(6, '0')}
            </p>
            <h1 className="text-lg font-semibold">{project.projectName}</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
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

        <ProjectReadinessPanel project={project} readiness={readinessResponse?.data ?? null} />

        {/* Status Tabs */}
        <div className="border rounded-lg bg-white">
          <div className="flex border-b">
            {STATUS_TABS.map((st) => (
              <button
                key={st.key}
                onClick={() => setActiveStatusTab(st.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  currentStatusTab === st.key
                    ? 'border-ssoo-primary text-ssoo-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {st.label}
                {project.statusCode === st.key && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded bg-ssoo-primary/10 text-ssoo-primary">
                    현재
                  </span>
                )}
              </button>
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
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="border-b px-4">
            <div className="flex gap-1">
              {MANAGEMENT_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setCurrentManagementTab(tab.key)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                      currentManagementTab === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
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
