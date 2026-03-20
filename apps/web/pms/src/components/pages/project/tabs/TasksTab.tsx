'use client';

import { ListTodo } from 'lucide-react';
import { useProjectTasks } from '@/hooks/queries/useProjects';
import type { TaskItem } from '@/lib/api/endpoints/projects';

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  on_hold: 'bg-yellow-50 text-yellow-700',
  cancelled: 'bg-red-50 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  not_started: '미착수',
  in_progress: '진행중',
  completed: '완료',
  on_hold: '보류',
  cancelled: '취소',
};

interface Props {
  projectId: number;
}

export function TasksTab({ projectId }: Props) {
  const { data, isLoading } = useProjectTasks(projectId);
  const tasks = data?.data ?? [];

  if (isLoading) return <div className="p-4 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ListTodo className="h-4 w-4" />
          태스크 ({tasks.length})
        </h3>
      </div>

      {tasks.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          아직 등록된 태스크가 없습니다.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">WBS</th>
                <th className="text-left p-3 font-medium">태스크명</th>
                <th className="text-center p-3 font-medium">상태</th>
                <th className="text-center p-3 font-medium">진척률</th>
                <th className="text-left p-3 font-medium">담당자</th>
                <th className="text-left p-3 font-medium">기간</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tasks.map((t: TaskItem) => (
                <tr key={String(t.id)} className="hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs" style={{ paddingLeft: `${(t.depth * 16) + 12}px` }}>
                    {t.taskCode}
                  </td>
                  <td className="p-3">{t.taskName}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[t.statusCode] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[t.statusCode] || t.statusCode}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${t.progressRate}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{t.progressRate}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{t.assignee?.displayName || t.assignee?.userName || '-'}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {t.plannedStartAt ? new Date(t.plannedStartAt).toLocaleDateString('ko-KR') : ''}
                    {t.plannedStartAt && t.plannedEndAt ? ' ~ ' : ''}
                    {t.plannedEndAt ? new Date(t.plannedEndAt).toLocaleDateString('ko-KR') : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
