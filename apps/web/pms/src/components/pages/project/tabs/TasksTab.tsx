'use client';

import { usePmsSettings, useUpdatePmsSettings } from '@/hooks/queries/usePmsSettings';
import { TaskAssigneeSelect } from './TaskAssigneeSelect';
import { type ReactNode, useState } from 'react';
import { CalendarClock, Clock3, ListTodo, Plus, Trash2 } from 'lucide-react';
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
  useProjectTaskEffortLogs,
  useCreateTask,
  useCreateTaskEffortLog,
  useUpdateTask,
  useDeleteTaskEffortLog,
  useDeleteTask,
} from '@/hooks/queries/useProjects';
import type {
  CreateTaskEffortLogRequest,
  TaskEffortLogItem,
  TaskItem,
  CreateTaskRequest,
  UpdateTaskRequest,
  WbsItem,
} from '@/lib/api/endpoints/projects';
import { formatPmsDate, formatPmsNumber } from '@/lib/pms-format';
import { WbsPanel } from './planning/WbsPanel';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';

const NO_WBS_VALUE = '__none__';
const NO_TASK_VALUE = '__none_task__';

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

const WORK_TYPE_OPTIONS = [
  { value: 'execution', label: '실행' },
  { value: 'meeting', label: '회의' },
  { value: 'review', label: '검토' },
  { value: 'support', label: '지원' },
  { value: 'rework', label: '재작업' },
  { value: 'management', label: '관리' },
];

const PRIORITY_OPTIONS = [
  { value: 'critical', label: '긴급' },
  { value: 'high', label: '높음' },
  { value: 'normal', label: '보통' },
  { value: 'low', label: '낮음' },
];

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

interface TaskFormState {
  assigneeUserId: string | null;
  wbsId: string;
  taskCode: string;
  taskName: string;
  taskTypeCode: string;
  statusCode: string;
  priorityCode: string;
  progressRate: number;
  estimatedHours: string;
  plannedStartAt: string;
  plannedEndAt: string;
}

interface EffortLogFormState {
  taskId: string;
  workDate: string;
  actualHours: string;
  workTypeCode: string;
  summary: string;
}

const INITIAL_FORM: TaskFormState = {
  assigneeUserId: null,
  wbsId: NO_WBS_VALUE,
  taskCode: '',
  taskName: '',
  taskTypeCode: 'development',
  statusCode: 'not_started',
  priorityCode: 'normal',
  progressRate: 0,
  estimatedHours: '',
  plannedStartAt: '',
  plannedEndAt: '',
};

function getTodayInputDate() {
  return new Date().toISOString().slice(0, 10);
}

function createInitialEffortLogForm(task?: TaskItem): EffortLogFormState {
  return {
    taskId: task ? String(task.id) : NO_TASK_VALUE,
    workDate: getTodayInputDate(),
    actualHours: '',
    workTypeCode: 'execution',
    summary: '',
  };
}

interface TaskMetaFieldProps {
  label: string;
  children: ReactNode;
}

function formatTaskDate(value?: string | null) {
  return formatPmsDate(value, '');
}

function formatTaskPeriod(task: TaskItem) {
  const startDate = formatTaskDate(task.plannedStartAt);
  const endDate = formatTaskDate(task.plannedEndAt);
  if (startDate && endDate) return `${startDate} ~ ${endDate}`;
  return startDate || endDate || '-';
}

function toTaskHours(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue)) return null;
  return Math.round(Math.max(0, numberValue) * 10) / 10;
}

function formatTaskHours(value: number | string | null | undefined, fallback = '-') {
  const hours = toTaskHours(value);
  return hours === null ? fallback : `${formatPmsNumber(hours)}h`;
}

