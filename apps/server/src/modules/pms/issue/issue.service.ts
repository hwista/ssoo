import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { CreateIssueDto, UpdateIssueDto } from '@ssoo/types';

@Injectable()
export class IssueService {
  constructor(private readonly db: DatabaseService) {}

  private readonly userSelect = {
    id: true,
    userName: true,
    displayName: true,
  } as const;

  async findByProject(projectId: bigint, filters?: { statusCode?: string; issueTypeCode?: string }) {
    return this.db.client.issue.findMany({
      where: {
        projectId,
        isActive: true,
        ...(filters?.statusCode && { statusCode: filters.statusCode }),
        ...(filters?.issueTypeCode && { issueTypeCode: filters.issueTypeCode }),
      },
      include: {
        reportedBy: { select: this.userSelect },
        assignee: { select: this.userSelect },
      },
      orderBy: [{ priorityCode: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: bigint) {
    const issue = await this.db.client.issue.findUnique({
      where: { id },
      include: {
        reportedBy: { select: this.userSelect },
        assignee: { select: this.userSelect },
      },
    });
    if (!issue) throw new NotFoundException(`Issue ${id} not found`);
    return issue;
  }

  async create(projectId: bigint, dto: CreateIssueDto, reportedByUserId?: bigint) {
    return this.db.client.issue.create({
      data: {
        projectId,
        issueCode: dto.issueCode,
        issueTitle: dto.issueTitle,
        description: dto.description,
        issueTypeCode: dto.issueTypeCode,
        priorityCode: dto.priorityCode ?? 'normal',
        reportedByUserId: reportedByUserId ?? null,
        assigneeUserId: dto.assigneeUserId ? BigInt(dto.assigneeUserId) : null,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        memo: dto.memo,
      },
      include: {
        reportedBy: { select: this.userSelect },
        assignee: { select: this.userSelect },
      },
    });
  }

  async update(id: bigint, dto: UpdateIssueDto) {
    const existing = await this.db.client.issue.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Issue ${id} not found`);

    return this.db.client.issue.update({
      where: { id },
      data: {
        ...(dto.issueTitle !== undefined && { issueTitle: dto.issueTitle }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.issueTypeCode !== undefined && { issueTypeCode: dto.issueTypeCode }),
        ...(dto.statusCode !== undefined && { statusCode: dto.statusCode }),
        ...(dto.priorityCode !== undefined && { priorityCode: dto.priorityCode }),
        ...(dto.assigneeUserId !== undefined && { assigneeUserId: dto.assigneeUserId ? BigInt(dto.assigneeUserId) : null }),
        ...(dto.dueAt !== undefined && { dueAt: dto.dueAt ? new Date(dto.dueAt) : null }),
        ...(dto.resolvedAt !== undefined && { resolvedAt: dto.resolvedAt ? new Date(dto.resolvedAt) : null }),
        ...(dto.resolution !== undefined && { resolution: dto.resolution }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
      },
      include: {
        reportedBy: { select: this.userSelect },
        assignee: { select: this.userSelect },
      },
    });
  }

  async remove(id: bigint) {
    const existing = await this.db.client.issue.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Issue ${id} not found`);
    return this.db.client.issue.delete({ where: { id } });
  }
}
