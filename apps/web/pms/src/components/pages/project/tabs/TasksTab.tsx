'use client';

import { useState } from 'react';
import { ListTodo, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  useProjectAccess,
  useProjectWbs,
  useProjectTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from '@/hooks/queries/useProjects';
import type { TaskItem, CreateTaskRequest } from '@/lib/api/endpoints/projects';
import { WbsPanel } from './planning/WbsPanel';

const NO_WBS_VALUE = '__none__';

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

interface TaskFormState {
  wbsId: string;
  taskCode: string;
  taskName: string;
  taskTypeCode: string;
  statusCode: string;
  priorityCode: string;
  progressRate: number;
  plannedStartAt: string;
  plannedEndAt: string;
}

const INITIAL_FORM: TaskFormState = {
  wbsId: NO_WBS_VALUE,
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
  const { data: accessResponse } = useProjectAccess(projectId);
  const { data: wbsResponse } = useProjectWbs(projectId);
  const { data, isLoading } = useProjectTasks(projectId);
  const tasks = data?.data ?? [];
  const wbsItems = wbsResponse?.data ?? [];
  const canManageTasks = accessResponse?.data?.features.canManageTasks ?? false;

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const handleOpenDialog = () => {
    setFormData(INITIAL_FORM);
    setShowAddDialog(true);
  };

  const handleCreate = async () => {
    if (!formData.taskCode.trim() || !formData.taskName.trim()) return;

    const payload: CreateTaskRequest = {
      ...(formData.wbsId !== NO_WBS_VALUE ? { wbsId: formData.wbsId } : {}),
      taskCode: formData.taskCode,
      taskName: formData.taskName,
      taskTypeCode: formData.taskTypeCode,
      priorityCode: formData.priorityCode,
      ...(formData.plannedStartAt ? { plannedStartAt: new Date(formData.plannedStartAt).toISOString() } : {}),
      ...(formData.plannedEndAt ? { plannedEndAt: new Date(formData.plannedEndAt).toISOString() } : {}),
    };

    await createTask.mutateAsync({ projectId, data: payload });
    setShowAddDialog(false);
    setFormData(INITIAL_FORM);
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

  const handleWbsChange = (task: TaskItem, wbsId: string) => {
    updateTask.mutate({
      projectId,
      taskId: String(task.id),
      data: { wbsId: wbsId === NO_WBS_VALUE ? null : wbsId },
    });
  };

  const handleDelete = (task: TaskItem) => {
    deleteTask.mutate({ projectId, taskId: String(task.id) });
  };

  if (isLoading) return <div className="p-4 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-4">
      <WbsPanel projectId={projectId} canManageWbs={canManageTasks} />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ListTodo className="h-4 w-4" />
          태스크 ({tasks.length})
        </h3>
        {canManageTasks && (
          <Button size="sm" onClick={handleOpenDialog}>
            <Plus className="h-4 w-4" />
            태스크 추가
          </Button>
        )}
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
                <th className="text-left p-3 font-medium">계획 구조</th>
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
                  <td className="p-3">
                    <Select
                      value={t.wbsId ? String(t.wbsId) : NO_WBS_VALUE}
                      onValueChange={(value) => handleWbsChange(t, value)}
                      disabled={!canManageTasks}
                    >
                      <SelectTrigger className="h-7 min-w-44 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_WBS_VALUE}>미지정</SelectItem>
                        {wbsItems.map((wbs) => (
                          <SelectItem key={String(wbs.id)} value={String(wbs.id)}>
                            {wbs.wbsCode} · {wbs.wbsName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 font-mono text-xs" style={{ paddingLeft: `${(t.depth * 16) + 12}px` }}>
                    {t.taskCode}
                  </td>
                  <td className="p-3">{t.taskName}</td>
                  <td className="p-3 text-center">
                    <Select
                      value={t.statusCode}
                      onValueChange={(v) => handleStatusChange(t, v)}
                      disabled={!canManageTasks}
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
                        disabled={!canManageTasks}
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
                    {canManageTasks && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(t)}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>태스크 추가</DialogTitle>
            <DialogDescription>프로젝트에 새 태스크를 추가합니다.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">WBS 연결</label>
                <Select value={formData.wbsId} onValueChange={(value) => setFormData({ ...formData, wbsId: value })}>
                  <SelectTrigger><SelectValue placeholder="미지정" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_WBS_VALUE}>미지정</SelectItem>
                    {wbsItems.map((wbs) => (
                      <SelectItem key={String(wbs.id)} value={String(wbs.id)}>
                        {wbs.wbsCode} · {wbs.wbsName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">WBS 코드 *</label>
                <Input
                  placeholder="예: 1.1.1"
                  value={formData.taskCode}
                  onChange={(e) => setFormData({ ...formData, taskCode: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">태스크명 *</label>
                <Input
                  placeholder="태스크명 입력"
                  value={formData.taskName}
                  onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">유형</label>
                <Select value={formData.taskTypeCode} onValueChange={(v) => setFormData({ ...formData, taskTypeCode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
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
                <label className="text-sm font-medium">우선순위</label>
                <Select value={formData.priorityCode} onValueChange={(v) => setFormData({ ...formData, priorityCode: v })}>
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
              <div className="space-y-2">
                <label className="text-sm font-medium">진척률</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.progressRate}
                  onChange={(e) => setFormData({ ...formData, progressRate: Math.min(100, Math.max(0, Number(e.target.value))) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">시작일</label>
                <Input
                  type="date"
                  value={formData.plannedStartAt}
                  onChange={(e) => setFormData({ ...formData, plannedStartAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">종료일</label>
                <Input
                  type="date"
                  value={formData.plannedEndAt}
                  onChange={(e) => setFormData({ ...formData, plannedEndAt: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>취소</Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.taskCode.trim() || !formData.taskName.trim() || createTask.isPending || !canManageTasks}
            >
              {createTask.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
