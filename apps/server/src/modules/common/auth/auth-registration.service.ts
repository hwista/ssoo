import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import type {
  AuthAssignableRole,
  AuthRegistrationRequestItem,
  AuthRegistrationRequestListResult,
  AuthRegistrationRequestStatus,
} from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import { DecideRegistrationRequestDto } from './dto/registration-request.dto.js';

export interface VerifiedMicrosoftIdentity {
  tenantId: string;
  subjectId: string;
  email: string;
  userPrincipalName?: string | null;
  displayName?: string | null;
  rawClaims: Record<string, string | number | boolean | null>;
}

interface RegistrationRequestRecord {
  registrationRequestId: string;
  providerCode: string;
  tenantId: string;
  subjectId: string;
  email: string;
  userPrincipalName: string | null;
  displayName: string | null;
  statusCode: string;
  requestedAt: Date;
  decidedAt: Date | null;
  decidedByUserId: bigint | null;
  decisionMemo: string | null;
  createdUserId: bigint | null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toRegistrationStatus(value: string): AuthRegistrationRequestStatus {
  if (value === 'approved' || value === 'rejected' || value === 'expired') {
    return value;
  }

  return 'pending';
}

function resolveUserName(identity: Pick<VerifiedMicrosoftIdentity, 'displayName' | 'email'>): string {
  const displayName = identity.displayName?.trim();
  if (displayName) {
    return displayName;
  }

  return identity.email.split('@')[0] || identity.email;
}

@Injectable()
export class AuthRegistrationService {
  constructor(private readonly db: DatabaseService) {}

  async listAssignableRoles(): Promise<AuthAssignableRole[]> {
    const roles = await this.db.client.role.findMany({
      where: { isActive: true },
      orderBy: [
        { sortOrder: 'asc' },
        { roleCode: 'asc' },
      ],
      select: {
        roleCode: true,
        roleName: true,
        roleScopeCode: true,
        description: true,
      },
    });

    return roles.map((role) => ({
      roleCode: role.roleCode,
      roleName: role.roleName,
      roleScopeCode: role.roleScopeCode,
      description: role.description,
    }));
  }

  private async assertActiveRole(roleCode: string): Promise<void> {
    const role = await this.db.client.role.findUnique({
      where: { roleCode },
      select: { isActive: true },
    });

    if (!role?.isActive) {
      throw new BadRequestException('활성 역할 코드가 아닙니다.');
    }
  }

  private toItem(record: RegistrationRequestRecord): AuthRegistrationRequestItem {
    return {
      registrationRequestId: record.registrationRequestId,
      providerCode: record.providerCode === 'microsoft' ? 'microsoft' : 'sso',
      tenantId: record.tenantId,
      subjectId: record.subjectId,
      email: record.email,
      userPrincipalName: record.userPrincipalName,
      displayName: record.displayName,
      statusCode: toRegistrationStatus(record.statusCode),
      requestedAt: record.requestedAt.toISOString(),
      decidedAt: record.decidedAt?.toISOString() ?? null,
      decidedByUserId: record.decidedByUserId?.toString() ?? null,
      decisionMemo: record.decisionMemo,
      createdUserId: record.createdUserId?.toString() ?? null,
    };
  }

  async listRequests(params: {
    page: number;
    limit: number;
    statusCode?: string;
  }): Promise<AuthRegistrationRequestListResult> {
    const page = Number.isFinite(params.page) && params.page > 0 ? params.page : 1;
    const limit = Number.isFinite(params.limit) && params.limit > 0 ? Math.min(params.limit, 100) : 20;
    const where = params.statusCode ? { statusCode: params.statusCode } : {};

    const [data, total] = await Promise.all([
      this.db.client.userRegistrationRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { requestedAt: 'desc' },
      }),
      this.db.client.userRegistrationRequest.count({ where }),
    ]);

