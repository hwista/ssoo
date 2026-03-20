'use client';

import { Users } from 'lucide-react';
import { useProjectMembers } from '@/hooks/queries/useProjects';
import type { ProjectMember } from '@/lib/api/endpoints/projects';

const ROLE_LABELS: Record<string, string> = {
  pm: 'PM',
  pmo: 'PMO',
  am: '영업담당',
  sm: 'SM담당',
  developer: '개발자',
  consultant: '컨설턴트',
  architect: '아키텍트',
  qa: '품질관리',
  reviewer: '검수자',
  customer_rep: '고객대표',
};

interface Props {
  projectId: number;
}

export function MembersTab({ projectId }: Props) {
  const { data, isLoading } = useProjectMembers(projectId);
  const members = data?.data ?? [];

  if (isLoading) return <div className="p-4 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4" />
          프로젝트 멤버 ({members.length})
        </h3>
      </div>

      {members.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          아직 등록된 멤버가 없습니다.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">이름</th>
                <th className="text-left p-3 font-medium">역할</th>
                <th className="text-left p-3 font-medium">부서</th>
                <th className="text-center p-3 font-medium">투입률</th>
                <th className="text-left p-3 font-medium">배정일</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map((m: ProjectMember) => (
                <tr key={`${m.userId}-${m.roleCode}`} className="hover:bg-muted/30">
                  <td className="p-3">{m.user?.displayName || m.user?.userName || '-'}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {ROLE_LABELS[m.roleCode] || m.roleCode}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{m.user?.departmentCode || '-'}</td>
                  <td className="p-3 text-center">{m.allocationRate}%</td>
                  <td className="p-3 text-muted-foreground">
                    {m.assignedAt ? new Date(m.assignedAt).toLocaleDateString('ko-KR') : '-'}
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
