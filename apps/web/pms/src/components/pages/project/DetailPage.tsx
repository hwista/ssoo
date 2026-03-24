'use client';

import { useMemo, useState } from 'react';
import { useCurrentTab } from '@/hooks/useCurrentTab';
import { useProjectDetail } from '@/hooks/queries';
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
import { IssuesTab } from './tabs/IssuesTab';
import { DeliverablesTab } from './tabs/DeliverablesTab';
import { CloseConditionsTab } from './tabs/CloseConditionsTab';
import { StatusTimeline } from './sections/StatusTimeline';
import { StageActionBar } from './sections/StageActionBar';
import { HandoffSection } from './sections/HandoffSection';
import type { Project, ProjectStatusCode } from '@/lib/api/endpoints/projects';
import type { LucideIcon } from 'lucide-react';

type ManagementTabKey = 'members' | 'tasks' | 'milestones' | 'issues' | 'deliverables' | 'closeConditions';

const MANAGEMENT_TABS: { key: ManagementTabKey; label: string; icon: LucideIcon }[] = [
  { key: 'members', label: '멤버', icon: Users },
  { key: 'tasks', label: '태스크', icon: ListTodo },
  { key: 'milestones', label: '마일스톤', icon: Flag },
  { key: 'issues', label: '이슈', icon: AlertCircle },
  { key: 'deliverables', label: '산출물', icon: FileOutput },
  { key: 'closeConditions', label: '종료조건', icon: ClipboardCheck },
];

const STATUS_TABS: { key: ProjectStatusCode; label: string }[] = [
  { key: 'request', label: '요청' },
  { key: 'proposal', label: '제안' },
  { key: 'execution', label: '수행' },
  { key: 'transition', label: '전환' },
];

export function ProjectDetailPage() {
  const tab = useCurrentTab();
  const { openTab } = useTabStore();
  const projectId = Number(tab?.params?.id);
  const [activeStatusTab, setActiveStatusTab] = useState<ProjectStatusCode | null>(null);
  const [currentManagementTab, setCurrentManagementTab] = useState<ManagementTabKey>('members');

  const { data: response, isLoading, error, refetch } = useProjectDetail(projectId);

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

        <HandoffSection
          projectId={projectId}
          project={project}
          onHandoffChanged={() => refetch()}
        />

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

        {/* Management Tabs (멤버/태스크/마일스톤/이슈) */}
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
            {currentManagementTab === 'issues' && <IssuesTab projectId={projectId} />}
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
