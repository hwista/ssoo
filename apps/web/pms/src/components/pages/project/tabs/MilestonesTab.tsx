'use client';

import { Flag } from 'lucide-react';
import { useProjectMilestones } from '@/hooks/queries/useProjects';
import type { MilestoneItem } from '@/lib/api/endpoints/projects';

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-50 text-blue-700',
  achieved: 'bg-green-50 text-green-700',
  missed: 'bg-red-50 text-red-700',
  cancelled: 'bg-gray-50 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  not_started: '미착수',
  in_progress: '진행중',
  achieved: '달성',
  missed: '미달성',
  cancelled: '취소',
};

interface Props {
  projectId: number;
}

export function MilestonesTab({ projectId }: Props) {
  const { data, isLoading } = useProjectMilestones(projectId);
  const milestones = data?.data ?? [];

  if (isLoading) return <div className="p-4 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Flag className="h-4 w-4" />
          마일스톤 ({milestones.length})
        </h3>
      </div>

      {milestones.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          아직 등록된 마일스톤이 없습니다.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">코드</th>
                <th className="text-left p-3 font-medium">마일스톤명</th>
                <th className="text-center p-3 font-medium">상태</th>
                <th className="text-left p-3 font-medium">기한</th>
                <th className="text-left p-3 font-medium">달성일</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {milestones.map((m: MilestoneItem) => (
                <tr key={String(m.id)} className="hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{m.milestoneCode}</td>
                  <td className="p-3">{m.milestoneName}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[m.statusCode] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[m.statusCode] || m.statusCode}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {m.dueAt ? new Date(m.dueAt).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {m.achievedAt ? new Date(m.achievedAt).toLocaleDateString('ko-KR') : '-'}
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
