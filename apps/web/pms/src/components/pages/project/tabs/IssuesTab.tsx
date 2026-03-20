'use client';

import { AlertCircle } from 'lucide-react';
import { useProjectIssues } from '@/hooks/queries/useProjects';
import type { IssueItem } from '@/lib/api/endpoints/projects';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-50 text-red-700',
  in_progress: 'bg-blue-50 text-blue-700',
  resolved: 'bg-green-50 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
  deferred: 'bg-yellow-50 text-yellow-700',
};

const STATUS_LABELS: Record<string, string> = {
  open: '등록',
  in_progress: '처리중',
  resolved: '해결',
  closed: '종료',
  deferred: '보류',
};

const TYPE_LABELS: Record<string, string> = {
  bug: '버그',
  requirement_change: '요구변경',
  risk: '위험',
  impediment: '장애',
  inquiry: '문의',
  improvement: '개선',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-red-600 font-semibold',
  high: 'text-orange-600',
  normal: 'text-gray-600',
  low: 'text-gray-400',
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: '긴급',
  high: '높음',
  normal: '보통',
  low: '낮음',
};

interface Props {
  projectId: number;
}

export function IssuesTab({ projectId }: Props) {
  const { data, isLoading } = useProjectIssues(projectId);
  const issues = data?.data ?? [];

  if (isLoading) return <div className="p-4 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          이슈 ({issues.length})
        </h3>
      </div>

      {issues.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          아직 등록된 이슈가 없습니다.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">코드</th>
                <th className="text-left p-3 font-medium">제목</th>
                <th className="text-center p-3 font-medium">유형</th>
                <th className="text-center p-3 font-medium">상태</th>
                <th className="text-center p-3 font-medium">우선순위</th>
                <th className="text-left p-3 font-medium">담당자</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {issues.map((i: IssueItem) => (
                <tr key={String(i.id)} className="hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{i.issueCode}</td>
                  <td className="p-3">{i.issueTitle}</td>
                  <td className="p-3 text-center text-xs">{TYPE_LABELS[i.issueTypeCode] || i.issueTypeCode}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[i.statusCode] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[i.statusCode] || i.statusCode}
                    </span>
                  </td>
                  <td className={`p-3 text-center text-xs ${PRIORITY_COLORS[i.priorityCode] || ''}`}>
                    {PRIORITY_LABELS[i.priorityCode] || i.priorityCode}
                  </td>
                  <td className="p-3 text-muted-foreground">{i.assignee?.displayName || i.assignee?.userName || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
