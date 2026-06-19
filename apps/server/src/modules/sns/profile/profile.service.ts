import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@ssoo/database';
import { DatabaseService } from '../../../database/database.service.js';
import type { UpdateProfileDto, CreateCareerDto } from './dto/profile.dto.js';
import { CommonNotificationService } from '../../common/notification/notification.service.js';

const profileInclude = {
  userSkills: {
    where: { isActive: true },
    include: {
      skill: true,
      _count: {
        select: {
          endorsements: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  },
  careers: {
    where: { isActive: true },
    orderBy: { startDate: 'desc' },
  },
} as const;

const profileUserSelect = {
  id: true,
  userName: true,
  displayName: true,
  email: true,
  phone: true,
  avatarUrl: true,
  departmentCode: true,
  positionCode: true,
  isActive: true,
} as const;

type ProfileRecord = Prisma.SnsUserProfileGetPayload<{
  include: typeof profileInclude;
}>;

type ProfileUserRecord = Prisma.UserGetPayload<{
  select: typeof profileUserSelect;
}>;

@Injectable()
export class ProfileService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notificationService: CommonNotificationService,
  ) {}

  async getMyProfile(userId: bigint) {
    return this.getProfileSurface(userId, userId);
  }

  async getProfileByUserId(userId: bigint, viewerUserId: bigint) {
    return this.getProfileSurface(userId, viewerUserId);
  }

  async updateProfile(userId: bigint, dto: UpdateProfileDto) {
    await this.assertActiveUser(userId);

    const userUpdateData: Prisma.UserUpdateInput = {};

    if (dto.displayName !== undefined) {
      userUpdateData.displayName = this.toNullableText(dto.displayName);
    }

    if (dto.avatarUrl !== undefined) {
      userUpdateData.avatarUrl = this.toNullableText(dto.avatarUrl);
    }

    if (Object.keys(userUpdateData).length > 0) {
      await this.db.user.update({
        where: { id: userId },
        data: userUpdateData,
      });
    }

    const profileUpdateData: Prisma.SnsUserProfileUpdateInput = {};
    const profileCreateData: Prisma.SnsUserProfileCreateInput = {
      userId,
    };

    if (dto.bio !== undefined) {
      const bio = this.toNullableText(dto.bio);
      profileUpdateData.bio = bio;
      profileCreateData.bio = bio;
    }

    if (dto.coverImageUrl !== undefined) {
      const coverImageUrl = this.toNullableText(dto.coverImageUrl);
      profileUpdateData.coverImageUrl = coverImageUrl;
      profileCreateData.coverImageUrl = coverImageUrl;
    }

    if (dto.linkedinUrl !== undefined) {
      const linkedinUrl = this.toNullableText(dto.linkedinUrl);
      profileUpdateData.linkedinUrl = linkedinUrl;
      profileCreateData.linkedinUrl = linkedinUrl;
    }

    if (dto.websiteUrl !== undefined) {
      const websiteUrl = this.toNullableText(dto.websiteUrl);
      profileUpdateData.websiteUrl = websiteUrl;
      profileCreateData.websiteUrl = websiteUrl;
    }

    if (Object.keys(profileUpdateData).length > 0) {
      await this.db.client.snsUserProfile.upsert({
        where: { userId },
        create: profileCreateData,
        update: profileUpdateData,
      });
    } else {
      await this.ensureProfile(userId);
    }

    const surface = await this.getProfileSurface(userId, userId);
    this.notificationService.publishDomainEvent('sns', 'user.profile.updated', {
      userId: userId.toString(),
      actorUserId: userId.toString(),
    });
    return surface;
  }

  async addCareer(userId: bigint, dto: CreateCareerDto) {
    await this.assertActiveUser(userId);
    const profile = await this.ensureProfile(userId);

    const career = await this.db.client.snsUserCareer.create({
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
    this.notificationService.publishDomainEvent('sns', 'user.profile.updated', {
      userId: userId.toString(),
      actorUserId: userId.toString(),
    });
    return career;
  }

  private async getProfileSurface(userId: bigint, viewerUserId: bigint) {
    const user = await this.assertActiveUser(userId);
    const profile = await this.ensureProfile(userId);
    const [followersCount, followingCount, following] = await Promise.all([
      this.db.client.snsFollow.count({
        where: { followingUserId: userId },
      }),
      this.db.client.snsFollow.count({
        where: { followerUserId: userId },
      }),
      viewerUserId === userId
        ? Promise.resolve(null)
        : this.db.client.snsFollow.findFirst({
          where: {
            followerUserId: viewerUserId,
            followingUserId: userId,
          },
          select: { id: true },
        }),
    ]);

    return this.toProfileSurface(profile, user, {
      followersCount,
      followingCount,
      isFollowing: Boolean(following),
      isOwnProfile: viewerUserId === userId,
    });
  }

  private async assertActiveUser(userId: bigint): Promise<ProfileUserRecord> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: profileUserSelect,
    });

    if (!user || !user.isActive) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return user;
  }

  private async ensureProfile(userId: bigint): Promise<ProfileRecord> {
    const profile = await this.db.client.snsUserProfile.findUnique({
      where: { userId },
      include: profileInclude,
    });

    if (profile) {
      return profile;
    }

    return this.db.client.snsUserProfile.create({
      data: { userId },
      include: profileInclude,
    });
  }

  private toProfileSurface(
    profile: ProfileRecord,
    user: ProfileUserRecord,
    followStats: {
      followersCount: number;
      followingCount: number;
      isFollowing: boolean;
      isOwnProfile: boolean;
    },
  ) {
    return {
      id: profile.id,
      userId: profile.userId,
      user: {
        id: user.id,
        userName: user.userName,
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        departmentCode: user.departmentCode,
        positionCode: user.positionCode,
      },
      bio: profile.bio,
      coverImageUrl: profile.coverImageUrl,
      linkedinUrl: profile.linkedinUrl,
      websiteUrl: profile.websiteUrl,
      isActive: profile.isActive,
      skills: profile.userSkills.map((userSkill) => ({
        id: userSkill.id,
        profileId: userSkill.profileId,
        skillId: userSkill.skillId,
        skillName: userSkill.skill.skillName,
        skillCategory: userSkill.skill.skillCategory,
        proficiencyLevel: userSkill.proficiencyLevel,
        yearsOfExperience: userSkill.yearsOfExperience,
        endorsementCount: userSkill._count.endorsements,
      })),
      careers: profile.careers.map((career) => ({
        id: career.id,
        profileId: career.profileId,
        projectId: career.projectId,
        companyName: career.companyName,
        projectName: career.projectName,
        roleName: career.roleName,
        description: career.description,
        startDate: career.startDate,
        endDate: career.endDate,
      })),
      followStats: {
        followersCount: followStats.followersCount,
        followingCount: followStats.followingCount,
        isFollowing: followStats.isFollowing,
      },
      isOwnProfile: followStats.isOwnProfile,
      profilePath: `/__user/profile/${profile.userId.toString()}`,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private toNullableText(value: string): string | null {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
}
