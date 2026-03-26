import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { UpdateProfileDto, CreateCareerDto } from './dto/profile.dto.js';

@Injectable()
export class ProfileService {
  constructor(private readonly db: DatabaseService) {}

  async getMyProfile(userId: bigint) {
    const profile = await this.db.client.chUserProfile.findUnique({
      where: { userId },
      include: {
        userSkills: {
          where: { isActive: true },
          include: { skill: true },
        },
        careers: {
          where: { isActive: true },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!profile) {
      // Auto-create profile if not exists
      return this.db.client.chUserProfile.create({
        data: { userId },
        include: {
          userSkills: { include: { skill: true } },
          careers: true,
        },
      });
    }

    return profile;
  }

  async getProfileByUserId(userId: bigint) {
    const profile = await this.db.client.chUserProfile.findUnique({
      where: { userId },
      include: {
        userSkills: {
          where: { isActive: true },
          include: {
            skill: true,
            endorsements: true,
          },
        },
        careers: {
          where: { isActive: true },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }

    return profile;
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
}
