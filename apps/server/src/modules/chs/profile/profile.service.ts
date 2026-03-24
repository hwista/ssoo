import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { UpdateProfileDto, CreateCareerDto } from './dto/profile.dto.js';

@Injectable()
export class ProfileService {
  constructor(private readonly db: DatabaseService) {}

  async getMyProfile(userId: bigint) {
    const profile = await this.ensureProfile(userId);
    return this.buildProfileResponse(profile.userId, userId);
  }

  async getProfileByUserId(userId: bigint, currentUserId: bigint) {
    const profile = await this.db.client.chUserProfile.findUnique({
      where: { userId },
      select: { userId: true },
    });

    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }

    return this.buildProfileResponse(profile.userId, currentUserId);
  }

  async updateProfile(userId: bigint, dto: UpdateProfileDto) {
    const profile = await this.db.client.chUserProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Auto-create with provided data
      return this.db.client.chUserProfile.create({
        data: {
          userId,
          bio: dto.bio ?? null,
          coverImageUrl: dto.coverImageUrl ?? null,
          linkedinUrl: dto.linkedinUrl ?? null,
          websiteUrl: dto.websiteUrl ?? null,
        },
      });
    }

    return this.db.client.chUserProfile.update({
      where: { userId },
      data: {
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.coverImageUrl !== undefined && { coverImageUrl: dto.coverImageUrl }),
        ...(dto.linkedinUrl !== undefined && { linkedinUrl: dto.linkedinUrl }),
        ...(dto.websiteUrl !== undefined && { websiteUrl: dto.websiteUrl }),
      },
    });
  }

  async addCareer(userId: bigint, dto: CreateCareerDto) {
    const profile = await this.db.client.chUserProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }

    return this.db.client.chUserCareer.create({
      data: {
        profileId: profile.id,
        projectName: dto.projectName,
        roleName: dto.roleName,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        description: dto.description ?? null,
        companyName: dto.companyName ?? null,
      },
    });
  }

  private async ensureProfile(userId: bigint) {
    const existing = await this.db.client.chUserProfile.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    });

    if (existing) {
      return existing;
    }

    return this.db.client.chUserProfile.create({
      data: { userId },
      select: { id: true, userId: true },
    });
  }

  private async buildProfileResponse(profileUserId: bigint, currentUserId: bigint) {
    const profile = await this.db.client.chUserProfile.findUnique({
      where: { userId: profileUserId },
      include: {
        userSkills: {
          where: { isActive: true },
          include: {
            skill: true,
            endorsements: {
              select: {
                endorserUserId: true,
              },
            },
          },
        },
        careers: {
          where: { isActive: true },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Profile for user ${profileUserId} not found`);
    }

    const [user, followersCount, followingCount, isFollowing] = await Promise.all([
      this.db.client.user.findUnique({
        where: { id: profileUserId },
        select: {
          id: true,
          userName: true,
          displayName: true,
          avatarUrl: true,
          departmentCode: true,
          positionCode: true,
          email: true,
        },
      }),
      this.db.client.chFollow.count({
        where: { followingUserId: profileUserId },
      }),
      this.db.client.chFollow.count({
        where: { followerUserId: profileUserId },
      }),
      profileUserId === currentUserId
        ? Promise.resolve(false)
        : this.db.client.chFollow.findFirst({
            where: {
              followerUserId: currentUserId,
              followingUserId: profileUserId,
            },
            select: { id: true },
          }).then((follow) => Boolean(follow)),
    ]);

    return {
      id: profile.id,
      userId: profile.userId,
      bio: profile.bio,
      coverImageUrl: profile.coverImageUrl,
      linkedinUrl: profile.linkedinUrl,
      websiteUrl: profile.websiteUrl,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      user,
      skills: profile.userSkills.map((userSkill) => ({
        id: userSkill.id,
        skillId: userSkill.skillId,
        skillName: userSkill.skill.skillName,
        skillCategory: userSkill.skill.skillCategory,
        proficiencyLevel: userSkill.proficiencyLevel,
        yearsOfExperience: userSkill.yearsOfExperience,
        endorsementCount: userSkill.endorsements.length,
        isEndorsedByMe:
          profileUserId === currentUserId
            ? false
            : userSkill.endorsements.some(
                (endorsement) => endorsement.endorserUserId === currentUserId
              ),
      })),
      careers: profile.careers,
      followStats: {
        followersCount,
        followingCount,
        isFollowing,
      },
    };
  }
}
