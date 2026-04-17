import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AccessInspectionResult,
  PermissionExceptionAxis,
  PermissionExceptionListResult,
  PermissionExceptionRecord,
} from '@ssoo/types/common';
import { toIdString } from '../../../common/utils/bigint.util.js';
import { DatabaseService } from '../../../database/database.service.js';
import type { TokenPayload } from '../auth/interfaces/auth.interface.js';
import { AccessFoundationService } from './access-foundation.service.js';
import type { InspectAccessQueryDto } from './dto/inspect-access.query.dto.js';
import type { ListPermissionExceptionsQueryDto } from './dto/list-permission-exceptions.query.dto.js';

type AccessSubjectRow = Awaited<ReturnType<AccessOperationsService['findSubjectOrThrow']>>;

@Injectable()
export class AccessOperationsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly accessFoundationService: AccessFoundationService,
  ) {}

  async inspectAccess(query: InspectAccessQueryDto): Promise<AccessInspectionResult> {
    this.assertSubjectSelector(query.userId, query.loginId);
    this.assertObjectSelector(query.targetObjectType, query.targetObjectId);

    const subject = await this.findSubjectOrThrow(query.userId, query.loginId);
    const tokenPayload = this.toTokenPayload(subject, query.loginId);
    const organizationIds = await this.accessFoundationService.getUserOrganizationIds(subject.id);
    const actionContext =
      await this.accessFoundationService.resolveActionPermissionContext(tokenPayload);
    const domainPermissionCodes = this.parseDomainPermissionCodes(query.domainPermissionCodes);
    const objectContext = query.targetObjectType && query.targetObjectId
      ? await this.accessFoundationService.resolveObjectPermissionContext({
          user: tokenPayload,
          targetObjectType: query.targetObjectType,
          targetObjectId: query.targetObjectId,
          actionContext,
          domainGrantedPermissionCodes: domainPermissionCodes,
        })
      : null;
    const includeInactive = query.includeInactive === true;
    const actionExceptions = await this.listPermissionExceptionRecords({
      userId: subject.id,
      exceptionAxis: 'action',
      includeInactive,
      limit: 500,
    });
    const objectExceptions = await this.listPermissionExceptionRecords({
      userId: subject.id,
      exceptionAxis: 'object',
      targetObjectType: query.targetObjectType,
      targetObjectId: query.targetObjectId,
      includeInactive,
      limit: 500,
    });

    return {
      subject: {
        userId: toIdString(subject.id),
        loginId: subject.authAccount?.loginId ?? query.loginId ?? toIdString(subject.id),
        userName: subject.userName,
        displayName: subject.displayName,
        roleCode: subject.roleCode,
        isActive: subject.isActive,
      },
      organizationIds: organizationIds
        .map((orgId) => toIdString(orgId))
        .sort((left, right) => left.localeCompare(right)),
      input: {
        targetObjectType: query.targetObjectType ?? null,
        targetObjectId: query.targetObjectId ?? null,
        domainPermissionCodes,
        includeInactive,
      },
      action: {
        grantedPermissionCodes: Array.from(actionContext.grantedPermissionCodes).sort((left, right) =>
          left.localeCompare(right),
        ),
        policy: actionContext.policy,
      },
      object: objectContext
        ? {
            targetObjectType: query.targetObjectType!,
            targetObjectId: query.targetObjectId!,
            domainPermissionCodes,
            grantedPermissionCodes: Array.from(objectContext.grantedPermissionCodes).sort(
              (left, right) => left.localeCompare(right),
            ),
            policy: objectContext.policy,
          }
        : null,
      permissionExceptions: {
        action: actionExceptions,
        object: objectExceptions,
      },
    };
  }

  async listPermissionExceptions(
    query: ListPermissionExceptionsQueryDto,
  ): Promise<PermissionExceptionListResult> {
    this.assertObjectSelector(query.targetObjectType, query.targetObjectId);

    let subject: AccessSubjectRow | null = null;
    if (query.userId || query.loginId) {
      subject = await this.findSubjectOrThrow(query.userId, query.loginId);
    }

    const limit = Math.min(query.limit ?? 100, 500);
    const includeInactive = query.includeInactive === true;
    const items = await this.listPermissionExceptionRecords({
      userId: subject?.id,
      exceptionAxis: query.exceptionAxis,
      targetObjectType: query.targetObjectType,
      targetObjectId: query.targetObjectId,
      permissionCode: query.permissionCode,
      includeInactive,
      limit,
    });

    return {
      filters: {
        userId: subject ? toIdString(subject.id) : query.userId ?? null,
        loginId: subject?.authAccount?.loginId ?? query.loginId ?? null,
        exceptionAxis: query.exceptionAxis ?? null,
        targetObjectType: query.targetObjectType ?? null,
        targetObjectId: query.targetObjectId ?? null,
        permissionCode: query.permissionCode ?? null,
        includeInactive,
        limit,
      },
      total: items.length,
      items,
    };
  }

  private assertSubjectSelector(userId?: string, loginId?: string): void {
    if (userId || loginId) {
      return;
    }

    throw new BadRequestException('userId 또는 loginId 중 하나는 필수입니다.');
  }

  private assertObjectSelector(targetObjectType?: string, targetObjectId?: string): void {
    if ((!targetObjectType && !targetObjectId) || (targetObjectType && targetObjectId)) {
      return;
    }

    throw new BadRequestException(
      'targetObjectType 와 targetObjectId 는 함께 전달해야 합니다.',
    );
  }

  private parseDomainPermissionCodes(raw?: string): string[] {
    if (!raw) {
      return [];
    }

    return Array.from(
      new Set(
        raw
          .split(',')
          .map((code) => code.trim())
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right));
  }

  private toTokenPayload(subject: AccessSubjectRow, loginId?: string): TokenPayload {
    return {
      userId: toIdString(subject.id),
      loginId: subject.authAccount?.loginId ?? loginId ?? toIdString(subject.id),
    };
  }

  private async findSubjectOrThrow(userId?: string, loginId?: string) {
    const where = userId
      ? {
          id: this.parseUserId(userId),
          ...(loginId ? { authAccount: { loginId } } : {}),
        }
      : {
          authAccount: { loginId: loginId! },
        };

    const subject = await this.db.client.user.findFirst({
      where,
        select: {
          id: true,
          userName: true,
          displayName: true,
          roleCode: true,
          isActive: true,
          authAccount: {
            select: {
            loginId: true,
          },
        },
      },
    });

    if (!subject) {
      throw new NotFoundException('대상 사용자를 찾을 수 없습니다.');
    }

    return subject;
  }

  private parseUserId(userId: string): bigint {
    try {
      return BigInt(userId);
    } catch {
      throw new BadRequestException('userId 는 BigInt string 이어야 합니다.');
    }
  }

  private async listPermissionExceptionRecords(options: {
    userId?: bigint;
    exceptionAxis?: PermissionExceptionAxis;
    targetObjectType?: string;
    targetObjectId?: string;
    permissionCode?: string;
    includeInactive: boolean;
    limit: number;
  }): Promise<PermissionExceptionRecord[]> {
    const now = new Date();
    const permissionExceptions = await this.db.client.userPermissionException.findMany({
      where: {
        ...(options.userId ? { userId: options.userId } : {}),
        ...(options.exceptionAxis ? { exceptionAxis: options.exceptionAxis } : {}),
        ...(options.targetObjectType ? { targetObjectType: options.targetObjectType } : {}),
        ...(options.targetObjectId ? { targetObjectId: options.targetObjectId } : {}),
        ...(options.permissionCode
          ? {
              permission: {
                permissionCode: options.permissionCode,
              },
            }
          : {}),
        ...(options.includeInactive
          ? {}
          : {
              isActive: true,
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            }),
      },
      select: {
        userPermissionExceptionId: true,
        exceptionAxis: true,
        effectType: true,
        targetOrgId: true,
        targetObjectType: true,
        targetObjectId: true,
        appliedByUserId: true,
        appliedAt: true,
        expiresAt: true,
        reason: true,
        memo: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            userName: true,
            displayName: true,
            roleCode: true,
            authAccount: {
              select: {
                loginId: true,
              },
            },
          },
        },
        permission: {
          select: {
            permissionCode: true,
            permissionName: true,
          },
        },
        targetOrganization: {
          select: {
            orgId: true,
            orgName: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { userPermissionExceptionId: 'desc' }],
      take: options.limit,
    });

    return permissionExceptions.map((exception) => ({
      id: toIdString(exception.userPermissionExceptionId),
      userId: toIdString(exception.user.id),
      loginId: exception.user.authAccount?.loginId ?? null,
      userName: exception.user.userName,
      displayName: exception.user.displayName,
      roleCode: exception.user.roleCode,
      permissionCode: exception.permission.permissionCode,
      permissionName: exception.permission.permissionName,
      exceptionAxis: exception.exceptionAxis as PermissionExceptionAxis,
      effectType: exception.effectType as 'grant' | 'revoke',
      targetOrgId: exception.targetOrgId ? toIdString(exception.targetOrgId) : null,
      targetOrgName: exception.targetOrganization?.orgName ?? null,
      targetObjectType: exception.targetObjectType,
      targetObjectId: exception.targetObjectId,
      appliedByUserId: exception.appliedByUserId ? toIdString(exception.appliedByUserId) : null,
      appliedAt: this.toIsoString(exception.appliedAt),
      expiresAt: this.toIsoString(exception.expiresAt),
      reason: exception.reason,
      memo: exception.memo,
      isActive: exception.isActive,
      createdAt: exception.createdAt.toISOString(),
      updatedAt: exception.updatedAt.toISOString(),
    }));
  }

  private toIsoString(value: Date | null): string | null {
    return value ? value.toISOString() : null;
  }
}
