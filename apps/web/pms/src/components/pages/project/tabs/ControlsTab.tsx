'use client';

import { AlertCircle, Trash2 } from 'lucide-react';
import {
  useProjectAccess,
  useProjectIssues,
  useUpdateIssue,
  useDeleteIssue,
} from '@/hooks/queries/useProjects';
import type { IssueItem } from '@/lib/api/endpoints/projects';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ControlDomainPanels } from './control/DomainPanels';

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

const CANONICAL_SURFACE_HINTS: Partial<Record<string, string>> = {
  bug: '정식: 이슈',
  impediment: '정식: 이슈',
  inquiry: '정식: 이슈',
  improvement: '정식: 이슈',
  risk: '정식: 리스크',
  requirement_change: '정식: 변경요청',
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

export function ControlsTab({ projectId }: Props) {
  const { data: accessResponse } = useProjectAccess(projectId);
  const { data, isLoading } = useProjectIssues(projectId);
  const issues = data?.data ?? [];
  const canManageIssues = accessResponse?.data?.features.canManageIssues ?? false;

  const updateIssue = useUpdateIssue();
  const deleteIssue = useDeleteIssue();

  const handleStatusChange = async (issue: IssueItem, newStatus: string) => {
    await updateIssue.mutateAsync({
      projectId,
      issueId: String(issue.id),
      data: { statusCode: newStatus },
    });
  };

  const handleDelete = async (issueId: string) => {
    await deleteIssue.mutateAsync({ projectId, issueId });
  };

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">로딩 중...</div>;
  }

  return (
    <div className="space-y-4">
      <ControlDomainPanels projectId={projectId} canManage={canManageIssues} />

      <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
        새 항목은 상단 <span className="font-medium text-foreground">정식 컨트롤 패널</span>
        에서 등록합니다. <span className="font-medium text-foreground">버그 / 장애 / 문의 / 개선</span>
        은 이슈, <span className="font-medium text-foreground">리스크</span> 는 리스크,{' '}
        <span className="font-medium text-foreground">요구변경</span> 은 변경요청 패널이 기본
        경로입니다. 아래 <code>Issue</code> 목록은 기존 데이터 확인 / 정리용입니다.
      </div>

      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <AlertCircle className="h-4 w-4" />
          기존 Issue 이력 / 호환성 인박스 ({issues.length})
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          이 영역은 남아 있는 기존 <code>Issue</code> 행만 확인·정리합니다.
        </p>
      </div>

      {issues.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          정리할 기존 <code>Issue</code> 행이 없습니다.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-left font-medium">코드</th>
                <th className="p-3 text-left font-medium">제목</th>
                <th className="p-3 text-center font-medium">유형</th>
                <th className="p-3 text-center font-medium">상태</th>
                <th className="p-3 text-center font-medium">우선순위</th>
                <th className="p-3 text-left font-medium">기존 담당자</th>
                <th className="w-16 p-3 text-center font-medium">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {issues.map((issue) => (
                <tr key={String(issue.id)} className="hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{issue.issueCode}</td>
                  <td className="p-3">{issue.issueTitle}</td>
                  <td className="p-3 text-center text-xs">
                    <div className="flex flex-col items-center gap-1">
                      <span>{TYPE_LABELS[issue.issueTypeCode] || issue.issueTypeCode}</span>
                      {CANONICAL_SURFACE_HINTS[issue.issueTypeCode] ? (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                            {CANONICAL_SURFACE_HINTS[issue.issueTypeCode]}
                          </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <Select
                      value={issue.statusCode}
                      onValueChange={(value) => handleStatusChange(issue, value)}
                      disabled={!canManageIssues}
                    >
                      <SelectTrigger className="mx-auto h-7 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([code, label]) => (
                          <SelectItem key={code} value={code}>
                            <span
                              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${STATUS_COLORS[code] || ''}`}
                            >
                              {label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className={`p-3 text-center text-xs ${PRIORITY_COLORS[issue.priorityCode] || ''}`}>
                    {PRIORITY_LABELS[issue.priorityCode] || issue.priorityCode}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {issue.assignee?.displayName || issue.assignee?.userName || '-'}
                  </td>
                  <td className="p-3 text-center">
                    {canManageIssues ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={deleteIssue.isPending}
                        onClick={() => handleDelete(String(issue.id))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
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
