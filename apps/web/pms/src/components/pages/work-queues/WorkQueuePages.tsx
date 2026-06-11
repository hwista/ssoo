'use client';

import { useMemo } from 'react';
import type { ElementType, ReactNode } from 'react';
import { AlertCircle, BarChart3, CheckCircle2, Clock, FolderKanban, ListTodo, UserRoundX } from 'lucide-react';
import { useProjectList } from '@/hooks/queries';
import { useTabStore } from '@/stores';
import { Skeleton } from '@/components/ui/skeleton';
import type { Project, ProjectStatusCode } from '@/lib/api/endpoints/projects';

const STATUS_LABELS: Record<ProjectStatusCode, string> = {
  request: '요청/인계',
  proposal: '제안 참조',
  execution: '수행',
  transition: '종료/전환',
};

const STATUS_BADGE_CLASSES: Record<ProjectStatusCode, string> = {
  request: 'bg-amber-50 text-amber-700 border-amber-200',
  proposal: 'bg-blue-50 text-blue-700 border-blue-200',
  execution: 'bg-green-50 text-green-700 border-green-200',
  transition: 'bg-purple-50 text-purple-700 border-purple-200',
};

const STAGE_LABELS = {
  waiting: '대기',
  in_progress: '진행중',
  done: '완료',
} as const;