    return {
      data: data.map((item) => this.toItem(item)),
      total,
      page,
      limit,
    };
  }

  async upsertMicrosoftRequest(identity: VerifiedMicrosoftIdentity): Promise<AuthRegistrationRequestItem> {
    const email = normalizeEmail(identity.email);
    const existingIdentity = await this.db.client.userExternalIdentity.findFirst({
      where: {
        providerCode: 'microsoft',
        tenantId: identity.tenantId,
        subjectId: identity.subjectId,
        isActive: true,
      },
    });

    if (existingIdentity) {
      throw new BadRequestException('이미 승인된 Microsoft 계정입니다. Microsoft 365 로그인을 사용하세요.');
    }

    const existing = await this.db.client.userRegistrationRequest.findFirst({
      where: {
        providerCode: 'microsoft',
        tenantId: identity.tenantId,
        subjectId: identity.subjectId,
      },
    });

    const data = {
      email,
      userPrincipalName: identity.userPrincipalName ?? null,
      displayName: identity.displayName ?? null,
      rawClaims: identity.rawClaims,
      statusCode: 'pending',
      requestedAt: new Date(),
      decidedAt: null,
      decidedByUserId: null,
      decisionMemo: null,
    };

    const request = existing
      ? await this.db.client.userRegistrationRequest.update({
          where: { registrationRequestId: existing.registrationRequestId },
          data,
        })
      : await this.db.client.userRegistrationRequest.create({
          data: {
            providerCode: 'microsoft',
            tenantId: identity.tenantId,
            subjectId: identity.subjectId,
            ...data,
          },
        });

    return this.toItem(request);
  }

  async approveRequest(
    registrationRequestId: string,
    dto: DecideRegistrationRequestDto,
    currentUserId: bigint,
  ): Promise<AuthRegistrationRequestItem> {
    const request = await this.db.client.userRegistrationRequest.findUnique({
      where: { registrationRequestId },
    });

    if (!request) {
      throw new NotFoundException('가입 신청을 찾을 수 없습니다.');
    }
    if (request.statusCode !== 'pending') {
      throw new BadRequestException('대기 중인 가입 신청만 승인할 수 있습니다.');
    }

    const roleCode = dto.roleCode?.trim() || 'user';
    await this.assertActiveRole(roleCode);
    const memo = dto.memo?.trim() || null;
    const passwordHash = await bcrypt.hash(`external:${randomBytes(32).toString('base64url')}`, 12);

    const approved = await this.db.client.$transaction(async (tx) => {
      let user = await tx.user.findUnique({
        where: { email: request.email },
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            userName: resolveUserName({
              displayName: request.displayName,
              email: request.email,
            }),
            displayName: request.displayName,
            email: request.email,
            roleCode,
          },
        });
      }

      const authAccount = await tx.userAuth.findUnique({
        where: { userId: user.id },
      });

      if (!authAccount) {
        await tx.userAuth.create({
          data: {
            userId: user.id,
            loginId: request.email,
            passwordHash,
            accountStatusCode: 'active',
          },
        });
      } else if (authAccount.accountStatusCode !== 'active') {
        await tx.userAuth.update({
          where: { userId: user.id },
          data: { accountStatusCode: 'active' },
        });
      }

      const existingIdentity = await tx.userExternalIdentity.findFirst({
        where: {
          providerCode: request.providerCode,
          tenantId: request.tenantId,
          subjectId: request.subjectId,
        },
      });

      if (existingIdentity) {
        await tx.userExternalIdentity.update({
          where: { externalIdentityId: existingIdentity.externalIdentityId },
          data: {
            userId: user.id,
            email: request.email,
            userPrincipalName: request.userPrincipalName,
            displayName: request.displayName,
            isActive: true,
          },
        });
      } else {
        await tx.userExternalIdentity.create({
          data: {
            userId: user.id,
            providerCode: request.providerCode,
            tenantId: request.tenantId,
            subjectId: request.subjectId,
            email: request.email,
            userPrincipalName: request.userPrincipalName,
            displayName: request.displayName,
          },
        });
      }

      return tx.userRegistrationRequest.update({
        where: { registrationRequestId },
        data: {
          statusCode: 'approved',
          decidedAt: new Date(),
          decidedByUserId: currentUserId,
          decisionMemo: memo,
          createdUserId: user.id,
        },
      });
    });

    return this.toItem(approved);
  }

  async rejectRequest(
    registrationRequestId: string,
    dto: DecideRegistrationRequestDto,
    currentUserId: bigint,
  ): Promise<AuthRegistrationRequestItem> {
    const request = await this.db.client.userRegistrationRequest.findUnique({
      where: { registrationRequestId },
    });

    if (!request) {
      throw new NotFoundException('가입 신청을 찾을 수 없습니다.');
    }
    if (request.statusCode !== 'pending') {
      throw new BadRequestException('대기 중인 가입 신청만 반려할 수 있습니다.');
    }

    const rejected = await this.db.client.userRegistrationRequest.update({
      where: { registrationRequestId },
      data: {
        statusCode: 'rejected',
        decidedAt: new Date(),
        decidedByUserId: currentUserId,
        decisionMemo: dto.memo?.trim() || null,
      },
    });

    return this.toItem(rejected);
  }
}
