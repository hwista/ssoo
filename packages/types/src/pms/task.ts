// Task — WBS/태스크 관리

export interface Task {
  id: string;
  projectId: string;
  wbsId: string | null;
  parentTaskId: string | null;
  taskCode: string;
  taskName: string;
  description: string | null;
  taskTypeCode: string | null;
  statusCode: string;
  priorityCode: string;
  assigneeUserId: string | null;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  progressRate: number;
  estimatedHours: number | null;
  actualHours: number | null;
  depth: number;
  sortOrder: number;
  isActive: boolean;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
  // joined fields
  assigneeName?: string;
  childTasks?: Task[];
}

export interface CreateTaskDto {
  wbsId?: string | null;
  parentTaskId?: string | null;
  taskCode: string;
  taskName: string;
  description?: string;
  taskTypeCode?: string;
  priorityCode?: string;
  assigneeUserId?: string;
  plannedStartAt?: string;
  plannedEndAt?: string;
  estimatedHours?: number;
  depth?: number;
  sortOrder?: number;
  memo?: string;
}

export interface UpdateTaskDto {
  wbsId?: string | null;
  taskName?: string;
  description?: string;
  taskTypeCode?: string;
  statusCode?: string;
  priorityCode?: string;
  assigneeUserId?: string | null;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  progressRate?: number;
  estimatedHours?: number | null;
  actualHours?: number | null;
  sortOrder?: number;
  isActive?: boolean;
  memo?: string;
}
