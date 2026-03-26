'use client';

import { useState } from 'react';
import { FileOutput, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  useProjectDeliverables,
  useUpsertDeliverable,
  useUpdateDeliverableSubmission,
  useDeleteDeliverable,
} from '@/hooks/queries/useProjects';
import type { DeliverableItem } from '@/lib/api/endpoints/projects';

const SUBMISSION_STATUS_COLORS: Record<string, string> = {
  not_submitted: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
};

const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  not_submitted: '미제출',
  submitted: '제출',
  confirmed: '확인',
  rejected: '반려',
};

const INITIAL_FORM = {
  deliverableCode: '',
  submissionStatusCode: 'not_submitted',
  memo: '',
};

interface Props {
  projectId: number;
  statusCode: string;
}

export function DeliverablesTab({ projectId, statusCode }: Props) {
  const { data, isLoading } = useProjectDeliverables(projectId, statusCode);
  const deliverables = data?.data ?? [];

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const upsertDeliverable = useUpsertDeliverable();
  const updateSubmission = useUpdateDeliverableSubmission();
  const deleteDeliverable = useDeleteDeliverable();

  const handleCreate = async () => {
    await upsertDeliverable.mutateAsync({
      projectId,
      data: {
        statusCode,
        deliverableCode: formData.deliverableCode,
        submissionStatusCode: formData.submissionStatusCode,
        memo: formData.memo || undefined,
      },
    });
    setShowAddDialog(false);
    setFormData(INITIAL_FORM);
  };

  const handleStatusChange = async (item: DeliverableItem, newStatus: string) => {
    await updateSubmission.mutateAsync({
      projectId,
      statusCode: item.statusCode,
      deliverableCode: item.deliverableCode,
      data: { submissionStatusCode: newStatus },
    });
  };

  const handleDelete = async (item: DeliverableItem) => {
    await deleteDeliverable.mutateAsync({
      projectId,
      statusCode: item.statusCode,
      deliverableCode: item.deliverableCode,
    });
  };

  if (isLoading) return <div className="p-4 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <FileOutput className="h-4 w-4" />
          산출물 ({deliverables.length})
        </h3>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4" />
          산출물 추가
        </Button>
      </div>

      {deliverables.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          아직 등록된 산출물이 없습니다.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">코드</th>
                <th className="text-left p-3 font-medium">산출물명</th>
                <th className="text-center p-3 font-medium">제출상태</th>
                <th className="text-left p-3 font-medium">제출일</th>
                <th className="text-left p-3 font-medium">파일명</th>
                <th className="text-left p-3 font-medium">메모</th>
                <th className="text-center p-3 font-medium w-16">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {deliverables.map((d: DeliverableItem) => (
                <tr key={`${d.statusCode}-${d.deliverableCode}`} className="hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{d.deliverableCode}</td>
                  <td className="p-3">{d.deliverable?.deliverableName ?? d.deliverableName ?? '-'}</td>
                  <td className="p-3 text-center">
                    <Select
                      value={d.submissionStatusCode}
                      onValueChange={(value) => handleStatusChange(d, value)}
                    >
                      <SelectTrigger className="h-7 w-24 text-xs mx-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SUBMISSION_STATUS_LABELS).map(([code, label]) => (
                          <SelectItem key={code} value={code}>
                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${SUBMISSION_STATUS_COLORS[code] || ''}`}>
                              {label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {d.submittedAt ? new Date(d.submittedAt).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs truncate max-w-[160px]">
                    {d.originalFileName ?? '-'}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs truncate max-w-[160px]">
                    {d.memo ?? '-'}
                  </td>
                  <td className="p-3 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={deleteDeliverable.isPending}
                      onClick={() => handleDelete(d)}
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
            <DialogTitle>산출물 추가</DialogTitle>
            <DialogDescription>프로젝트에 새 산출물을 등록합니다.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">산출물 코드</label>
              <Input
                placeholder="예: DLV-001"
                value={formData.deliverableCode}
                onChange={(e) => setFormData({ ...formData, deliverableCode: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">제출 상태</label>
              <Select
                value={formData.submissionStatusCode}
                onValueChange={(value) => setFormData({ ...formData, submissionStatusCode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SUBMISSION_STATUS_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">메모 (선택)</label>
              <Textarea
                placeholder="산출물에 대한 메모"
                rows={3}
                value={formData.memo}
                onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              취소
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.deliverableCode.trim() || upsertDeliverable.isPending}
            >
              {upsertDeliverable.isPending ? '등록 중...' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
