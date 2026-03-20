import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { CreateProjectMemberDto, UpdateProjectMemberDto } from '@ssoo/types';

const USER_SELECT = {
  id: true,
  userName: true,
  displayName: true,
  departmentCode: true,
  positionCode: true,
  email: true,
} as const;

@Injectable()
export class MemberService {
  constructor(private readonly db: DatabaseService) {}

  async findByProject(projectId: bigint) {
    return this.db.client.projectMember.findMany({
      where: { projectId, isActive: true },
      include: {
        user: { select: USER_SELECT },
      },
      orderBy: [{ roleCode: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async create(projectId: bigint, dto: CreateProjectMemberDto) {
    const userId = BigInt(dto.userId);

    const existing = await this.db.client.projectMember.findUnique({
      where: {
        pk_pr_project_member_r_m: {
          projectId,
          userId,
          roleCode: dto.roleCode,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Member already has role '${dto.roleCode}' on this project`);
    }

    return this.db.client.projectMember.create({
      data: {
        projectId,
        userId,
        roleCode: dto.roleCode,
        assignedAt: dto.assignedAt ? new Date(dto.assignedAt) : new Date(),
        allocationRate: dto.allocationRate ?? 100,
        memo: dto.memo,
      },
      include: {
        user: { select: USER_SELECT },
      },
    });
  }

  async update(projectId: bigint, userId: bigint, roleCode: string, dto: UpdateProjectMemberDto) {
    const existing = await this.db.client.projectMember.findUnique({
      where: {
        pk_pr_project_member_r_m: { projectId, userId, roleCode },
      },
    });

    if (!existing) {
      throw new NotFoundException('Project member not found');
    }

    return this.db.client.projectMember.update({
      where: {
        pk_pr_project_member_r_m: { projectId, userId, roleCode },
      },
      data: {
        ...(dto.releasedAt !== undefined && { releasedAt: dto.releasedAt ? new Date(dto.releasedAt) : null }),
        ...(dto.allocationRate !== undefined && { allocationRate: dto.allocationRate }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
      },
      include: {
        user: { select: USER_SELECT },
      },
    });
  }

  async remove(projectId: bigint, userId: bigint, roleCode: string): Promise<boolean> {
    const existing = await this.db.client.projectMember.findUnique({
      where: {
        pk_pr_project_member_r_m: { projectId, userId, roleCode },
      },
    });

    if (!existing) {
      throw new NotFoundException('Project member not found');
    }

    await this.db.client.projectMember.delete({
      where: {
        pk_pr_project_member_r_m: { projectId, userId, roleCode },
      },
    });

    return true;
  }
}
