import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../../../database/database.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UserService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Login ID로 사용자 조회
   */
  async findByLoginId(loginId: string) {
    return this.db.user.findUnique({
      where: { loginId },
    });
  }

  /**
   * ID로 사용자 조회
   */
  async findById(userId: bigint) {
    return this.db.user.findUnique({
      where: { id: userId },
    });
  }

  /**
   * 이메일로 사용자 조회
   */
  async findByEmail(email: string) {
    return this.db.user.findUnique({
      where: { email },
    });
  }

  /**
   * 로그인 실패 횟수 증가
   */
  async incrementLoginFailCount(userId: bigint) {
    const user = await this.findById(userId);
    if (!user) return;

    const newFailCount = user.loginFailCount + 1;
    const MAX_FAIL_COUNT = 5;
    const LOCK_DURATION_MINUTES = 30;

    await this.db.user.update({
      where: { id: userId },
      data: {
        loginFailCount: newFailCount,
        // 5회 이상 실패 시 30분 잠금
        lockedUntil:
          newFailCount >= MAX_FAIL_COUNT
            ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000)
            : null,
      },
    });
  }

  /**
   * 로그인 실패 횟수 초기화
   */
  async resetLoginFailCount(userId: bigint) {
    await this.db.user.update({
      where: { id: userId },
      data: {
        loginFailCount: 0,
        lockedUntil: null,
      },
    });
  }

  /**
   * 마지막 로그인 시간 업데이트
   */
  async updateLastLogin(userId: bigint) {
    await this.db.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

  /**
   * Refresh Token 저장
   */
  async updateRefreshToken(
    userId: bigint,
    refreshTokenHash: string,
    refreshTokenExpiresAt: Date,
  ) {
    await this.db.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash,
        refreshTokenExpiresAt,
      },
    });
  }

  /**
   * Refresh Token 삭제 (로그아웃)
   */
  async clearRefreshToken(userId: bigint) {
    await this.db.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    });
  }

  /**
   * 사용자 목록 조회 (관리자)
   */
  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    roleCode?: string;
    isActive?: boolean;
  }) {
    const { page = 1, limit = 20, search, roleCode, isActive } = params;
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { userName: { contains: search, mode: 'insensitive' } },
        { loginId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (roleCode) where.roleCode = roleCode;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      this.db.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          loginId: true,
          userName: true,
          displayName: true,
          email: true,
          phone: true,
          roleCode: true,
          userTypeCode: true,
          departmentCode: true,
          positionCode: true,
          isActive: true,
          isAdmin: true,
          isSystemUser: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.db.user.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * 사용자 생성 (관리자)
   */
  async create(dto: CreateUserDto) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    return this.db.user.create({
      data: {
        loginId: dto.loginId,
        passwordHash,
        passwordSalt: salt,
        userName: dto.userName,
        displayName: dto.displayName,
        email: dto.email,
        phone: dto.phone,
        roleCode: dto.roleCode || 'user',
        userTypeCode: dto.userTypeCode || 'internal',
        departmentCode: dto.departmentCode,
        positionCode: dto.positionCode,
        isSystemUser: true,
        isAdmin: dto.roleCode === 'admin',
      },
    });
  }

  /**
   * 사용자 수정 (관리자)
   */
  async update(userId: bigint, dto: UpdateUserDto) {
    const updateData: Record<string, unknown> = {};

    if (dto.userName !== undefined) updateData.userName = dto.userName;
    if (dto.displayName !== undefined) updateData.displayName = dto.displayName;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.roleCode !== undefined) {
      updateData.roleCode = dto.roleCode;
      updateData.isAdmin = dto.roleCode === 'admin';
    }
    if (dto.userTypeCode !== undefined) updateData.userTypeCode = dto.userTypeCode;
    if (dto.departmentCode !== undefined) updateData.departmentCode = dto.departmentCode;
    if (dto.positionCode !== undefined) updateData.positionCode = dto.positionCode;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    if (dto.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(dto.password, salt);
      updateData.passwordSalt = salt;
    }

    return this.db.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  /**
   * 사용자 비활성화 (관리자)
   */
  async deactivate(userId: bigint) {
    return this.db.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }
}
