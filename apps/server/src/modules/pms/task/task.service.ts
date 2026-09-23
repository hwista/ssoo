import { PmsWorkNotificationService } from '../settings/work-notification.service.js';
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type {
  CreateTaskEffortLogDto,
  CreateTaskDto,
  TaskAiIndexBackfillItem,
  TaskAiIndexBackfillRequest,
  TaskAiIndexBackfillResponse,
  UpdateTaskEffortLogDto,
  UpdateTaskDto,
} from '@ssoo/types';
import type { AiIndexJobType, AiIndexJsonObject } from '@ssoo/types/common';
import { AiIndexingService } from '../../common/ai-index/ai-indexing.service.js';

const DEFAULT_TASK_AI_INDEX_BACKFILL_LIMIT = 100;
const MAX_TASK_AI_INDEX_BACKFILL_LIMIT = 500;
const DEFAULT_TASK_AI_INDEX_BACKFILL_REASON = 'task_backfill_requested';
const TASK_EFFORT_LOG_SOURCE = 'pms.task.effort-log';
const TASK_EFFORT_LOG_INCLUDE = {
  task: {
    select: {
      id: true,
      taskCode: true,
      taskName: true,
    },
  },
  user: {
    select: {
      id: true,
      userName: true,
      displayName: true,
    },
  },
} as const;

interface TaskAiIndexQueueOptions {
  payload?: AiIndexJsonObject;
  priority?: number;
}

