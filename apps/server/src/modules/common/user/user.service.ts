import { BadRequestException, Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { AuthUserRecord } from '../auth/interfaces/auth.interface.js';
import { DatabaseService } from '../../../database/database.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

type PrimaryAffiliationType = 'internal' | 'external';

interface AuthAccountWithUserRecord {
  userId: bigint;
  loginId: string;
  passwordHash: string;
  accountStatusCode: string;
  lastLoginAt: Date | null;
  loginFailCount: number;
  lockedUntil: Date | null;
  user: {
    id: bigint;
    roleCode: string;
    isActive: boolean;
  };
}

interface LegacyOrganizationUserRecord {
  id: bigint;
  departmentCode: string | null;
  positionCode: string | null;
  employeeNumber: string | null;
  companyName: string | null;
  customerId: bigint | null;
  isActive: boolean;
  memo: string | null;
  organizationRelations: Array<{
    organization: {
      orgType: string;
      scope: string;
    };
  }>;
}

interface CustomerOrganizationRecord {
  customerCode: string;
  customerName: string;
}

interface AdminUserViewRecord {
  id: bigint;
  userName: string;
  displayName: string | null;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  roleCode: string;
  departmentCode: string | null;
  positionCode: string | null;
  employeeNumber: string | null;
  companyName: string | null;
  customerId: bigint | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  authAccount: {
    loginId: string;
    lastLoginAt: Date | null;
  } | null;
  organizationRelations: Array<{
    organization: {
      orgType: string;
      scope: string;
    };
  }>;
}

interface ProfileUserViewRecord {
  id: bigint;
  userName: string;
  displayName: string | null;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  departmentCode: string | null;
  positionCode: string | null;
  authAccount: {
    loginId: string;
    lastLoginAt: Date | null;
  } | null;
}

const authAccountUserSelect = {
  id: true,
  roleCode: true,
  isActive: true,
} as const;

const legacyBridgePrimaryOrganizationRelationSelect = {
  where: {
    isActive: true,
    isPrimary: true,
    organization: {
      isActive: true,
      orgClass: 'permanent',
    },
    memo: {
      startsWith: 'Backfilled from legacy',
    },
  },
  orderBy: {
    userOrgRelationId: 'desc',
  },
  take: 1,
  select: {
    organization: {
      select: {
        orgType: true,
        scope: true,
      },
    },
  },
} as const;

const adminUserViewSelect = {
  id: true,
  userName: true,
  displayName: true,
  email: true,
  phone: true,
  avatarUrl: true,
  roleCode: true,
  departmentCode: true,
  positionCode: true,
  employeeNumber: true,
  companyName: true,
  customerId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  authAccount: {
    select: {
      loginId: true,
      lastLoginAt: true,
    },
  },
  organizationRelations: legacyBridgePrimaryOrganizationRelationSelect,
} as const;

const profileUserViewSelect = {
  id: true,
  userName: true,
  displayName: true,
  email: true,
  phone: true,
  avatarUrl: true,
  departmentCode: true,
  positionCode: true,
  authAccount: {
    select: {
      loginId: true,
      lastLoginAt: true,
    },
  },
} as const;

@Injectable()
export class UserService {
  constructor(private readonly db: DatabaseService) {}

  private readonly organizationBridgeSource = 'legacy-user-bridge';
  private readonly organizationBridgeActivity = 'user.service.sync-organization-foundation';
  private readonly organizationBridgeMemoPrefix = 'Backfilled from legacy';

  private normalizeOptionalText(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private toFallbackExternalOrgCode(companyName: string): string {
    const normalized = companyName
      .trim()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `EXT-${normalized || 'UNKNOWN'}`;
  }

  private normalizePrimaryAffiliationType(
    value: string | null | undefined,
  ): PrimaryAffiliationType | null {
    return value === 'internal' || value === 'external' ? value : null;
  }

  private toOptionalBigInt(value: string | null | undefined): bigint | null {
    const normalized = this.normalizeOptionalText(value);
    if (!normalized) {
      return null;
    }

    try {
      return BigInt(normalized);
    } catch {
      throw new BadRequestException('고객사 ID 형식이 올바르지 않습니다.');
    }
  }

  private getCurrentPrimaryAffiliationType(
    relations: Array<{ organization: { orgType: string; scope: string } }>,
  ): PrimaryAffiliationType | null {
    return this.normalizePrimaryAffiliationType(relations[0]?.organization.scope)
      ?? this.normalizePrimaryAffiliationType(relations[0]?.organization.orgType);
  }

  private derivePrimaryAffiliationType(options: {
    departmentCode: string | null;
    companyName: string | null;
    customerId: bigint | null;
    requestedPrimaryAffiliationType?: string | null;
    currentPrimaryAffiliationType?: string | null;
  }): PrimaryAffiliationType | null {
    const hasInternalAffiliation = Boolean(this.normalizeOptionalText(options.departmentCode));
    const hasExternalAffiliation = Boolean(
      options.customerId || this.normalizeOptionalText(options.companyName),
    );
    const requestedPrimaryAffiliationType =
      this.normalizePrimaryAffiliationType(options.requestedPrimaryAffiliationType);

    if (requestedPrimaryAffiliationType === 'internal' && hasInternalAffiliation) {
      return 'internal';
    }

    if (requestedPrimaryAffiliationType === 'external' && hasExternalAffiliation) {
      return 'external';
    }

    const currentPrimaryAffiliationType =
      this.normalizePrimaryAffiliationType(options.currentPrimaryAffiliationType);

    if (currentPrimaryAffiliationType === 'internal' && hasInternalAffiliation) {
      return 'internal';
    }

    if (currentPrimaryAffiliationType === 'external' && hasExternalAffiliation) {
      return 'external';
    }

    if (hasInternalAffiliation && !hasExternalAffiliation) {
      return 'internal';
    }

    if (!hasInternalAffiliation && hasExternalAffiliation) {
      return 'external';
    }

    if (hasInternalAffiliation && hasExternalAffiliation) {
      return 'internal';
    }

    return null;
  }

  private toAuthUserRecord(authAccount: AuthAccountWithUserRecord): AuthUserRecord {
    return {
      userId: authAccount.userId,
      loginId: authAccount.loginId,
      passwordHash: authAccount.passwordHash,
      accountStatusCode: authAccount.accountStatusCode,
      lastLoginAt: authAccount.lastLoginAt,
      loginFailCount: authAccount.loginFailCount,
      lockedUntil: authAccount.lockedUntil,
      roleCode: authAccount.user.roleCode,
      isActive: authAccount.user.isActive,
    };
  }

  private toAdminUserView(user: AdminUserViewRecord) {
    return {
      id: user.id,
      loginId: user.authAccount?.loginId ?? '',
      userName: user.userName,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      roleCode: user.roleCode,
      departmentCode: user.departmentCode,
      positionCode: user.positionCode,
      employeeNumber: user.employeeNumber,
      companyName: user.companyName,
      customerId: user.customerId,
      primaryAffiliationType: this.derivePrimaryAffiliationType({
        departmentCode: user.departmentCode,
        companyName: user.companyName,
        customerId: user.customerId,
        currentPrimaryAffiliationType: this.getCurrentPrimaryAffiliationType(
          user.organizationRelations,
        ),
      }),
      isActive: user.isActive,
      isSystemUser: user.authAccount !== null,
      lastLoginAt: user.authAccount?.lastLoginAt ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private toProfileUserView(user: ProfileUserViewRecord) {
    return {
      id: user.id,
      loginId: user.authAccount?.loginId ?? '',
      userName: user.userName,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      departmentCode: user.departmentCode,
      positionCode: user.positionCode,
      lastLoginAt: user.authAccount?.lastLoginAt ?? null,
    };
  }

  private async findAdminUserView(userId: bigint): Promise<AdminUserViewRecord | null> {
    return this.db.user.findUnique({
      where: { id: userId },
      select: adminUserViewSelect,
    });
  }

  private async findProfileUserView(userId: bigint): Promise<ProfileUserViewRecord | null> {
    return this.db.user.findUnique({
      where: { id: userId },
      select: profileUserViewSelect,
    });
  }

  private async findAuthAccountByLoginIdRecord(loginId: string): Promise<AuthAccountWithUserRecord | null> {
    return this.db.client.userAuth.findUnique({
      where: { loginId },
      include: {
        user: {
          select: authAccountUserSelect,
        },
      },
    });
  }

  private async findAuthAccountByUserIdRecord(userId: bigint): Promise<AuthAccountWithUserRecord | null> {
    return this.db.client.userAuth.findUnique({
      where: { userId },
      include: {
        user: {
          select: authAccountUserSelect,
        },
      },
    });
  }

  private async loadLegacyOrganizationUser(userId: bigint): Promise<LegacyOrganizationUserRecord | null> {
    return this.db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        departmentCode: true,
        positionCode: true,
        employeeNumber: true,
        companyName: true,
        customerId: true,
        isActive: true,
        memo: true,
        organizationRelations: legacyBridgePrimaryOrganizationRelationSelect,
      },
    });
  }

  private async loadCustomerOrganization(customerId: bigint | null): Promise<CustomerOrganizationRecord | null> {
    if (!customerId) {
      return null;
    }

    const customer = await this.db.client.customer.findUnique({
      where: { id: customerId },
      select: {
        customerCode: true,
        customerName: true,
      },
    });

    return customer ?? null;
  }

  private async ensureOrganization(params: {
    orgCode: string;
    orgName: string;
    orgType: 'internal' | 'external';
    scope: PrimaryAffiliationType;
    levelType?: 'corporation' | 'middle' | 'department' | null;
    memo: string;
  }) {
    return this.db.client.organization.upsert({
      where: { orgCode: params.orgCode },
      update: {
        orgName: params.orgName,
        orgType: params.orgType,
        orgClass: 'permanent',
        scope: params.scope,
        levelType: params.levelType ?? null,
        isActive: true,
        memo: params.memo,
        lastSource: this.organizationBridgeSource,
        lastActivity: this.organizationBridgeActivity,
      },
      create: {
        orgCode: params.orgCode,
        orgName: params.orgName,
        orgType: params.orgType,
        orgClass: 'permanent',
        scope: params.scope,
        levelType: params.levelType ?? null,
        isActive: true,
        memo: params.memo,
        lastSource: this.organizationBridgeSource,
        lastActivity: this.organizationBridgeActivity,
      },
      select: {
        orgId: true,
      },
    });
  }

  private async upsertOrganizationRelation(params: {
    userId: bigint;
    orgId: bigint;
    isPrimary: boolean;
    isLeader?: boolean;
    affiliationRole: string | null;
    positionCode: string | null;
    employeeNumber: string | null;
    isActive: boolean;
    memo: string;
  }): Promise<void> {
    const existing = await this.db.client.userOrganizationRelation.findFirst({
      where: {
        userId: params.userId,
        orgId: params.orgId,
        memo: {
          startsWith: this.organizationBridgeMemoPrefix,
        },
      },
      orderBy: {
        userOrgRelationId: 'desc',
      },
      select: {
        userOrgRelationId: true,
      },
    });

    const relationData = {
      isPrimary: params.isPrimary,
      isLeader: params.isLeader ?? false,
      affiliationRole: params.affiliationRole,
      positionCode: params.positionCode,
      employeeNumber: params.employeeNumber,
      effectiveFrom: null,
      effectiveTo: params.isActive ? null : new Date(),
      isActive: params.isActive,
      memo: params.memo,
      lastSource: this.organizationBridgeSource,
      lastActivity: this.organizationBridgeActivity,
    };

    if (existing) {
      await this.db.client.userOrganizationRelation.update({
        where: {
          userOrgRelationId: existing.userOrgRelationId,
        },
        data: relationData,
      });
      return;
    }

    await this.db.client.userOrganizationRelation.create({
      data: {
        userId: params.userId,
        orgId: params.orgId,
        ...relationData,
      },
    });
  }

  async syncOrganizationFoundation(
    userId: bigint,
    options?: {
      preferredPrimaryAffiliationType?: string | null;
    },
  ): Promise<void> {
    const user = await this.loadLegacyOrganizationUser(userId);
    if (!user) {
      return;
    }

    const activeOrgIds: bigint[] = [];
    const departmentCode = this.normalizeOptionalText(user.departmentCode);
    const positionCode = this.normalizeOptionalText(user.positionCode);
    const employeeNumber = this.normalizeOptionalText(user.employeeNumber);
    const companyName = this.normalizeOptionalText(user.companyName);
    const customer = await this.loadCustomerOrganization(user.customerId);
    const hasExternalAffiliation = Boolean(customer || companyName);
    const primaryAffiliationType = this.derivePrimaryAffiliationType({
      departmentCode,
      companyName,
      customerId: user.customerId,
      requestedPrimaryAffiliationType: options?.preferredPrimaryAffiliationType ?? null,
      currentPrimaryAffiliationType: this.getCurrentPrimaryAffiliationType(
        user.organizationRelations,
      ),
    });
    const externalIsPrimary = hasExternalAffiliation && primaryAffiliationType === 'external';
    const internalIsPrimary = Boolean(departmentCode) && primaryAffiliationType === 'internal';

    if (departmentCode) {
      const internalOrg = await this.ensureOrganization({
        orgCode: departmentCode,
        orgName: departmentCode,
        orgType: 'internal',
        scope: 'internal',
        levelType: 'department',
        memo: 'Legacy department bridge organization',
      });

      activeOrgIds.push(internalOrg.orgId);
      await this.upsertOrganizationRelation({
        userId,
        orgId: internalOrg.orgId,
        isPrimary: internalIsPrimary,
        isLeader: false,
        affiliationRole: primaryAffiliationType === 'internal' ? 'internal' : null,
        positionCode,
        employeeNumber,
        isActive: user.isActive,
        memo: 'Backfilled from legacy internal affiliation',
      });
    }

    if (customer || companyName) {
      const externalOrg = await this.ensureOrganization({
        orgCode: customer?.customerCode ?? this.toFallbackExternalOrgCode(companyName ?? 'external'),
        orgName: customer?.customerName ?? companyName ?? 'External Organization',
        orgType: 'external',
        scope: 'external',
        levelType: null,
        memo: customer
          ? 'Backfilled from legacy customer organization'
          : 'Backfilled from legacy company affiliation',
      });

      activeOrgIds.push(externalOrg.orgId);
      await this.upsertOrganizationRelation({
        userId,
        orgId: externalOrg.orgId,
        isPrimary: externalIsPrimary,
        isLeader: false,
        affiliationRole: primaryAffiliationType === 'external' ? 'external' : null,
        positionCode,
        employeeNumber,
        isActive: user.isActive,
        memo: customer
          ? 'Backfilled from legacy external customer affiliation'
          : 'Backfilled from legacy external company affiliation',
      });
    }

    if (activeOrgIds.length > 0) {
      await this.db.client.userOrganizationRelation.updateMany({
        where: {
          userId,
          isActive: true,
          memo: {
            startsWith: this.organizationBridgeMemoPrefix,
          },
          orgId: {
            notIn: activeOrgIds,
          },
        },
        data: {
          isActive: false,
          effectiveTo: new Date(),
          lastActivity: `${this.organizationBridgeActivity}.deactivate`,
        },
      });
      return;
    }

    await this.db.client.userOrganizationRelation.updateMany({
      where: {
        userId,
        isActive: true,
        memo: {
          startsWith: this.organizationBridgeMemoPrefix,
        },
      },
      data: {
        isActive: false,
        effectiveTo: new Date(),
        lastActivity: `${this.organizationBridgeActivity}.deactivate`,
      },
    });
  }

  async findAuthUserByLoginId(loginId: string): Promise<AuthUserRecord | null> {
    const authAccount = await this.findAuthAccountByLoginIdRecord(loginId);
    return authAccount ? this.toAuthUserRecord(authAccount) : null;
  }

  async findAuthUserById(userId: bigint): Promise<AuthUserRecord | null> {
    const authAccount = await this.findAuthAccountByUserIdRecord(userId);
    return authAccount ? this.toAuthUserRecord(authAccount) : null;
  }

  async findProfileById(userId: bigint) {
    const user = await this.findProfileUserView(userId);
    return user ? this.toProfileUserView(user) : null;
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
    const authUser = await this.findAuthUserById(userId);
    if (!authUser) return;

    const newFailCount = authUser.loginFailCount + 1;
    const MAX_FAIL_COUNT = 5;
    const LOCK_DURATION_MINUTES = 30;

    await this.db.client.userAuth.update({
      where: { userId },
      data: {
        loginFailCount: newFailCount,
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
    const authUser = await this.findAuthUserById(userId);
    if (!authUser) return;

    await this.db.client.userAuth.update({
      where: { userId },
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
    const authUser = await this.findAuthUserById(userId);
    if (!authUser) return;

    await this.db.client.userAuth.update({
      where: { userId },
      data: {
        lastLoginAt: new Date(),
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
        { authAccount: { is: { loginId: { contains: search, mode: 'insensitive' } } } },
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
        select: adminUserViewSelect,
      }),
      this.db.user.count({ where }),
    ]);

    return { data: data.map((user) => this.toAdminUserView(user)), total };
  }

  /**
   * 사용자 생성 (관리자)
   */
  async create(dto: CreateUserDto) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);
    const departmentCode = this.normalizeOptionalText(dto.departmentCode);
    const positionCode = this.normalizeOptionalText(dto.positionCode);
    const employeeNumber = this.normalizeOptionalText(dto.employeeNumber);
    const companyName = this.normalizeOptionalText(dto.companyName);
    const customerId = this.toOptionalBigInt(dto.customerId);
    const user = await this.db.client.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          userName: dto.userName,
          displayName: dto.displayName,
          email: dto.email,
          phone: dto.phone,
          roleCode: dto.roleCode || 'user',
          departmentCode,
          positionCode,
          employeeNumber,
          companyName,
          customerId,
        },
      });

      await tx.userAuth.create({
        data: {
          userId: createdUser.id,
          loginId: dto.loginId,
          passwordHash,
          accountStatusCode: 'active',
        },
      });

      return createdUser;
    });

    await this.syncOrganizationFoundation(user.id, {
      preferredPrimaryAffiliationType: dto.primaryAffiliationType ?? null,
    });

    const createdUser = await this.findAdminUserView(user.id);
    if (!createdUser) {
      throw new Error('생성된 사용자를 다시 조회할 수 없습니다.');
    }

    return this.toAdminUserView(createdUser);
  }

  /**
   * 사용자 수정 (관리자)
   */
  async update(userId: bigint, dto: UpdateUserDto) {
    const updateData: Record<string, unknown> = {};
    let passwordHash: string | null = null;

    if (dto.userName !== undefined) updateData.userName = dto.userName;
    if (dto.displayName !== undefined) updateData.displayName = dto.displayName;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.roleCode !== undefined) {
      updateData.roleCode = dto.roleCode;
    }
    if (dto.departmentCode !== undefined) {
      updateData.departmentCode = this.normalizeOptionalText(dto.departmentCode);
    }
    if (dto.positionCode !== undefined) {
      updateData.positionCode = this.normalizeOptionalText(dto.positionCode);
    }
    if (dto.employeeNumber !== undefined) {
      updateData.employeeNumber = this.normalizeOptionalText(dto.employeeNumber);
    }
    if (dto.companyName !== undefined) {
      updateData.companyName = this.normalizeOptionalText(dto.companyName);
    }
    if (dto.customerId !== undefined) {
      updateData.customerId = this.toOptionalBigInt(dto.customerId);
    }
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    if (dto.password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(dto.password, salt);
    }

    if (passwordHash) {
      const authAccount = await this.db.client.userAuth.findUnique({
        where: { userId },
        select: { userId: true },
      });

      if (!authAccount) {
        throw new BadRequestException('로그인 계정이 없는 사용자입니다.');
      }
    }

    await this.db.client.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: updateData,
      });

      if (passwordHash) {
        await tx.userAuth.update({
          where: { userId },
          data: {
            passwordHash,
          },
        });
      }
    });

    await this.syncOrganizationFoundation(userId, {
      preferredPrimaryAffiliationType: dto.primaryAffiliationType ?? null,
    });

    const updatedUser = await this.findAdminUserView(userId);
    if (!updatedUser) {
      throw new Error('수정된 사용자를 다시 조회할 수 없습니다.');
    }

    return this.toAdminUserView(updatedUser);
  }

  /**
   * 사용자 비활성화 (관리자)
   */
  async deactivate(userId: bigint) {
    await this.db.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    await this.syncOrganizationFoundation(userId);

    const deactivatedUser = await this.findAdminUserView(userId);
    if (!deactivatedUser) {
      throw new Error('비활성화된 사용자를 다시 조회할 수 없습니다.');
    }

    return this.toAdminUserView(deactivatedUser);
  }
}