function formatTaskHoursVariance(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatPmsNumber(value)}h`;
}

function getWorkTypeLabel(value: string) {
  return WORK_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function getEffortLogTaskLabel(log: TaskEffortLogItem) {
  if (log.task) {
    return `${log.task.taskCode} · ${log.task.taskName}`;
  }

  return `작업 ${String(log.taskId)}`;
}

function getEffortLogUserLabel(log: TaskEffortLogItem) {
  return log.user?.displayName || log.user?.userName || '-';
}

function sumTaskHours(tasks: TaskItem[], field: 'estimatedHours' | 'actualHours') {
  const sum = tasks.reduce((total, task) => total + (toTaskHours(task[field]) ?? 0), 0);
  return Math.round(sum * 10) / 10;
}

function TaskMetaField({ label, children }: TaskMetaFieldProps) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

interface TaskWbsSelectProps {
  task: TaskItem;
  wbsItems: WbsItem[];
  canManageTasks: boolean;
  onChange: (task: TaskItem, wbsId: string) => void;
}

function TaskWbsSelect({ task, wbsItems, canManageTasks, onChange }: TaskWbsSelectProps) {
  return (
    <Select
      value={task.wbsId ? String(task.wbsId) : NO_WBS_VALUE}
      onValueChange={(value) => onChange(task, value)}
      disabled={!canManageTasks}
    >
      <SelectTrigger className="h-8 min-w-0 text-xs md:h-7 md:min-w-44">
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
  );
}

interface TaskStatusSelectProps {
  task: TaskItem;
  canManageTasks: boolean;
  onChange: (task: TaskItem, statusCode: string) => void;
}

function TaskStatusSelect({ task, canManageTasks, onChange }: TaskStatusSelectProps) {
  return (
    <Select
      value={task.statusCode}
      onValueChange={(value) => onChange(task, value)}
      disabled={!canManageTasks}
    >
      <SelectTrigger className="h-8 w-full text-xs md:mx-auto md:h-7 md:w-24">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface TaskProgressControlProps {
  task: TaskItem;
  canManageTasks: boolean;
  onChange: (task: TaskItem, progressRate: number) => void;
}

function TaskProgressControl({ task, canManageTasks, onChange }: TaskProgressControlProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-muted md:w-16">
        <div className="h-full rounded-full bg-ssoo-info" style={{ width: `${task.progressRate}%` }} />
      </div>
      <Input
        type="number"
        min={0}
        max={100}
        value={task.progressRate}
        disabled={!canManageTasks}
        onChange={(event) => {
          const value = Math.min(100, Math.max(0, Number(event.target.value)));
          onChange(task, value);
        }}
        className="h-8 w-16 px-1 text-center text-xs md:h-7 md:w-14"
      />
      <span className="text-xs text-muted-foreground">%</span>
    </div>
  );
}

interface TaskEffortControlProps {
  task: TaskItem;
  canManageTasks: boolean;
  onChange: (task: TaskItem, field: 'estimatedHours' | 'actualHours', value: number | null) => void;
}

function TaskEffortControl({ task, canManageTasks, onChange }: TaskEffortControlProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <div className="text-caption-2xs font-medium text-muted-foreground">예상</div>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            step={0.5}
            value={task.estimatedHours ?? ''}
            disabled={!canManageTasks}
            onChange={(event) => onChange(task, 'estimatedHours', toTaskHours(event.target.value))}
            className="h-8 min-w-0 px-2 text-right text-xs md:h-7"
          />
          <span className="text-xs text-muted-foreground">h</span>
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-caption-2xs font-medium text-muted-foreground">실제</div>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            step={0.5}
            value={task.actualHours ?? ''}
            disabled={!canManageTasks}
            onChange={(event) => onChange(task, 'actualHours', toTaskHours(event.target.value))}
            className="h-8 min-w-0 px-2 text-right text-xs md:h-7"
          />
          <span className="text-xs text-muted-foreground">h</span>
        </div>
      </div>
    </div>
  );
}

interface Props {
  projectId: number;
}

export function TasksTab({ projectId }: Props) {
  const { data: accessResponse } = useProjectAccess(projectId);
  const { data: wbsResponse } = useProjectWbs(projectId);
  const { data, isLoading } = useProjectTasks(projectId);
  const { data: effortLogResponse, isLoading: isEffortLogsLoading } = useProjectTaskEffortLogs(projectId);
  const tasks = data?.data ?? [];
  const settings = usePmsSettings();
  const saveSettings = useUpdatePmsSettings();
  const visibleTasks = !settings.isError && settings.data?.showCompletedTasks === false ? tasks.filter((task) => task.statusCode !== 'completed') : tasks;
  const hiddenCount = tasks.length - visibleTasks.length;
  const wbsItems = wbsResponse?.data ?? [];
  const effortLogs = effortLogResponse?.data ?? [];
  const canManageTasks = accessResponse?.data?.features.canManageTasks ?? false;

  const createTask = useCreateTask();
  const createTaskEffortLog = useCreateTaskEffortLog();
  const updateTask = useUpdateTask();
  const deleteTaskEffortLog = useDeleteTaskEffortLog();
  const deleteTask = useDeleteTask();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEffortDialog, setShowEffortDialog] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [effortFormData, setEffortFormData] = useState<EffortLogFormState>(() => (
    createInitialEffortLogForm()
  ));
  const estimatedHours = sumTaskHours(tasks, 'estimatedHours');
  const actualHours = sumTaskHours(tasks, 'actualHours');
  const effortVariance = Math.round((actualHours - estimatedHours) * 10) / 10;
  const effortCompletionRate = estimatedHours > 0 ? Math.round((actualHours / estimatedHours) * 100) : 0;
  const missingActualHoursCount = tasks.filter((task) => (
    task.statusCode !== 'cancelled' && toTaskHours(task.actualHours) === null
  )).length;
  const loggedActualHours = Math.round(effortLogs.reduce((total, log) => (
    total + (toTaskHours(log.actualHours) ?? 0)
  ), 0) * 10) / 10;
  const latestEffortWorkDate = effortLogs[0]?.workDate ?? null;

  const handleOpenDialog = () => {
    setFormData(INITIAL_FORM);
    setShowAddDialog(true);
  };

  const handleOpenEffortDialog = () => {
    const defaultTask = tasks.find((task) => task.statusCode !== 'cancelled') ?? tasks[0];
    setEffortFormData(createInitialEffortLogForm(defaultTask));
    setShowEffortDialog(true);
  };

  const handleCreate = async () => {
    if (!formData.taskCode.trim() || !formData.taskName.trim()) return;

    const payload: CreateTaskRequest = {
      ...(formData.wbsId !== NO_WBS_VALUE ? { wbsId: formData.wbsId } : {}),
      taskCode: formData.taskCode,
      taskName: formData.taskName,
      ...(formData.assigneeUserId ? { assigneeUserId: formData.assigneeUserId } : {}),
      taskTypeCode: formData.taskTypeCode,
      priorityCode: formData.priorityCode,
      ...(formData.plannedStartAt ? { plannedStartAt: new Date(formData.plannedStartAt).toISOString() } : {}),
      ...(formData.plannedEndAt ? { plannedEndAt: new Date(formData.plannedEndAt).toISOString() } : {}),
      ...(toTaskHours(formData.estimatedHours) !== null ? { estimatedHours: toTaskHours(formData.estimatedHours) ?? undefined } : {}),
    };

    try { await createTask.mutateAsync({ projectId, data: payload }); } catch { return; }
    setShowAddDialog(false);
    setFormData(INITIAL_FORM);
  };

  const handleCreateEffortLog = async () => {
    const actualHoursValue = toTaskHours(effortFormData.actualHours);
    if (effortFormData.taskId === NO_TASK_VALUE || !actualHoursValue || actualHoursValue <= 0) return;

    const selectedTask = tasks.find((task) => String(task.id) === effortFormData.taskId);
    const payload: CreateTaskEffortLogRequest = {
      taskId: effortFormData.taskId,
      ...(selectedTask?.assigneeUserId ? { userId: String(selectedTask.assigneeUserId) } : {}),
      workDate: effortFormData.workDate,
      actualHours: actualHoursValue,
      workTypeCode: effortFormData.workTypeCode,
      summary: effortFormData.summary.trim() || null,
    };

    await createTaskEffortLog.mutateAsync({ projectId, data: payload });
    setShowEffortDialog(false);
    setEffortFormData(createInitialEffortLogForm(selectedTask));
  };

  const assigneeControl = (task: TaskItem) => (
    <TaskAssigneeSelect projectId={String(projectId)} value={task.assigneeUserId ? String(task.assigneeUserId) : null}
      label={task.assignee?.displayName || task.assignee?.userName} disabled={!canManageTasks || updateTask.isPending}
      onChange={(assigneeUserId) => updateTask.mutate({ projectId, taskId: String(task.id), data: { assigneeUserId } })} />
  );

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

  const handleEffortChange = (
    task: TaskItem,
    field: 'estimatedHours' | 'actualHours',
    value: number | null,
  ) => {
    const data: UpdateTaskRequest = { [field]: value };
    updateTask.mutate({
      projectId,
      taskId: String(task.id),
      data,
    });
  };

  const handleDelete = (task: TaskItem) => {
    deleteTask.mutate({ projectId, taskId: String(task.id) });
  };

  const handleDeleteEffortLog = (log: TaskEffortLogItem) => {
    deleteTaskEffortLog.mutate({
      projectId,
      effortLogId: String(log.effortLogId),
    });
  };

  if (isLoading) return <div className="p-4 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-4">
      <WbsPanel projectId={projectId} canManageWbs={canManageTasks} />

      <section className="rounded-lg border bg-card p-4 shadow-sm" data-testid="pms-task-effort-summary">
        <div className="mb-3 flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-ssoo-info" />
          <h3 className="text-sm font-semibold">공수 요약</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <div className="text-caption-2xs font-medium text-muted-foreground">예상 공수</div>
            <div className="mt-1 text-base font-semibold">{formatTaskHours(estimatedHours, '0h')}</div>
          </div>
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <div className="text-caption-2xs font-medium text-muted-foreground">실제 공수</div>
            <div className="mt-1 text-base font-semibold">{formatTaskHours(actualHours, '0h')}</div>
          </div>
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <div className="text-caption-2xs font-medium text-muted-foreground">소진율</div>
            <div className="mt-1 text-base font-semibold">{formatPmsNumber(effortCompletionRate)}%</div>
          </div>
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <div className="text-caption-2xs font-medium text-muted-foreground">차이/미기입</div>
            <div className="mt-1 text-base font-semibold">
              {formatTaskHoursVariance(effortVariance)} · {formatPmsNumber(missingActualHoursCount)}건
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4 shadow-sm" data-testid="pms-task-effort-log-panel">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-ssoo-info" />
            <h3 className="text-sm font-semibold">일일 공수 기록</h3>
          </div>
          {canManageTasks && (
            <Button
              size="sm"
              onClick={handleOpenEffortDialog}
              disabled={tasks.length === 0}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              공수 기록 추가
            </Button>
          )}
        </div>
        <div className="mb-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <div className="text-caption-2xs font-medium text-muted-foreground">기록 공수</div>
            <div className="mt-1 text-base font-semibold">{formatTaskHours(loggedActualHours, '0h')}</div>
          </div>
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <div className="text-caption-2xs font-medium text-muted-foreground">기록 건수</div>
            <div className="mt-1 text-base font-semibold">{formatPmsNumber(effortLogs.length)}건</div>
          </div>
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <div className="text-caption-2xs font-medium text-muted-foreground">최근 작업일</div>
            <div className="mt-1 text-base font-semibold">{formatTaskDate(latestEffortWorkDate) || '-'}</div>
          </div>
        </div>
        {isEffortLogsLoading ? (
          <div className="py-4 text-sm text-muted-foreground">로딩 중...</div>
        ) : effortLogs.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">등록된 공수 기록이 없습니다.</div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {effortLogs.slice(0, 8).map((log) => (
                <div key={String(log.effortLogId)} className="rounded-lg border bg-card p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="text-xs text-muted-foreground">{formatTaskDate(log.workDate)}</div>
                      <div className="break-words text-sm font-semibold">{getEffortLogTaskLabel(log)}</div>
                      <div className="text-xs text-muted-foreground">
                        {getWorkTypeLabel(log.workTypeCode)} · {getEffortLogUserLabel(log)}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold">{formatTaskHours(log.actualHours, '0h')}</div>
                      {canManageTasks && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="mt-1 h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteEffortLog(log)}
                          disabled={deleteTaskEffortLog.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {log.summary && <div className="mt-2 text-xs text-muted-foreground">{log.summary}</div>}
                </div>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-lg border md:block">
              <Table className="w-full text-sm" data-testid="pms-task-effort-log-table">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="p-3 text-left font-medium">작업일</TableHead>
                    <TableHead className="p-3 text-left font-medium">작업</TableHead>
                    <TableHead className="p-3 text-left font-medium">유형</TableHead>
                    <TableHead className="p-3 text-left font-medium">담당</TableHead>
                    <TableHead className="p-3 text-right font-medium">공수</TableHead>
                    <TableHead className="p-3 text-left font-medium">요약</TableHead>
                    <TableHead className="w-10 p-3 text-center font-medium"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y">
                  {effortLogs.slice(0, 10).map((log) => (
                    <TableRow key={String(log.effortLogId)} className="group hover:bg-muted/30">
                      <TableCell className="p-3 text-xs text-muted-foreground">{formatTaskDate(log.workDate)}</TableCell>
                      <TableCell className="p-3">{getEffortLogTaskLabel(log)}</TableCell>
                      <TableCell className="p-3 text-muted-foreground">{getWorkTypeLabel(log.workTypeCode)}</TableCell>
                      <TableCell className="p-3 text-muted-foreground">{getEffortLogUserLabel(log)}</TableCell>
                      <TableCell className="p-3 text-right font-medium">{formatTaskHours(log.actualHours, '0h')}</TableCell>
                      <TableCell className="max-w-64 truncate p-3 text-muted-foreground">{log.summary || '-'}</TableCell>
                      <TableCell className="p-3 text-center">
                        {canManageTasks && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                            onClick={() => handleDeleteEffortLog(log)}
                            disabled={deleteTaskEffortLog.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ListTodo className="h-4 w-4" />
          태스크 ({tasks.length})
        </h3>
        {canManageTasks && (
          <Button size="sm" onClick={handleOpenDialog} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            태스크 추가
          </Button>
        )}
      </div>

      {settings.isError && <p role="alert" className="text-sm text-destructive">표시 설정을 확인하지 못해 모든 작업을 표시합니다. <Button variant="outline" size="sm" onClick={() => settings.refetch()}>다시 확인</Button></p>}
      {hiddenCount > 0 && <div className="flex flex-wrap items-center gap-2 text-sm" role="status">완료 작업 {hiddenCount}개 숨김
        <Button variant="outline" size="sm" disabled={saveSettings.isPending} onClick={() => saveSettings.mutate({ showCompletedTasks: true })}>완료 작업 표시</Button>
      </div>}
      {saveSettings.isError && <p role="alert" className="text-sm text-destructive">설정을 저장하지 못했습니다. 다시 시도해 주세요.</p>}
      {updateTask.isError && <p role="alert" className="text-sm text-destructive">작업을 저장하지 못했습니다. 담당자와 권한을 확인하고 다시 시도해 주세요.</p>}
      {tasks.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          아직 등록된 태스크가 없습니다.
        </div>
      ) : (
        <>
        <div className="space-y-3 md:hidden">
          {visibleTasks.map((task: TaskItem) => (
            <div key={String(task.id)} className="rounded-lg border bg-card p-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="text-xs font-mono text-muted-foreground">{task.taskCode}</div>
                  <div className="break-words text-sm font-semibold">{task.taskName}</div>
                </div>
                {canManageTasks && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(task)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="mt-3 grid gap-3">
                <TaskMetaField label="계획 구조">
                  <TaskWbsSelect
                    task={task}
                    wbsItems={wbsItems}
                    canManageTasks={canManageTasks}
                    onChange={handleWbsChange}
                  />
                </TaskMetaField>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TaskMetaField label="상태">
                    <TaskStatusSelect task={task} canManageTasks={canManageTasks} onChange={handleStatusChange} />
                  </TaskMetaField>
                  <TaskMetaField label="진척률">
                    <TaskProgressControl task={task} canManageTasks={canManageTasks} onChange={handleProgressChange} />
                  </TaskMetaField>
                </div>
                <TaskMetaField label="예상/실제 공수">
                  <TaskEffortControl task={task} canManageTasks={canManageTasks} onChange={handleEffortChange} />
                </TaskMetaField>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TaskMetaField label="담당자">
                    {assigneeControl(task)}
                  </TaskMetaField>
                  <TaskMetaField label="기간">
                    <span className="text-muted-foreground">{formatTaskPeriod(task)}</span>
                  </TaskMetaField>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-lg border md:block">
          <Table className="w-full text-sm">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-left p-3 font-medium">계획 구조</TableHead>
                <TableHead className="text-left p-3 font-medium">WBS</TableHead>
                <TableHead className="text-left p-3 font-medium">태스크명</TableHead>
                <TableHead className="text-center p-3 font-medium">상태</TableHead>
                <TableHead className="text-center p-3 font-medium">진척률</TableHead>
                <TableHead className="text-center p-3 font-medium">공수</TableHead>
                <TableHead className="text-left p-3 font-medium">담당자</TableHead>
                <TableHead className="text-left p-3 font-medium">기간</TableHead>
                <TableHead className="text-center p-3 font-medium w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {visibleTasks.map((t: TaskItem) => (
                <TableRow key={String(t.id)} className="hover:bg-muted/30 group">
                  <TableCell className="p-3">
                    <TaskWbsSelect
                      task={t}
                      wbsItems={wbsItems}
                      canManageTasks={canManageTasks}
                      onChange={handleWbsChange}
                    />
                  </TableCell>
                  <TableCell className="p-3 font-mono text-xs" style={{ paddingLeft: `${(t.depth * 16) + 12}px` }}>
                    {t.taskCode}
                  </TableCell>
                  <TableCell className="p-3">{t.taskName}</TableCell>
                  <TableCell className="p-3 text-center">
                    <TaskStatusSelect task={t} canManageTasks={canManageTasks} onChange={handleStatusChange} />
                  </TableCell>
                  <TableCell className="p-3 text-center">
                    <div className="flex justify-center">
                      <TaskProgressControl task={t} canManageTasks={canManageTasks} onChange={handleProgressChange} />
                    </div>
                  </TableCell>
                  <TableCell className="p-3">
                    <TaskEffortControl task={t} canManageTasks={canManageTasks} onChange={handleEffortChange} />
                  </TableCell>
                  <TableCell className="p-3 text-muted-foreground">{assigneeControl(t)}</TableCell>
                  <TableCell className="p-3 text-xs text-muted-foreground">
                    {formatTaskPeriod(t)}
                  </TableCell>
                  <TableCell className="p-3 text-center">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        </>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>태스크 추가</DialogTitle>
            <DialogDescription>프로젝트에 새 태스크를 추가합니다.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-3">
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

            <div className="grid gap-4 sm:grid-cols-3">
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

            <div className="grid gap-4 sm:grid-cols-3">
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
              <div className="space-y-2">
                <label className="text-sm font-medium">예상 공수</label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2"><span className="text-sm font-medium">담당자</span>
            <TaskAssigneeSelect projectId={String(projectId)} value={formData.assigneeUserId} onChange={(assigneeUserId) => setFormData({ ...formData, assigneeUserId })} />
          </div>
          {createTask.isError && <p role="alert" className="text-sm text-destructive">작업을 등록하지 못했습니다. 입력값과 담당자를 확인하고 다시 시도해 주세요.</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} className="w-full sm:w-auto">취소</Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.taskCode.trim() || !formData.taskName.trim() || createTask.isPending || !canManageTasks}
              className="w-full sm:w-auto"
            >
              {createTask.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEffortDialog} onOpenChange={setShowEffortDialog}>
        <DialogContent
          className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg"
          data-testid="pms-task-effort-log-dialog"
        >
          <DialogHeader>
            <DialogTitle>공수 기록 추가</DialogTitle>
            <DialogDescription>작업별 일일 공수를 기록합니다.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">작업 *</label>
              <Select
                value={effortFormData.taskId}
                onValueChange={(value) => setEffortFormData({ ...effortFormData, taskId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {settings.isError && <p role="alert" className="text-sm text-destructive">표시 설정을 확인하지 못해 모든 작업을 표시합니다. <Button variant="outline" size="sm" onClick={() => settings.refetch()}>다시 확인</Button></p>}
      {hiddenCount > 0 && <div className="flex flex-wrap items-center gap-2 text-sm" role="status">완료 작업 {hiddenCount}개 숨김
        <Button variant="outline" size="sm" disabled={saveSettings.isPending} onClick={() => saveSettings.mutate({ showCompletedTasks: true })}>완료 작업 표시</Button>
      </div>}
      {saveSettings.isError && <p role="alert" className="text-sm text-destructive">설정을 저장하지 못했습니다. 다시 시도해 주세요.</p>}
      {updateTask.isError && <p role="alert" className="text-sm text-destructive">작업을 저장하지 못했습니다. 담당자와 권한을 확인하고 다시 시도해 주세요.</p>}
      {tasks.length === 0 ? (
                    <SelectItem value={NO_TASK_VALUE}>작업 없음</SelectItem>
                  ) : (
                    tasks.map((task) => (
                      <SelectItem key={String(task.id)} value={String(task.id)}>
                        {task.taskCode} · {task.taskName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">작업일 *</label>
                <Input
                  type="date"
                  value={effortFormData.workDate}
                  onChange={(event) => setEffortFormData({ ...effortFormData, workDate: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">공수 *</label>
                <Input
                  type="number"
                  min={0.5}
                  max={24}
                  step={0.5}
                  value={effortFormData.actualHours}
                  onChange={(event) => setEffortFormData({ ...effortFormData, actualHours: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">유형</label>
                <Select
                  value={effortFormData.workTypeCode}
                  onValueChange={(value) => setEffortFormData({ ...effortFormData, workTypeCode: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">요약</label>
              <Input
                value={effortFormData.summary}
                onChange={(event) => setEffortFormData({ ...effortFormData, summary: event.target.value })}
                placeholder="수행 내용"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEffortDialog(false)}
              className="w-full sm:w-auto"
            >
              취소
            </Button>
            <Button
              onClick={handleCreateEffortLog}
              disabled={
                !canManageTasks
                || effortFormData.taskId === NO_TASK_VALUE
                || !effortFormData.workDate
                || !toTaskHours(effortFormData.actualHours)
                || createTaskEffortLog.isPending
              }
              className="w-full sm:w-auto"
            >
              {createTaskEffortLog.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
