'use client';

import { useState } from 'react';
import { ListTodo, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useProjectTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from '@/hooks/queries/useProjects';
import type { TaskItem, CreateTaskRequest } from '@/lib/api/endpoints/projects';

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-50 text-blue-700',
  completed: 'bg-green-50 text-green-700',
  on_hold: 'bg-yellow-50 text-yellow-700',
  cancelled: 'bg-red-50 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  not_started: '미착수',
  in_progress: '진행중',
  completed: '완료',
  on_hold: '보류',
  cancelled: '취소',
};

const TASK_TYPE_OPTIONS = [
  { value: 'analysis', label: '분석' },
  { value: 'design', label: '설계' },
  { value: 'development', label: '개발' },
  { value: 'test', label: '테스트' },
  { value: 'deployment', label: '배포' },
  { value: 'review', label: '리뷰' },
  { value: 'management', label: '관리' },
  { value: 'meeting', label: '회의' },
  { value: 'documentation', label: '문서화' },
];

const PRIORITY_OPTIONS = [
  { value: 'critical', label: '긴급' },
  { value: 'high', label: '높음' },
  { value: 'normal', label: '보통' },
  { value: 'low', label: '낮음' },
];

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

const INITIAL_FORM = {
  taskCode: '',
  taskName: '',
  taskTypeCode: 'development',
  statusCode: 'not_started',
  priorityCode: 'normal',
  progressRate: 0,
  plannedStartAt: '',
  plannedEndAt: '',
};

interface Props {
  projectId: number;
}

export function TasksTab({ projectId }: Props) {
  const { data, isLoading } = useProjectTasks(projectId);
  const tasks = data?.data ?? [];

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const handleOpenDialog = () => {
    setForm(INITIAL_FORM);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    if (!form.taskCode.trim() || !form.taskName.trim()) return;

    const payload: CreateTaskRequest = {
      taskCode: form.taskCode,
      taskName: form.taskName,
      taskTypeCode: form.taskTypeCode,
      priorityCode: form.priorityCode,
      ...(form.plannedStartAt ? { plannedStartAt: new Date(form.plannedStartAt).toISOString() } : {}),
      ...(form.plannedEndAt ? { plannedEndAt: new Date(form.plannedEndAt).toISOString() } : {}),
    };

    createTask.mutate({ projectId, data: payload }, {
      onSuccess: () => setDialogOpen(false),
    });
  };

  const handleStatusChange = (task: TaskItem, statusCode: string) => {
    updateTask.mutate({
      projectId,
      taskId: String(task.id),
      data: { statusCode },
    });
  };

  const handleProgressChange = (task: TaskItem, progressRate: number) => {
    updateTask.mutate({
      projectId,
      taskId: String(task.id),
      data: { progressRate },
    });
  };

  const handleDelete = (task: TaskItem) => {
    deleteTask.mutate({ projectId, taskId: String(task.id) });
  };

  if (isLoading) return <div className="p-4 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ListTodo className="h-4 w-4" />
          태스크 ({tasks.length})
        </h3>
        <Button size="sm" onClick={handleOpenDialog}>
          <Plus className="h-4 w-4" />
          태스크 추가
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          아직 등록된 태스크가 없습니다.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">WBS</th>
                <th className="text-left p-3 font-medium">태스크명</th>
                <th className="text-center p-3 font-medium">상태</th>
                <th className="text-center p-3 font-medium">진척률</th>
                <th className="text-left p-3 font-medium">담당자</th>
                <th className="text-left p-3 font-medium">기간</th>
                <th className="text-center p-3 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tasks.map((t: TaskItem) => (
                <tr key={String(t.id)} className="hover:bg-muted/30 group">
                  <td className="p-3 font-mono text-xs" style={{ paddingLeft: `${(t.depth * 16) + 12}px` }}>
                    {t.taskCode}
                  </td>
                  <td className="p-3">{t.taskName}</td>
                  <td className="p-3 text-center">
                    <Select
                      value={t.statusCode}
                      onValueChange={(v) => handleStatusChange(t, v)}
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
                  <td className="p-3 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${t.progressRate}%` }} />
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={t.progressRate}
                        onChange={(e) => {
                          const val = Math.min(100, Math.max(0, Number(e.target.value)));
                          handleProgressChange(t, val);
                        }}
                        className="h-7 w-14 text-xs text-center px-1"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{t.assignee?.displayName || t.assignee?.userName || '-'}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {t.plannedStartAt ? new Date(t.plannedStartAt).toLocaleDateString('ko-KR') : ''}
                    {t.plannedStartAt && t.plannedEndAt ? ' ~ ' : ''}
                    {t.plannedEndAt ? new Date(t.plannedEndAt).toLocaleDateString('ko-KR') : ''}
                  </td>
                  <td className="p-3 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(t)}
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

      {/* 태스크 추가 다이얼로그 */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/80" onClick={() => setDialogOpen(false)} />
          <div className="relative z-50 w-full max-w-lg rounded-lg border bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">태스크 추가</h4>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDialogOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">WBS 코드 *</label>
                  <Input
                    placeholder="예: 1.1.1"
                    value={form.taskCode}
                    onChange={(e) => setForm((p) => ({ ...p, taskCode: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">태스크명 *</label>
                  <Input
                    placeholder="태스크명 입력"
                    value={form.taskName}
                    onChange={(e) => setForm((p) => ({ ...p, taskName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">유형</label>
                  <Select value={form.taskTypeCode} onValueChange={(v) => setForm((p) => ({ ...p, taskTypeCode: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TASK_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  <label className="text-sm font-medium">우선순위</label>
                  <Select value={form.priorityCode} onValueChange={(v) => setForm((p) => ({ ...p, priorityCode: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">진척률</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.progressRate}
                    onChange={(e) => setForm((p) => ({ ...p, progressRate: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">시작일</label>
                  <Input
                    type="date"
                    value={form.plannedStartAt}
                    onChange={(e) => setForm((p) => ({ ...p, plannedStartAt: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">종료일</label>
                  <Input
                    type="date"
                    value={form.plannedEndAt}
                    onChange={(e) => setForm((p) => ({ ...p, plannedEndAt: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
              <Button
                onClick={handleCreate}
                disabled={!form.taskCode.trim() || !form.taskName.trim() || createTask.isPending}
              >
                {createTask.isPending ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
