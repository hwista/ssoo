import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import type { Prisma } from '@ssoo/database';
import { DatabaseService } from '../../../database/database.service.js';
import type { CreateSkillDto, AddUserSkillDto, EndorseSkillDto, SearchExpertsDto } from './dto/skill.dto.js';

@Injectable()
export class SkillService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    return this.db.client.snsSkill.findMany({
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

    const keyword = params.keyword?.trim();
    // Common users and SNS profiles belong to separate schemas; join their IDs here.
    const [activeUsers, matchingUsers] = await Promise.all([
      this.db.user.findMany({ where: { isActive: true }, select: { id: true } }),
      keyword
        ? this.db.user.findMany({
          where: {
            isActive: true,
            OR: [
              { userName: { contains: keyword, mode: 'insensitive' } },
              { displayName: { contains: keyword, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        })
        : Promise.resolve([]),
    ]);
    const where: Prisma.SnsUserProfileWhereInput = {
      isActive: true,
      userId: { in: activeUsers.map((user) => user.id) },
    };

    if (params.skillIds?.length) {
      where.userSkills = {
        some: {
          skillId: { in: params.skillIds.map((id) => BigInt(id)) },
          isActive: true,
          skill: { isActive: true },
        },
      };
    }

    if (keyword) {
      where.OR = [
        { userId: { in: matchingUsers.map((user) => user.id) } },
        { bio: { contains: keyword, mode: 'insensitive' } },
        {
          userSkills: {
            some: {
              isActive: true,
              skill: {
                isActive: true,
                skillName: { contains: keyword, mode: 'insensitive' },
              },
            },
          },
        },
      ];
    }

    const [profiles, total] = await Promise.all([
      this.db.client.snsUserProfile.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { id: 'asc' },
        include: {
          userSkills: {
            where: { isActive: true, skill: { isActive: true } },
            include: { skill: true },
            orderBy: { id: 'asc' },
          },
        },
      }),
      this.db.client.snsUserProfile.count({ where }),
    ]);
    const users = await this.db.user.findMany({
      where: { id: { in: profiles.map((profile) => profile.userId) }, isActive: true },
      select: {
        id: true, userName: true, displayName: true, avatarUrl: true, departmentCode: true,
      },
    });
    const usersById = new Map(users.map((user) => [user.id, user]));
    const data = profiles.flatMap((profile) => {
      const user = usersById.get(profile.userId);
      if (!user) return [];
      // Keep the existing profile/userSkills response and add only display fields.
      return [{
        ...profile,
        userName: user.userName,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        departmentCode: user.departmentCode,
      }];
    });

    return { data, total, page, pageSize };
  }

  async createSkill(dto: CreateSkillDto) {
    const existing = await this.db.client.snsSkill.findUnique({
      where: { skillName: dto.skillName },
    });
    if (existing) {
      throw new ConflictException(`Skill '${dto.skillName}' already exists`);
    }

    return this.db.client.snsSkill.create({
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
    const profile = await this.db.client.snsUserProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }

    const skill = await this.db.client.snsSkill.findUnique({
      where: { id: BigInt(dto.skillId) },
    });
    if (!skill || !skill.isActive) {
      throw new NotFoundException(`Skill ${dto.skillId} not found`);
    }

    return this.db.client.snsUserSkill.create({
      data: {
        profileId: profile.id,
        skillId: BigInt(dto.skillId),
        proficiencyLevel: dto.proficiencyLevel ?? 1,
        yearsOfExperience: dto.yearsOfExperience ?? 0,
      },
    });
  }

  async removeUserSkill(userId: bigint, skillId: bigint) {
    const profile = await this.db.client.snsUserProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }

    const userSkill = await this.db.client.snsUserSkill.findFirst({
      where: { profileId: profile.id, skillId, isActive: true },
    });
    if (!userSkill) {
      throw new NotFoundException(`User skill not found`);
    }

    return this.db.client.snsUserSkill.update({
      where: { id: userSkill.id },
      data: { isActive: false },
    });
  }

  async endorseSkill(endorserUserId: bigint, dto: EndorseSkillDto) {
    const userSkill = await this.db.client.snsUserSkill.findUnique({
      where: { id: BigInt(dto.userSkillId) },
      include: { profile: true },
    });
    if (!userSkill || !userSkill.isActive) {
      throw new NotFoundException(`User skill ${dto.userSkillId} not found`);
    }

    return this.db.client.snsEndorsement.create({
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