interface TaskAiIndexQueueResult {
  status: 'queued' | 'failed';
  errorMessage?: string;
}

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly aiIndexingService: AiIndexingService,
    private readonly workNotifications: PmsWorkNotificationService,
  ) {}

  async findByProject(projectId: bigint) {
    return this.db.client.task.findMany({
      where: { projectId, isActive: true },
      include: {
        assignee: {
          select: { id: true, userName: true, displayName: true },
        },
      },
      orderBy: [{ depth: 'asc' }, { sortOrder: 'asc' }, { taskCode: 'asc' }],
    });
  }

  async findOne(id: bigint, projectId?: bigint) {
    const task = await this.db.client.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, userName: true, displayName: true },
        },
        childTasks: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { taskCode: 'asc' }],
        },
      },
    });
    if (!task || (projectId !== undefined && task.projectId !== projectId)) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  async findEffortLogsByProject(projectId: bigint) {
    return this.db.client.taskEffortLog.findMany({
      where: { projectId, isActive: true },
      include: TASK_EFFORT_LOG_INCLUDE,
      orderBy: [{ workDate: 'desc' }, { createdAt: 'desc' }, { effortLogId: 'desc' }],
    });
  }

  async createEffortLog(projectId: bigint, dto: CreateTaskEffortLogDto) {
    const task = await this.resolveTaskForEffortLog(projectId, dto.taskId);
    const userId = await this.resolveEffortLogUserId(dto.userId);
    const actualHours = this.normalizeEffortHours(dto.actualHours);

    const log = await this.db.client.taskEffortLog.create({
      data: {
        projectId,
        taskId: task.id,
        userId,
        workDate: this.normalizeEffortWorkDate(dto.workDate),
        actualHours,
        workTypeCode: this.normalizeEffortWorkTypeCode(dto.workTypeCode),
        summary: this.normalizeOptionalText(dto.summary),
        memo: this.normalizeOptionalText(dto.memo),
        lastSource: TASK_EFFORT_LOG_SOURCE,
        lastActivity: 'task_effort_log_created',
      },
      include: TASK_EFFORT_LOG_INCLUDE,
    });

    await this.refreshTaskActualHours(task.id);
    await this.queueTaskAiIndexJob(task.id, 'upsert', 'task_effort_log_created', projectId, {
      payload: {
        effortLogId: log.effortLogId.toString(),
        workDate: log.workDate.toISOString(),
        actualHours,
      },
    });

    return log;
  }

  async updateEffortLog(projectId: bigint, effortLogId: bigint, dto: UpdateTaskEffortLogDto) {
    const existing = await this.db.client.taskEffortLog.findUnique({ where: { effortLogId } });
    if (!existing || existing.projectId !== projectId) {
      throw new NotFoundException(`Task effort log ${effortLogId} not found`);
    }

    const nextTask =
      dto.taskId !== undefined
        ? await this.resolveTaskForEffortLog(projectId, dto.taskId)
        : null;
    const nextUserId =
      dto.userId !== undefined ? await this.resolveEffortLogUserId(dto.userId) : undefined;
    const nextActualHours =
      dto.actualHours !== undefined ? this.normalizeEffortHours(dto.actualHours) : undefined;

    const log = await this.db.client.taskEffortLog.update({
      where: { effortLogId },
      data: {
        ...(nextTask && { taskId: nextTask.id }),
        ...(nextUserId !== undefined && { userId: nextUserId }),
        ...(dto.workDate !== undefined && { workDate: this.normalizeEffortWorkDate(dto.workDate) }),
        ...(nextActualHours !== undefined && { actualHours: nextActualHours }),
        ...(dto.workTypeCode !== undefined && { workTypeCode: this.normalizeEffortWorkTypeCode(dto.workTypeCode) }),
        ...(dto.summary !== undefined && { summary: this.normalizeOptionalText(dto.summary) }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.memo !== undefined && { memo: this.normalizeOptionalText(dto.memo) }),
        lastSource: TASK_EFFORT_LOG_SOURCE,
        lastActivity: 'task_effort_log_updated',
      },
      include: TASK_EFFORT_LOG_INCLUDE,
    });

    await this.refreshTaskActualHours(existing.taskId);
    if (log.taskId !== existing.taskId) {
      await this.refreshTaskActualHours(log.taskId);
    }
    await this.queueTaskAiIndexJob(log.taskId, 'upsert', 'task_effort_log_updated', projectId, {
      payload: {
        effortLogId: log.effortLogId.toString(),
        active: log.isActive,
      },
    });

    return log;
  }

  async removeEffortLog(projectId: bigint, effortLogId: bigint) {
    const existing = await this.db.client.taskEffortLog.findUnique({ where: { effortLogId } });
    if (!existing || existing.projectId !== projectId) {
      throw new NotFoundException(`Task effort log ${effortLogId} not found`);
    }

    const log = await this.db.client.taskEffortLog.update({
      where: { effortLogId },
      data: {
        isActive: false,
        lastSource: TASK_EFFORT_LOG_SOURCE,
        lastActivity: 'task_effort_log_deleted',
      },
      include: TASK_EFFORT_LOG_INCLUDE,
    });

    await this.refreshTaskActualHours(existing.taskId);
    await this.queueTaskAiIndexJob(existing.taskId, 'upsert', 'task_effort_log_deleted', projectId, {
      payload: {
        effortLogId: log.effortLogId.toString(),
        active: false,
      },
    });

    return log;
  }

  async queueAiIndexBackfill(
    projectId: bigint,
    request: TaskAiIndexBackfillRequest = {},
  ): Promise<TaskAiIndexBackfillResponse> {
    const limit = this.normalizeAiIndexBackfillLimit(request.limit);
    const requestedTaskIds = this.normalizeAiIndexBackfillTaskIds(request.taskIds);
    const reasonCode = request.reasonCode?.trim() || DEFAULT_TASK_AI_INDEX_BACKFILL_REASON;
    const includeInactive = request.includeInactive === true;
    const limitedTaskIds = requestedTaskIds.slice(0, limit);
    const rows = await this.db.client.task.findMany({
      where: {
        projectId,
        ...(includeInactive ? {} : { isActive: true }),
        ...(limitedTaskIds.length > 0 ? { id: { in: limitedTaskIds } } : {}),
      },
      select: {
        id: true,
        projectId: true,
        updatedAt: true,
      },
      orderBy: [
        { updatedAt: 'desc' },
        { id: 'asc' },
      ],
      take: limit,
    });
    const items: TaskAiIndexBackfillItem[] = [];

    for (const row of rows) {
      const result = await this.queueTaskAiIndexJob(
        row.id,
        'backfill',
        reasonCode,
        row.projectId,
        {
          priority: 30,
          payload: {
            backfill: true,
            includeInactive,
            taskUpdatedAt: row.updatedAt.toISOString(),
            selectedLimit: limit,
          },
        },
      );
      items.push({
        taskId: row.id.toString(),
        status: result.status,
        ...(result.errorMessage ? { errorMessage: result.errorMessage } : {}),
      });
    }

    const queuedCount = items.filter((item) => item.status === 'queued').length;
    const failedCount = items.length - queuedCount;

    return {
      sourceApp: 'pms',
      entityType: 'task',
      jobType: 'backfill',
      projectId: projectId.toString(),
      requestedCount: requestedTaskIds.length,
      selectedCount: rows.length,
      queuedCount,
      failedCount,
      limit,
      includeInactive,
      reasonCode,
      items,
    };
  }

  async create(projectId: bigint, dto: CreateTaskDto, actorUserId: bigint) {
    const wbsId = await this.resolveWbsId(projectId, dto.wbsId);

    const { task, notifications } = await this.db.client.$transaction(async (tx) => {
      const assigneeUserId = this.parseAssignee(dto.assigneeUserId);
      if (assigneeUserId) await this.workNotifications.assertAssignee(tx, projectId, assigneeUserId);
      const task = await tx.task.create({
        data: {
          projectId,
          wbsId,
          parentTaskId: dto.parentTaskId ? BigInt(dto.parentTaskId) : null,
          taskCode: dto.taskCode,
          taskName: dto.taskName,
          description: dto.description,
          taskTypeCode: dto.taskTypeCode,
          priorityCode: dto.priorityCode ?? 'normal',
          assigneeUserId,
          plannedStartAt: dto.plannedStartAt ? new Date(dto.plannedStartAt) : null,
          plannedEndAt: dto.plannedEndAt ? new Date(dto.plannedEndAt) : null,
          estimatedHours: dto.estimatedHours,
          depth: dto.depth ?? 0,
          sortOrder: dto.sortOrder ?? 0,
          memo: dto.memo,
        },
        include: {
          assignee: {
            select: { id: true, userName: true, displayName: true },
          },
        },
      });
      const notifications = await this.workNotifications.create(tx, {
        projectId, actorUserId, recipients: [task.assigneeUserId], kind: 'task-assignment',
        referenceId: task.id, title: task.taskName,
      });
      return { task, notifications };
    }).catch((error: unknown) => {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('같은 코드의 작업이 이미 등록되어 있습니다. 목록을 확인해 주세요.');
      }
      throw error;
    });
    this.workNotifications.publish(notifications);
    await this.queueTaskAiIndexJob(task.id, 'upsert', 'task_created', task.projectId);
    return task;
  }

  async update(id: bigint, dto: UpdateTaskDto, actorUserId: bigint, projectId: bigint) {
    const { task, notifications } = await this.db.client.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT task_id FROM pms.pr_task_m WHERE task_id = ${id} AND project_id = ${projectId} FOR UPDATE`;
      const existing = await tx.task.findUnique({ where: { id } });
      if (!existing || existing.projectId !== projectId) throw new NotFoundException(`Task ${id} not found`);

      const wbsId =
        dto.wbsId !== undefined
          ? await this.resolveWbsId(existing.projectId, dto.wbsId)
          : undefined;

      const assigneeUserId = dto.assigneeUserId !== undefined ? this.parseAssignee(dto.assigneeUserId) : existing.assigneeUserId;
      if (assigneeUserId && assigneeUserId !== existing.assigneeUserId) {
        await this.workNotifications.assertAssignee(tx, projectId, assigneeUserId);
      }
      const task = await tx.task.update({
        where: { id },
        data: {
          ...(wbsId !== undefined && { wbsId }),
          ...(dto.taskName !== undefined && { taskName: dto.taskName }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.taskTypeCode !== undefined && { taskTypeCode: dto.taskTypeCode }),
          ...(dto.statusCode !== undefined && { statusCode: dto.statusCode }),
          ...(dto.priorityCode !== undefined && { priorityCode: dto.priorityCode }),
          ...(dto.assigneeUserId !== undefined && { assigneeUserId }),
          ...(dto.plannedStartAt !== undefined && { plannedStartAt: dto.plannedStartAt ? new Date(dto.plannedStartAt) : null }),
          ...(dto.plannedEndAt !== undefined && { plannedEndAt: dto.plannedEndAt ? new Date(dto.plannedEndAt) : null }),
          ...(dto.actualStartAt !== undefined && { actualStartAt: dto.actualStartAt ? new Date(dto.actualStartAt) : null }),
          ...(dto.actualEndAt !== undefined && { actualEndAt: dto.actualEndAt ? new Date(dto.actualEndAt) : null }),
          ...(dto.progressRate !== undefined && { progressRate: dto.progressRate }),
          ...(dto.estimatedHours !== undefined && { estimatedHours: dto.estimatedHours }),
          ...(dto.actualHours !== undefined && { actualHours: dto.actualHours }),
          ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(dto.memo !== undefined && { memo: dto.memo }),
        },
        include: {
          assignee: {
            select: { id: true, userName: true, displayName: true },
          },
        },
      });
      const notifications = task.isActive && assigneeUserId !== existing.assigneeUserId
        ? await this.workNotifications.create(tx, {
            projectId, actorUserId, recipients: [assigneeUserId], kind: 'task-assignment',
            referenceId: task.id, title: task.taskName,
          }) : [];
      return { task, notifications };
    });
    this.workNotifications.publish(notifications);
    await this.queueTaskAiIndexJob(task.id, 'upsert', 'task_updated', task.projectId);
    return task;
  }

  async remove(id: bigint, projectId?: bigint) {
    const existing = await this.db.client.task.findUnique({ where: { id } });
    if (!existing || (projectId !== undefined && existing.projectId !== projectId)) throw new NotFoundException(`Task ${id} not found`);
    const task = await this.db.client.task.delete({ where: { id } });
    await this.queueTaskAiIndexJob(id, 'delete', 'task_deleted', existing.projectId);
    return task;
  }

  assignees(projectId: bigint) {
    return this.workNotifications.assignees(projectId);
  }

  private parseAssignee(value?: string | null): bigint | null {
    if (value === undefined || value === null || value === '') return null;
    if (!/^\d+$/.test(value) || BigInt(value) <= 0n) throw new BadRequestException('유효한 담당자 식별자가 필요합니다.');
    return BigInt(value);
  }

  private async queueTaskAiIndexJob(
    taskId: bigint,
    jobType: AiIndexJobType,
    reasonCode: string,
    projectId: bigint,
    options: TaskAiIndexQueueOptions = {},
  ): Promise<TaskAiIndexQueueResult> {
    try {
      const payload = {
        source: 'pms.task',
        ...options.payload,
        reasonCode,
        projectId: projectId.toString(),
      } satisfies AiIndexJsonObject;

      await this.aiIndexingService.queueJob({
        sourceApp: 'pms',
        entityType: 'task',
        entityId: taskId.toString(),
        jobType,
        priority: options.priority ?? this.resolveTaskAiIndexJobPriority(jobType),
        payload,
      });
      return { status: 'queued' };
    } catch (error) {
      const errorMessage = this.getAiIndexErrorMessage(error);
      this.logger.warn(
        `PMS task AI index job queue failed (${taskId.toString()}, ${reasonCode}): ${errorMessage}`,
      );
      return {
        status: 'failed',
        errorMessage,
      };
    }
  }

  private resolveTaskAiIndexJobPriority(jobType: AiIndexJobType): number {
    if (jobType === 'delete') {
      return 10;
    }

    if (jobType === 'backfill') {
      return 30;
    }

    return 20;
  }

  private normalizeAiIndexBackfillLimit(limit: number | undefined): number {
    const parsedLimit = Number(limit);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      return DEFAULT_TASK_AI_INDEX_BACKFILL_LIMIT;
    }

    return Math.min(Math.floor(parsedLimit), MAX_TASK_AI_INDEX_BACKFILL_LIMIT);
  }

  private normalizeAiIndexBackfillTaskIds(taskIds: string[] | undefined): bigint[] {
    if (!taskIds || taskIds.length === 0) {
      return [];
    }

    const normalizedIds = new Set<bigint>();
    for (const value of taskIds) {
      const trimmedValue = value.trim();
      if (!/^\d+$/.test(trimmedValue)) {
        throw new BadRequestException('유효한 태스크 식별자 목록이 아닙니다.');
      }
      normalizedIds.add(BigInt(trimmedValue));
    }

    return [...normalizedIds];
  }

  private getAiIndexErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private async resolveWbsId(projectId: bigint, wbsId?: string | null) {
    if (wbsId === undefined) {
      return undefined;
    }

    if (wbsId === null || wbsId === '') {
      return null;
    }

    const resolved = await this.db.client.wbs.findFirst({
      where: { id: BigInt(wbsId), projectId, isActive: true },
      select: { id: true },
    });

    if (!resolved) {
      throw new NotFoundException(`WBS ${wbsId} not found`);
    }

    return resolved.id;
  }

  private async resolveTaskForEffortLog(projectId: bigint, taskId: string | undefined) {
    if (!taskId || !/^\d+$/.test(taskId.trim())) {
      throw new BadRequestException('유효한 태스크 식별자가 필요합니다.');
    }

    const resolved = await this.db.client.task.findFirst({
      where: { id: BigInt(taskId), projectId, isActive: true },
      select: { id: true, projectId: true },
    });

    if (!resolved) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    return resolved;
  }

  private async resolveEffortLogUserId(userId?: string | null) {
    if (userId === undefined || userId === null || userId.trim() === '') {
      return null;
    }

    if (!/^\d+$/.test(userId.trim())) {
      throw new BadRequestException('유효한 사용자 식별자가 필요합니다.');
    }

    const resolved = await this.db.client.user.findUnique({
      where: { id: BigInt(userId) },
      select: { id: true, isActive: true },
    });

    if (!resolved || !resolved.isActive) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return resolved.id;
  }

  private normalizeEffortWorkDate(value: string) {
    const trimmedValue = value?.trim();
    if (!trimmedValue) {
      throw new BadRequestException('공수 작업일이 필요합니다.');
    }

    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmedValue);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    }

    const date = new Date(trimmedValue);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('공수 작업일 형식이 올바르지 않습니다.');
    }

    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private normalizeEffortHours(value: number) {
    const hours = Number(value);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      throw new BadRequestException('공수는 0보다 크고 24 이하의 숫자여야 합니다.');
    }

    return Math.round(hours * 10) / 10;
  }

  private normalizeEffortWorkTypeCode(value?: string | null) {
    const workTypeCode = value?.trim() || 'execution';
    if (workTypeCode.length > 50) {
      throw new BadRequestException('공수 유형 코드는 50자 이하여야 합니다.');
    }

    return workTypeCode;
  }

  private normalizeOptionalText(value?: string | null) {
    if (value === undefined || value === null) {
      return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
  }

  private async refreshTaskActualHours(taskId: bigint) {
    const aggregate = await this.db.client.taskEffortLog.aggregate({
      where: { taskId, isActive: true },
      _sum: { actualHours: true },
    });
    const actualHours = aggregate._sum.actualHours === null
      ? null
      : Math.round(Number(aggregate._sum.actualHours) * 10) / 10;

    return this.db.client.task.update({
      where: { id: taskId },
      data: {
        actualHours,
        lastSource: TASK_EFFORT_LOG_SOURCE,
        lastActivity: 'task_effort_log_aggregate',
      },
    });
  }
}
