'use client';

import { useMemo } from 'react';
import {
  FileText,
  Send,
  Cog,
  ArrowRightLeft,
  Clock,
  Activity,
  Construction,
  AlertCircle,
} from 'lucide-react';
import { useProjectList } from '@/hooks/queries/useProjects';
import { useTabStore } from '@/stores';
import { Skeleton } from '@/components/ui/skeleton';
import type { Project, ProjectStatusCode } from '@/lib/api/endpoints/projects';

const STATUS_CONFIG: Record<
  ProjectStatusCode,
  { label: string; icon: React.ElementType; bgColor: string; textColor: string; iconColor: string }
> = {
  request: {
    label: '요청',
    icon: FileText,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    iconColor: 'text-amber-500',
  },
  proposal: {
    label: '제안',
    icon: Send,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-500',
  },
  execution: {
    label: '수행',
    icon: Cog,
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    iconColor: 'text-green-500',
  },
  transition: {
    label: '전환',
    icon: ArrowRightLeft,
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    iconColor: 'text-purple-500',
  },
};

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  waiting: { label: '대기', color: 'bg-gray-100 text-gray-600' },
  in_progress: { label: '진행중', color: 'bg-blue-100 text-blue-700' },
  done: { label: '완료', color: 'bg-green-100 text-green-700' },
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

/**
 * 홈 대시보드 페이지
 * - 프로젝트 현황 (상태별 건수)
 * - 최근 프로젝트 (최근 업데이트 5건)
 * - 진행중 프로젝트 (stageCode = in_progress)
 * - 준비중 위젯 (이슈 현황 등 예정)
 */
export function HomeDashboardPage() {
  const { data, isLoading, error } = useProjectList({ pageSize: 100 });

  const projects = useMemo(() => data?.data?.items ?? [], [data]);

  const statusCounts = useMemo(() => {
    const counts: Record<ProjectStatusCode, number> = {
      request: 0,
      proposal: 0,
      execution: 0,
      transition: 0,
    };
    for (const p of projects) {
      if (p.statusCode in counts) {
        counts[p.statusCode]++;
      }
    }
    return counts;
  }, [projects]);

  const recentProjects = useMemo(
    () =>
      [...projects]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5),
    [projects],
  );

  const activeProjects = useMemo(
    () => projects.filter((p) => p.stageCode === 'in_progress'),
    [projects],
  );

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center text-gray-500">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-400" />
          <p className="text-sm">데이터를 불러오지 못했습니다</p>
          <p className="text-xs text-gray-400 mt-1">잠시 후 다시 시도해주세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 페이지 헤더 */}
        <div>
          <h1 className="text-lg font-bold text-gray-800">대시보드</h1>
          <p className="text-sm text-gray-500 mt-0.5">프로젝트 현황을 한눈에 확인하세요</p>
        </div>

        {/* 2x2 위젯 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatusSummaryWidget counts={statusCounts} isLoading={isLoading} />
          <RecentProjectsWidget projects={recentProjects} isLoading={isLoading} />
          <ActiveProjectsWidget projects={activeProjects} isLoading={isLoading} />
          <ComingSoonWidget />
        </div>
      </div>
    </div>
  );
}

/* ── Widget: 프로젝트 현황 ──────────────────────── */

function StatusSummaryWidget({
  counts,
  isLoading,
}: {
  counts: Record<ProjectStatusCode, number>;
  isLoading: boolean;
}) {
  const statuses: ProjectStatusCode[] = ['request', 'proposal', 'execution', 'transition'];

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">프로젝트 현황</h2>
      <div className="grid grid-cols-2 gap-3">
        {statuses.map((status) => {
          const cfg = STATUS_CONFIG[status];
          const Icon = cfg.icon;
          return (
            <div
              key={status}
              className={`${cfg.bgColor} rounded-lg p-3 flex items-center gap-3`}
            >
              <div className="shrink-0">
                <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
              </div>
              <div className="min-w-0">
                {isLoading ? (
                  <Skeleton className="h-6 w-10 mb-1" />
                ) : (
                  <p className={`text-xl font-bold ${cfg.textColor}`}>{counts[status]}</p>
                )}
                <p className="text-xs text-gray-500 truncate">{cfg.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Widget: 최근 프로젝트 ──────────────────────── */

function RecentProjectsWidget({
  projects,
  isLoading,
}: {
  projects: Project[];
  isLoading: boolean;
}) {
  const openTab = useTabStore((s) => s.openTab);

  const handleClick = (project: Project) => {
    openTab({
      menuCode: 'PROJECT_DETAIL',
      menuId: 'project-detail',
      title: project.projectName,
      path: '/pms/projects/detail',
      params: { projectId: String(project.id) },
      replaceExisting: false,
    });
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-700">최근 프로젝트</h2>
      </div>
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))
        ) : projects.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">프로젝트가 없습니다</p>
        ) : (
          projects.map((p) => {
            const statusCfg = STATUS_CONFIG[p.statusCode];
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleClick(p)}
                className="w-full flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-sm text-gray-800 truncate flex-1 min-w-0">
                  {p.projectName}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.bgColor} ${statusCfg.textColor}`}
                >
                  {statusCfg.label}
                </span>
                <span className="shrink-0 text-xs text-gray-400 w-16 text-right">
                  {formatRelativeTime(p.updatedAt)}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ── Widget: 진행중 프로젝트 ─────────────────────── */

function ActiveProjectsWidget({
  projects,
  isLoading,
}: {
  projects: Project[];
  isLoading: boolean;
}) {
  const openTab = useTabStore((s) => s.openTab);

  const handleClick = (project: Project) => {
    openTab({
      menuCode: 'PROJECT_DETAIL',
      menuId: 'project-detail',
      title: project.projectName,
      path: '/pms/projects/detail',
      params: { projectId: String(project.id) },
      replaceExisting: false,
    });
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-blue-500" />
        <h2 className="text-sm font-semibold text-gray-700">진행중 프로젝트</h2>
      </div>
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ))
        ) : projects.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">진행중인 프로젝트가 없습니다</p>
        ) : (
          projects.map((p) => {
            const statusCfg = STATUS_CONFIG[p.statusCode];
            const stageCfg = STAGE_LABELS[p.stageCode] ?? {
              label: p.stageCode,
              color: 'bg-gray-100 text-gray-600',
            };
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleClick(p)}
                className="w-full flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-sm text-gray-800 truncate flex-1 min-w-0">
                  {p.projectName}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.bgColor} ${statusCfg.textColor}`}
                >
                  {statusCfg.label}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${stageCfg.color}`}
                >
                  {stageCfg.label}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ── Widget: 준비중 ──────────────────────────────── */

function ComingSoonWidget() {
  return (
    <div className="bg-white rounded-lg border shadow-sm p-4 flex flex-col items-center justify-center min-h-[180px]">
      <Construction className="w-8 h-8 text-gray-300 mb-2" />
      <p className="text-sm font-medium text-gray-400">준비 중</p>
      <p className="text-xs text-gray-300 mt-1">이슈 현황 · 마일스톤 임박</p>
    </div>
  );
}
