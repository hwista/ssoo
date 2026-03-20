'use client';

import { useState } from 'react';
import { ClipboardCheck, Plus, Trash2, CheckCircle2, Circle, FileOutput } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  useProjectCloseConditions,
  useUpsertCloseCondition,
  useToggleCloseCondition,
  useDeleteCloseCondition,
} from '@/hooks/queries/useProjects';
import type { CloseConditionItem } from '@/lib/api/endpoints/projects';

const INITIAL_FORM = {
  conditionCode: '',
  requiresDeliverable: false,
  sortOrder: 0,
  memo: '',
};

interface Props {
  projectId: number;
  statusCode: string;
}

export function CloseConditionsTab({ projectId, statusCode }: Props) {
  const { data, isLoading } = useProjectCloseConditions(projectId, statusCode);
  const conditions = data?.data ?? [];

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const upsertCondition = useUpsertCloseCondition();
  const toggleCondition = useToggleCloseCondition();
  const deleteCondition = useDeleteCloseCondition();

  const handleCreate = async () => {
    await upsertCondition.mutateAsync({
      projectId,
      data: {
        statusCode,
        conditionCode: formData.conditionCode,
        requiresDeliverable: formData.requiresDeliverable,
        sortOrder: formData.sortOrder || undefined,
        memo: formData.memo || undefined,
      },
    });
    setShowAddDialog(false);
    setFormData(INITIAL_FORM);
  };

  const handleToggle = async (item: CloseConditionItem) => {
    await toggleCondition.mutateAsync({
      projectId,
      statusCode: item.statusCode,
      conditionCode: item.conditionCode,
      data: { isChecked: !item.isChecked },
    });
  };

  const handleDelete = async (item: CloseConditionItem) => {
    await deleteCondition.mutateAsync({
      projectId,
      statusCode: item.statusCode,
      conditionCode: item.conditionCode,
    });
  };

  const checkedCount = conditions.filter((c: CloseConditionItem) => c.isChecked).length;

  if (isLoading) return <div className="p-4 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" />
          종료조건 ({checkedCount}/{conditions.length})
        </h3>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4" />
          종료조건 추가
        </Button>
      </div>

      {conditions.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          아직 등록된 종료조건이 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {conditions.map((c: CloseConditionItem) => (
            <div
              key={`${c.statusCode}-${c.conditionCode}`}
              className={`flex items-start gap-3 p-3 border rounded-lg transition-colors ${
                c.isChecked ? 'bg-green-50/50 border-green-200' : 'bg-white hover:bg-muted/30'
              }`}
            >
              <button
                className="mt-0.5 shrink-0"
                onClick={() => handleToggle(c)}
                disabled={toggleCondition.isPending}
              >
                {c.isChecked ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${c.isChecked ? 'line-through text-muted-foreground' : ''}`}>
                    {c.conditionCode}
                  </span>
                  {c.requiresDeliverable && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                      <FileOutput className="h-3 w-3" />
                      산출물 필요
                    </span>
                  )}
                </div>
                {c.memo && (
                  <p className="text-xs text-muted-foreground mt-1">{c.memo}</p>
                )}
                {c.checkedAt && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    완료: {new Date(c.checkedAt).toLocaleDateString('ko-KR')}
                  </p>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                disabled={deleteCondition.isPending}
                onClick={() => handleDelete(c)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>종료조건 추가</DialogTitle>
            <DialogDescription>프로젝트에 새 종료조건을 등록합니다.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">조건 코드</label>
              <Input
                placeholder="예: CC-001"
                value={formData.conditionCode}
                onChange={(e) => setFormData({ ...formData, conditionCode: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="requiresDeliverable"
                checked={formData.requiresDeliverable}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, requiresDeliverable: checked === true })
                }
              />
              <label htmlFor="requiresDeliverable" className="text-sm font-medium cursor-pointer">
                산출물 제출 필요
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">정렬 순서</label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">메모 (선택)</label>
              <Textarea
                placeholder="종료조건에 대한 메모"
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
              disabled={!formData.conditionCode.trim() || upsertCondition.isPending}
            >
              {upsertCondition.isPending ? '등록 중...' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
