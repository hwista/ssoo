import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import type {
  AuthAssignableRole,
  AuthRegistrationRequestItem,
  AuthRegistrationRequestListResult,
  AuthRegistrationRequestStatus,
} from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import { PlatformAdmissionService, type OnboardingTransaction } from '../onboarding/platform-admission.service.js';
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
  updatedAt: Date;
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
  constructor(private readonly db: DatabaseService, private readonly admission: PlatformAdmissionService) {}

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

  private async assertActiveRole(roleCode: string, tx: OnboardingTransaction): Promise<void> {
    const role = await tx.role.findUnique({
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
      updatedAt: record.updatedAt.toISOString(),
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
        orderBy: [{ requestedAt: 'desc' }, { registrationRequestId: 'desc' }],
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
    const roleCode = dto.roleCode?.trim() || 'user';
    const passwordHash = await bcrypt.hash(`external:${randomBytes(32).toString('base64url')}`, 12);
    const approved = await this.decide(currentUserId, async tx => {
      const request = await this.claimDecision(tx, registrationRequestId, dto, currentUserId, 'approved');
      await this.assertActiveRole(roleCode, tx);
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

      if (!user.isActive) throw new BadRequestException('중지된 기존 사용자입니다. 사용자 관리에서 계정 상태를 먼저 확인해 주세요.');
      await tx.platformEnrollment.upsert({ where: { userId: user.id }, create: { userId: user.id, createdBy: currentUserId, updatedBy: currentUserId, lastSource: 'auth-registration', lastActivity: 'onboarding.account-created' }, update: {} });

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
        throw new BadRequestException('중지된 기존 로그인 계정입니다. 사용자 관리에서 계정 상태를 먼저 확인해 주세요.');
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
          decisionMemo: dto.memo.trim(),
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
    const rejected = await this.decide(currentUserId, async tx => {
      await this.claimDecision(tx, registrationRequestId, dto, currentUserId, 'rejected');
      return tx.userRegistrationRequest.findUniqueOrThrow({ where: { registrationRequestId } });
    });
    return this.toItem(rejected);
  }

  private async decide<T>(actor: bigint, operation: (tx: OnboardingTransaction) => Promise<T>) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.db.client.$transaction(async tx => {
          if (!await this.admission.isPlatformAdmin(actor, tx)) throw new ForbiddenException('플랫폼 관리자만 가입 신청을 처리할 수 있습니다.');
          return operation(tx);
        }, { isolationLevel: 'Serializable' });
      } catch (error) {
        if (error instanceof Error && 'code' in error) {
          if (error.code === 'P2034' && attempt < 2) continue;
          if (error.code === 'P2034' || error.code === 'P2002') throw new ConflictException('다른 작업으로 가입 상태가 변경됐습니다. 다시 조회해 주세요.');
        }
        throw error;
      }
    }
  }

  private async claimDecision(tx: OnboardingTransaction, id: string, dto: DecideRegistrationRequestDto, actor: bigint, status: 'approved' | 'rejected') {
    if (!dto.memo?.trim()) throw new BadRequestException('가입 처리 사유를 입력해 주세요.');
    const request = await tx.userRegistrationRequest.findUnique({ where: { registrationRequestId: id } });
    if (!request) throw new NotFoundException('가입 신청을 찾을 수 없습니다.');
    if (request.statusCode !== 'pending' || request.updatedAt.getTime() !== new Date(dto.expectedUpdatedAt).getTime()) {
      throw new ConflictException('조회 후 가입 신청이 변경됐습니다. 다시 조회해 주세요.');
    }
    const claimed = await tx.userRegistrationRequest.updateMany({
      where: { registrationRequestId: id, statusCode: 'pending', updatedAt: request.updatedAt },
      data: { statusCode: status, decidedAt: new Date(), decidedByUserId: actor, decisionMemo: dto.memo.trim(), updatedBy: actor, lastSource: 'admin-registration', lastActivity: `registration.${status}` },
    });
    if (claimed.count !== 1) throw new ConflictException('다른 운영자가 이미 처리한 가입 신청입니다. 다시 조회해 주세요.');
    return request;
  }
}