function getDaysSince(dateStr: string): number {
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

function useProjects() {
  const { data, isLoading, error } = useProjectList({ pageSize: 100 });
  return {
    projects: data?.data?.items ?? [],
    isLoading,
    error,
  };
}

function useOpenProjectDetail() {
  const { openTab } = useTabStore();
  return (project: Project) => {
    openTab({
      menuCode: 'project.detail',
      menuId: `project.detail.${project.id}`,
      title: `PRJ-${String(project.id).padStart(6, '0')} ${project.projectName}`,
      path: '/project/detail',
      params: { id: String(project.id) },
    });
  };
}

function PageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="h-full overflow-auto bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function LoadingCards() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-lg border bg-white p-4 shadow-sm">
          <Skeleton className="mb-3 h-5 w-2/3" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function ErrorState() {
  return (
    <div className="rounded-lg border bg-white p-8 text-center text-gray-500 shadow-sm">
      <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
      <p className="text-sm font-medium">프로젝트 데이터를 불러오지 못했습니다.</p>
      <p className="mt-1 text-xs text-gray-400">잠시 후 다시 시도해주세요.</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
      {message}
    </div>
  );
}

function ProjectCard({
  project,
  reason,
  meta,
}: {
  project: Project;
  reason?: string;
  meta?: string;
}) {
  const openProject = useOpenProjectDetail();
  const staleDays = getDaysSince(project.updatedAt);

  return (
    <button
      type="button"
      onClick={() => openProject(project)}
      className="rounded-lg border bg-white p-4 text-left shadow-sm transition hover:border-ssoo-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{project.projectName}</p>
          <p className="mt-1 text-xs text-gray-500">PRJ-{String(project.id).padStart(6, '0')}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[project.statusCode]}`}>
          {STATUS_LABELS[project.statusCode]}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
        <span className="rounded bg-gray-100 px-2 py-1">{STAGE_LABELS[project.stageCode]}</span>
        <span className="rounded bg-gray-100 px-2 py-1">최근 업데이트 {staleDays}일 전</span>
        <span className="rounded bg-gray-100 px-2 py-1">담당자 {project.currentOwnerUserId ? project.currentOwnerUserId : '미지정'}</span>
      </div>
      {reason ? (
        <p className="mt-3 text-xs font-medium text-ssoo-primary">{reason}</p>
      ) : null}
      {meta ? <p className="mt-1 text-xs text-gray-500">{meta}</p> : null}
    </button>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  help,
}: {
  icon: ElementType;
  label: string;
  value: number;
  help: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-ssoo-sitemap-bg p-2 text-ssoo-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-500">{help}</p>
    </div>
  );
}

export function MyProjectsPage() {
  const { projects, isLoading, error } = useProjects();
  const visibleProjects = useMemo(
    () => [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [projects],
  );

  return (
    <PageShell title="내 프로젝트" description="내가 맡았거나 최근 확인해야 하는 프로젝트에서 업무를 이어갑니다.">
      {isLoading ? <LoadingCards /> : error ? <ErrorState /> : visibleProjects.length === 0 ? (
        <EmptyState message="표시할 프로젝트가 없습니다." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visibleProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              reason={project.stageCode === 'in_progress' ? '진행 중인 프로젝트입니다.' : undefined}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}

export function ActionRequiredPage() {
  const { projects, isLoading, error } = useProjects();
  const actionItems = useMemo(() => {
    return projects
      .map((project) => {
        const reasons: string[] = [];
        if (project.stageCode === 'in_progress' && getDaysSince(project.updatedAt) >= 7) {
          reasons.push('7일 이상 업데이트 없음');
        }
        if (project.stageCode === 'in_progress' && !project.currentOwnerUserId) {
          reasons.push('담당자 미지정');
        }
        if (project.statusCode === 'transition' || (project.statusCode === 'execution' && project.stageCode === 'done')) {
          reasons.push('종료/전환 확인 필요');
        }
        return { project, reasons };
      })
      .filter((item) => item.reasons.length > 0)
      .sort((a, b) => b.reasons.length - a.reasons.length || getDaysSince(b.project.updatedAt) - getDaysSince(a.project.updatedAt));
  }, [projects]);

  return (
    <PageShell title="조치 필요" description="프로젝트별로 흩어진 항목 중 지금 확인하거나 처리해야 하는 것만 모읍니다.">
      {isLoading ? <LoadingCards /> : error ? <ErrorState /> : actionItems.length === 0 ? (
        <EmptyState message="현재 조치가 필요한 항목이 없습니다." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {actionItems.map(({ project, reasons }) => (
            <ProjectCard key={project.id} project={project} reason={reasons.join(' · ')} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

export function CloseoutPage() {
  const { projects, isLoading, error } = useProjects();
  const closeoutProjects = useMemo(() => {
    return projects
      .filter((project) => project.statusCode === 'transition' || (project.statusCode === 'execution' && project.stageCode === 'done'))
      .sort((a, b) => getDaysSince(b.updatedAt) - getDaysSince(a.updatedAt));
  }, [projects]);

  return (
    <PageShell title="종료/전환" description="완료 후보와 전환 대기 프로젝트의 막힌 조건과 다음 확인 대상을 봅니다.">
      {isLoading ? <LoadingCards /> : error ? <ErrorState /> : closeoutProjects.length === 0 ? (
        <EmptyState message="종료/전환 확인 대상 프로젝트가 없습니다." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {closeoutProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              reason={project.statusCode === 'transition' ? '전환 진행 상태를 확인해야 합니다.' : '수행 완료 후 종료/전환 진입 여부를 확인해야 합니다.'}
              meta={`전환 예정일: ${formatDate(project.transitionDetail?.transitionDueAt)}`}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}

export function OperationsOverviewPage() {
  const { projects, isLoading, error } = useProjects();
  const summary = useMemo(() => {
    const staleProjects = projects.filter((project) => project.stageCode === 'in_progress' && getDaysSince(project.updatedAt) >= 7);
    const unownedProjects = projects.filter((project) => project.stageCode === 'in_progress' && !project.currentOwnerUserId);
    const closeoutCandidates = projects.filter(
      (project) => project.statusCode === 'transition' || (project.statusCode === 'execution' && project.stageCode === 'done'),
    );
    const activeProjects = projects.filter((project) => project.stageCode === 'in_progress');
    return { staleProjects, unownedProjects, closeoutCandidates, activeProjects };
  }, [projects]);

  return (
    <PageShell title="전체 운영 현황" description="상위 관리자와 PMO가 프로젝트 병목, 부하, 종료 후보를 한눈에 확인합니다.">
      {isLoading ? <LoadingCards /> : error ? <ErrorState /> : (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <SummaryCard icon={FolderKanban} label="진행 중" value={summary.activeProjects.length} help="현재 실행 중인 프로젝트" />
            <SummaryCard icon={Clock} label="정체" value={summary.staleProjects.length} help="7일 이상 업데이트가 없는 진행 항목" />
            <SummaryCard icon={UserRoundX} label="담당자 미지정" value={summary.unownedProjects.length} help="소유자 확인이 필요한 항목" />
            <SummaryCard icon={CheckCircle2} label="종료 후보" value={summary.closeoutCandidates.length} help="종료/전환 readiness 확인 대상" />
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-ssoo-primary" />
              <h2 className="text-sm font-semibold text-gray-800">운영 판단 큐</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[...summary.staleProjects, ...summary.unownedProjects, ...summary.closeoutCandidates]
                .filter((project, index, arr) => arr.findIndex((candidate) => candidate.id === project.id) === index)
                .slice(0, 6)
                .map((project) => (
                  <ProjectCard key={project.id} project={project} reason="관리자 확인이 필요한 운영 병목 후보입니다." />
                ))}
            </div>
          </div>
        </>
      )}
    </PageShell>
  );
}

export function WorkQueuePlaceholder() {
  return (
    <PageShell title="업무 큐" description="프로젝트를 횡단해 지금 확인해야 하는 항목을 모으는 PMS 업무 큐입니다.">
      <div className="rounded-lg border bg-white p-6 text-sm text-gray-500 shadow-sm">
        <ListTodo className="mb-3 h-8 w-8 text-ssoo-primary" />
        세부 항목은 프로젝트 실행 데이터와 함께 확장됩니다.
      </div>
    </PageShell>
  );
}
