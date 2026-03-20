'use client';

import { useState } from 'react';
import { Flag, Plus, Trash2, X } from 'lucide-react';
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
  useProjectMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  useDeleteMilestone,
} from '@/hooks/queries/useProjects';
import type { MilestoneItem, CreateMilestoneRequest } from '@/lib/api/endpoints/projects';

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

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

const INITIAL_FORM = {
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
  const { data, isLoading } = useProjectMilestones(projectId);
  const milestones = data?.data ?? [];

  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();
  const deleteMilestone = useDeleteMilestone();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const handleOpenDialog = () => {
    setForm(INITIAL_FORM);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    if (!form.milestoneCode.trim() || !form.milestoneName.trim()) return;

    const payload: CreateMilestoneRequest = {
      milestoneCode: form.milestoneCode,
      milestoneName: form.milestoneName,
      ...(form.description ? { description: form.description } : {}),
      ...(form.dueAt ? { dueAt: new Date(form.dueAt).toISOString() } : {}),
    };

    createMilestone.mutate({ projectId, data: payload }, {
      onSuccess: () => setDialogOpen(false),
    });
  };

  const handleStatusChange = (milestone: MilestoneItem, statusCode: string) => {
    updateMilestone.mutate({
      projectId,
      milestoneId: String(milestone.id),
      data: { statusCode },
    });
  };

  const handleDelete = (milestone: MilestoneItem) => {
    deleteMilestone.mutate({ projectId, milestoneId: String(milestone.id) });
  };

  if (isLoading) return <div className="p-4 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Flag className="h-4 w-4" />
          마일스톤 ({milestones.length})
        </h3>
        <Button size="sm" onClick={handleOpenDialog}>
          <Plus className="h-4 w-4" />
          마일스톤 추가
        </Button>
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
                <th className="text-center p-3 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {milestones.map((m: MilestoneItem) => (
                <tr key={String(m.id)} className="hover:bg-muted/30 group">
                  <td className="p-3 font-mono text-xs">{m.milestoneCode}</td>
                  <td className="p-3">{m.milestoneName}</td>
                  <td className="p-3 text-center">
                    <Select
                      value={m.statusCode}
                      onValueChange={(v) => handleStatusChange(m, v)}
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(m)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 마일스톤 추가 다이얼로그 */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/80" onClick={() => setDialogOpen(false)} />
          <div className="relative z-50 w-full max-w-lg rounded-lg border bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">마일스톤 추가</h4>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDialogOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">코드 *</label>
                  <Input
                    placeholder="예: MS-001"
                    value={form.milestoneCode}
                    onChange={(e) => setForm((p) => ({ ...p, milestoneCode: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">마일스톤명 *</label>
                  <Input
                    placeholder="마일스톤명 입력"
                    value={form.milestoneName}
                    onChange={(e) => setForm((p) => ({ ...p, milestoneName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">상태</label>
                  <Select value={form.statusCode} onValueChange={(v) => setForm((p) => ({ ...p, statusCode: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">기한</label>
                  <Input
                    type="date"
                    value={form.dueAt}
                    onChange={(e) => setForm((p) => ({ ...p, dueAt: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">설명</label>
                <Textarea
                  placeholder="마일스톤 설명 (선택)"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
              <Button
                onClick={handleCreate}
                disabled={!form.milestoneCode.trim() || !form.milestoneName.trim() || createMilestone.isPending}
              >
                {createMilestone.isPending ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
