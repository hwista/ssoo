'use client';

import { useState } from 'react';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import {
  useProjectIssues,
  useCreateIssue,
  useUpdateIssue,
  useDeleteIssue,
} from '@/hooks/queries/useProjects';
import type { IssueItem } from '@/lib/api/endpoints/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

const INITIAL_FORM = {
  issueCode: '',
  issueTitle: '',
  issueTypeCode: 'bug',
  priorityCode: 'normal',
  statusCode: 'open',
  description: '',
};

interface Props {
  projectId: number;
}

export function IssuesTab({ projectId }: Props) {
  const { data, isLoading } = useProjectIssues(projectId);
  const issues = data?.data ?? [];

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const createIssue = useCreateIssue();
  const updateIssue = useUpdateIssue();
  const deleteIssue = useDeleteIssue();

  const handleCreate = async () => {
    await createIssue.mutateAsync({
      projectId,
      data: {
        issueCode: formData.issueCode,
        issueTitle: formData.issueTitle,
        issueTypeCode: formData.issueTypeCode,
        priorityCode: formData.priorityCode,
        description: formData.description || undefined,
      },
    });
    setShowAddDialog(false);
    setFormData(INITIAL_FORM);
  };

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

  if (isLoading) return <div className="p-4 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          이슈 ({issues.length})
        </h3>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4" />
          이슈 등록
        </Button>
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
                <th className="text-center p-3 font-medium w-16">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {issues.map((i: IssueItem) => (
                <tr key={String(i.id)} className="hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{i.issueCode}</td>
                  <td className="p-3">{i.issueTitle}</td>
                  <td className="p-3 text-center text-xs">{TYPE_LABELS[i.issueTypeCode] || i.issueTypeCode}</td>
                  <td className="p-3 text-center">
                    <Select
                      value={i.statusCode}
                      onValueChange={(value) => handleStatusChange(i, value)}
                    >
                      <SelectTrigger className="h-7 w-24 text-xs mx-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([code, label]) => (
                          <SelectItem key={code} value={code}>
                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${STATUS_COLORS[code] || ''}`}>
                              {label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className={`p-3 text-center text-xs ${PRIORITY_COLORS[i.priorityCode] || ''}`}>
                    {PRIORITY_LABELS[i.priorityCode] || i.priorityCode}
                  </td>
                  <td className="p-3 text-muted-foreground">{i.assignee?.displayName || i.assignee?.userName || '-'}</td>
                  <td className="p-3 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={deleteIssue.isPending}
                      onClick={() => handleDelete(String(i.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이슈 등록</DialogTitle>
            <DialogDescription>프로젝트에 새 이슈를 등록합니다.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">이슈 코드</label>
              <Input
                placeholder="예: ISS-001"
                value={formData.issueCode}
                onChange={(e) => setFormData({ ...formData, issueCode: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">제목</label>
              <Input
                placeholder="이슈 제목을 입력하세요"
                value={formData.issueTitle}
                onChange={(e) => setFormData({ ...formData, issueTitle: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">유형</label>
                <Select
                  value={formData.issueTypeCode}
                  onValueChange={(value) => setFormData({ ...formData, issueTypeCode: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([code, label]) => (
                      <SelectItem key={code} value={code}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">우선순위</label>
                <Select
                  value={formData.priorityCode}
                  onValueChange={(value) => setFormData({ ...formData, priorityCode: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([code, label]) => (
                      <SelectItem key={code} value={code}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">설명 (선택)</label>
              <Textarea
                placeholder="이슈 상세 설명"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              취소
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.issueCode.trim() || !formData.issueTitle.trim() || createIssue.isPending}
            >
              {createIssue.isPending ? '등록 중...' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
