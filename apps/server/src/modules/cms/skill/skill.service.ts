import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { CreateSkillDto, AddUserSkillDto, EndorseSkillDto, SearchExpertsDto } from './dto/skill.dto.js';

@Injectable()
export class SkillService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    return this.db.client.cmsSkill.findMany({
      where: { isActive: true },
      orderBy: [{ skillCategory: 'asc' }, { skillName: 'asc' }],
    });
  }

  async searchExperts(params: SearchExpertsDto) {
    const pageValue = Number(params.page);
    const pageSizeValue = Number(params.pageSize);
    const page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
    const pageSize = Number.isFinite(pageSizeValue) && pageSizeValue > 0 ? pageSizeValue : 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { isActive: true };

    if (params.skillIds && params.skillIds.length > 0) {
      where.userSkills = {
        some: {
          skillId: { in: params.skillIds.map((id) => BigInt(id)) },
          isActive: true,
        },
      };
    }

    if (params.keyword) {
      where.OR = [
        { bio: { contains: params.keyword, mode: 'insensitive' } },
        {
          userSkills: {
            some: {
              skill: {
                skillName: { contains: params.keyword, mode: 'insensitive' },
              },
            },
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.db.client.cmsUserProfile.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          userSkills: {
            where: { isActive: true },
            include: { skill: true },
          },
        },
      }),
      this.db.client.cmsUserProfile.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }

  async createSkill(dto: CreateSkillDto) {
    const existing = await this.db.client.cmsSkill.findUnique({
      where: { skillName: dto.skillName },
    });
    if (existing) {
      throw new ConflictException(`Skill '${dto.skillName}' already exists`);
    }

    return this.db.client.cmsSkill.create({
      data: {
        skillName: dto.skillName,
        skillCategory: dto.skillCategory,
        parentSkillId: dto.parentSkillId ? BigInt(dto.parentSkillId) : null,
        description: dto.description ?? null,
        synonyms: dto.synonyms ?? [],
      },
    });
  }

  async addUserSkill(userId: bigint, dto: AddUserSkillDto) {
    const profile = await this.db.client.cmsUserProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }

    const skill = await this.db.client.cmsSkill.findUnique({
      where: { id: BigInt(dto.skillId) },
    });
    if (!skill || !skill.isActive) {
      throw new NotFoundException(`Skill ${dto.skillId} not found`);
    }

    return this.db.client.cmsUserSkill.create({
      data: {
        profileId: profile.id,
        skillId: BigInt(dto.skillId),
        proficiencyLevel: dto.proficiencyLevel ?? 1,
        yearsOfExperience: dto.yearsOfExperience ?? 0,
      },
    });
  }

  async removeUserSkill(userId: bigint, skillId: bigint) {
    const profile = await this.db.client.cmsUserProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }

    const userSkill = await this.db.client.cmsUserSkill.findFirst({
      where: { profileId: profile.id, skillId, isActive: true },
    });
    if (!userSkill) {
      throw new NotFoundException(`User skill not found`);
    }

    return this.db.client.cmsUserSkill.update({
      where: { id: userSkill.id },
      data: { isActive: false },
    });
  }

  async endorseSkill(endorserUserId: bigint, dto: EndorseSkillDto) {
    const userSkill = await this.db.client.cmsUserSkill.findUnique({
      where: { id: BigInt(dto.userSkillId) },
      include: { profile: true },
    });
    if (!userSkill || !userSkill.isActive) {
      throw new NotFoundException(`User skill ${dto.userSkillId} not found`);
    }

    return this.db.client.cmsEndorsement.create({
      data: {
        endorserUserId,
        endorseeProfileId: userSkill.profileId,
        userSkillId: BigInt(dto.userSkillId),
        skillId: userSkill.skillId,
        comment: dto.comment ?? null,
      },
    });
  }
}
