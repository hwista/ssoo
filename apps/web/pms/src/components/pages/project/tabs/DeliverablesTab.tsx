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
  useProjectAccess,
  useProjectDeliverables,
  useProjectEvents,
  useUpsertDeliverable,
  useUpdateDeliverableSubmission,
  useDeleteDeliverable,
} from '@/hooks/queries/useProjects';
import type { DeliverableItem } from '@/lib/api/endpoints/projects';
import { EventRollupSummary } from './EventRollupSummary';

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
  eventId: 'none',
  memo: '',
};

interface Props {
  projectId: number;
  statusCode: string;
}

export function DeliverablesTab({ projectId, statusCode }: Props) {
  const { data: accessResponse } = useProjectAccess(projectId);
  const { data, isLoading } = useProjectDeliverables(projectId, statusCode);
  const { data: eventResponse } = useProjectEvents(projectId);
  const deliverables = data?.data ?? [];
  const events = eventResponse?.data ?? [];
  const eventLookup = new Map(events.map((event) => [String(event.eventId), event] as const));
  const canManageDeliverables = accessResponse?.data?.features.canManageDeliverables ?? false;

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
          eventId: formData.eventId !== 'none' ? formData.eventId : undefined,
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <FileOutput className="h-4 w-4" />
            산출물 ({deliverables.length})
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            연결 이벤트를 선택하면 해당 이벤트의 진행 요약이 함께 표시됩니다.
          </p>
        </div>
        {canManageDeliverables && (
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4" />
            산출물 추가
          </Button>
        )}
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
                <th className="text-left p-3 font-medium">연결 이벤트 / 요약</th>
                <th className="text-center p-3 font-medium">제출상태</th>
                <th className="text-left p-3 font-medium">제출일</th>
                <th className="text-left p-3 font-medium">파일명</th>
                <th className="text-left p-3 font-medium">메모</th>
                <th className="text-center p-3 font-medium w-16">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {deliverables.map((d: DeliverableItem) => {
                const linkedEvent = d.eventId ? eventLookup.get(String(d.eventId)) : undefined;

                return (
                  <tr key={`${d.statusCode}-${d.deliverableCode}`} className="hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{d.deliverableCode}</td>
                    <td className="p-3">{d.deliverable?.deliverableName ?? d.deliverableName ?? '-'}</td>
                    <td className="p-3">
                      <Select
                        value={d.eventId ? String(d.eventId) : 'none'}
                        onValueChange={(value) =>
                          upsertDeliverable.mutate({
                            projectId,
                            data: {
                              statusCode: d.statusCode,
                              deliverableCode: d.deliverableCode,
                              submissionStatusCode: d.submissionStatusCode,
                              eventId: value !== 'none' ? value : undefined,
                              memo: d.memo ?? undefined,
                            },
                          })
                        }
                        disabled={!canManageDeliverables || upsertDeliverable.isPending}
                      >
                        <SelectTrigger className="h-7 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">미연결</SelectItem>
                          {events.map((event) => (
                            <SelectItem key={String(event.eventId)} value={String(event.eventId)}>
                              {event.eventName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <EventRollupSummary rollup={linkedEvent?.rollup} className="mt-1" />
                    </td>
                    <td className="p-3 text-center">
                      <Select
                        value={d.submissionStatusCode}
                        onValueChange={(value) => handleStatusChange(d, value)}
                        disabled={!canManageDeliverables}
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
                      {canManageDeliverables ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          disabled={deleteDeliverable.isPending}
                          onClick={() => handleDelete(d)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
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
              <label className="text-sm font-medium">연결 이벤트</label>
              <Select
                value={formData.eventId}
                onValueChange={(value) => setFormData({ ...formData, eventId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">미연결</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={String(event.eventId)} value={String(event.eventId)}>
                      {event.eventName}
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
              disabled={!formData.deliverableCode.trim() || upsertDeliverable.isPending || !canManageDeliverables}
            >
              {upsertDeliverable.isPending ? '등록 중...' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
