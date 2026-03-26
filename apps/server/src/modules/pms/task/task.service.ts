import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { CreateTaskDto, UpdateTaskDto } from '@ssoo/types';

@Injectable()
export class TaskService {
  constructor(private readonly db: DatabaseService) {}

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

  async findOne(id: bigint) {
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
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  async create(projectId: bigint, dto: CreateTaskDto) {
    return this.db.client.task.create({
      data: {
        projectId,
        parentTaskId: dto.parentTaskId ? BigInt(dto.parentTaskId) : null,
        taskCode: dto.taskCode,
        taskName: dto.taskName,
        description: dto.description,
        taskTypeCode: dto.taskTypeCode,
        priorityCode: dto.priorityCode ?? 'normal',
        assigneeUserId: dto.assigneeUserId ? BigInt(dto.assigneeUserId) : null,
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
  }

  async update(id: bigint, dto: UpdateTaskDto) {
    const existing = await this.db.client.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Task ${id} not found`);

    return this.db.client.task.update({
      where: { id },
      data: {
        ...(dto.taskName !== undefined && { taskName: dto.taskName }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.taskTypeCode !== undefined && { taskTypeCode: dto.taskTypeCode }),
        ...(dto.statusCode !== undefined && { statusCode: dto.statusCode }),
        ...(dto.priorityCode !== undefined && { priorityCode: dto.priorityCode }),
        ...(dto.assigneeUserId !== undefined && { assigneeUserId: dto.assigneeUserId ? BigInt(dto.assigneeUserId) : null }),
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
  }

  async remove(id: bigint) {
    const existing = await this.db.client.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Task ${id} not found`);
    return this.db.client.task.delete({ where: { id } });
  }
}
