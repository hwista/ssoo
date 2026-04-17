'use client';

import { useState } from 'react';
import { Flag, Plus, Trash2 } from 'lucide-react';
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
import {
  useProjectObjectives,
  useProjectAccess,
  useProjectMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
} from '@/hooks/queries/useProjects';
import type { MilestoneItem, CreateMilestoneRequest } from '@/lib/api/endpoints/projects';
import { ObjectivesPanel } from './planning/ObjectivesPanel';

const NO_OBJECTIVE_VALUE = '__none__';

const STATUS_LABELS: Record<string, string> = {
  not_started: '미착수',
  in_progress: '진행중',
  achieved: '달성',
  missed: '미달성',
  cancelled: '취소',
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

interface MilestoneFormState {
  objectiveId: string;
  milestoneCode: string;
  milestoneName: string;
  statusCode: string;
  dueAt: string;
  description: string;
}

const INITIAL_FORM: MilestoneFormState = {
  objectiveId: NO_OBJECTIVE_VALUE,
  milestoneCode: '',
  milestoneName: '',
  statusCode: 'not_started',
  dueAt: '',
  description: '',
};

interface Props {
  projectId: number;
}

export function MilestonesTab({ projectId }: Props) {
  const { data: accessResponse } = useProjectAccess(projectId);
  const { data: objectiveResponse } = useProjectObjectives(projectId);
  const { data, isLoading } = useProjectMilestones(projectId);
  const milestones = data?.data ?? [];
  const objectives = objectiveResponse?.data ?? [];
  const canManageMilestones = accessResponse?.data?.features.canManageMilestones ?? false;

  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const handleOpenDialog = () => {
    setFormData(INITIAL_FORM);
    setShowAddDialog(true);
  };

  const handleCreate = async () => {
    if (!formData.milestoneCode.trim() || !formData.milestoneName.trim()) return;

    const payload: CreateMilestoneRequest = {
      milestoneCode: formData.milestoneCode,
      milestoneName: formData.milestoneName,
      ...(formData.objectiveId !== NO_OBJECTIVE_VALUE ? { objectiveId: formData.objectiveId } : {}),
      ...(formData.description ? { description: formData.description } : {}),
      ...(formData.dueAt ? { dueAt: new Date(formData.dueAt).toISOString() } : {}),
    };

    await createMilestone.mutateAsync({ projectId, data: payload });
    setShowAddDialog(false);
    setFormData(INITIAL_FORM);
  };

  const handleStatusChange = (milestone: MilestoneItem, statusCode: string) => {
    updateMilestone.mutate({
      projectId,
      milestoneId: String(milestone.id),
      data: { statusCode },
    });
  };

  const handleObjectiveChange = (milestone: MilestoneItem, objectiveId: string) => {
    updateMilestone.mutate({
      projectId,
      milestoneId: String(milestone.id),
      data: { objectiveId: objectiveId === NO_OBJECTIVE_VALUE ? null : objectiveId },
    });
  };

  const handleDelete = (milestone: MilestoneItem) => {
    deleteMilestone.mutate({ projectId, milestoneId: String(milestone.id) });
  };

  if (isLoading) return <div className="p-4 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-4">
      <ObjectivesPanel projectId={projectId} canManageObjectives={canManageMilestones} />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Flag className="h-4 w-4" />
          마일스톤 ({milestones.length})
        </h3>
        {canManageMilestones && (
          <Button size="sm" onClick={handleOpenDialog}>
            <Plus className="h-4 w-4" />
            마일스톤 추가
          </Button>
        )}
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
                <th className="text-left p-3 font-medium">목표</th>
                <th className="text-center p-3 font-medium">상태</th>
                <th className="text-left p-3 font-medium">기한</th>
                <th className="text-left p-3 font-medium">달성일</th>
                <th className="text-center p-3 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {milestones.map((m: MilestoneItem) => (
                <tr key={String(m.id)} className="hover:bg-muted/30 group">
                  <td className="p-3 font-mono text-xs">{m.milestoneCode}</td>
                  <td className="p-3">{m.milestoneName}</td>
                  <td className="p-3">
                    <Select
                      value={m.objectiveId ? String(m.objectiveId) : NO_OBJECTIVE_VALUE}
                      onValueChange={(value) => handleObjectiveChange(m, value)}
                      disabled={!canManageMilestones}
                    >
                      <SelectTrigger className="h-7 min-w-44 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_OBJECTIVE_VALUE}>미지정</SelectItem>
                        {objectives.map((objective) => (
                          <SelectItem key={String(objective.id)} value={String(objective.id)}>
                            {objective.objectiveCode} · {objective.objectiveName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-center">
                    <Select
                      value={m.statusCode}
                      onValueChange={(v) => handleStatusChange(m, v)}
                      disabled={!canManageMilestones}
                    >
                      <SelectTrigger className="h-7 w-24 text-xs mx-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {m.dueAt ? new Date(m.dueAt).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {m.achievedAt ? new Date(m.achievedAt).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="p-3 text-center">
                    {canManageMilestones && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(m)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
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
            <DialogTitle>마일스톤 추가</DialogTitle>
            <DialogDescription>프로젝트에 새 마일스톤을 추가합니다.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">코드 *</label>
                <Input
                  placeholder="예: MS-001"
                  value={formData.milestoneCode}
                  onChange={(e) => setFormData({ ...formData, milestoneCode: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">마일스톤명 *</label>
                <Input
                  placeholder="마일스톤명 입력"
                  value={formData.milestoneName}
                  onChange={(e) => setFormData({ ...formData, milestoneName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">목표</label>
                <Select
                  value={formData.objectiveId}
                  onValueChange={(value) => setFormData({ ...formData, objectiveId: value })}
                >
                  <SelectTrigger><SelectValue placeholder="미지정" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_OBJECTIVE_VALUE}>미지정</SelectItem>
                    {objectives.map((objective) => (
                      <SelectItem key={String(objective.id)} value={String(objective.id)}>
                        {objective.objectiveCode} · {objective.objectiveName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">상태</label>
                <Select value={formData.statusCode} onValueChange={(v) => setFormData({ ...formData, statusCode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">기한</label>
                <Input
                  type="date"
                  value={formData.dueAt}
                  onChange={(e) => setFormData({ ...formData, dueAt: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">설명</label>
              <Textarea
                placeholder="마일스톤 설명 (선택)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>취소</Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.milestoneCode.trim() || !formData.milestoneName.trim() || createMilestone.isPending || !canManageMilestones}
            >
              {createMilestone.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
