import { Injectable } from '@nestjs/common';
import type {
  PermissionExceptionAxis,
  PermissionResolutionTrace,
} from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { TokenPayload } from '../auth/interfaces/auth.interface.js';

const SYSTEM_OVERRIDE_PERMISSION_CODE = 'system.override';

interface PermissionExceptionBuckets {
  grantedPermissionCodes: Set<string>;
  revokedPermissionCodes: Set<string>;
}

interface PermissionResolutionContext {
  grantedPermissionCodes: Set<string>;
  policy: PermissionResolutionTrace;
}

interface ResolveObjectPermissionContextOptions {
  user: TokenPayload;
  targetObjectType: string;
  targetObjectId: string;
  actionContext?: PermissionResolutionContext;
  domainGrantedPermissionCodes?: Iterable<string>;
}

@Injectable()
export class AccessFoundationService {
  constructor(private readonly db: DatabaseService) {}

  async getUserOrganizationIds(userId: bigint, now: Date = new Date()): Promise<bigint[]> {
    const relations = await this.db.client.userOrganizationRelation.findMany({
      where: {
        userId,
        isActive: true,
        organization: {
          isActive: true,
          orgClass: 'permanent',
        },
        AND: [
          {
            OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }],
          },
          {
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
          },
        ],
      },
      select: {
        orgId: true,
      },
    });

    return relations.map((relation) => relation.orgId);
  }

  async resolveActionPermissionContext(user: TokenPayload): Promise<PermissionResolutionContext> {
    const now = new Date();
    const userId = BigInt(user.userId);
    const [roleCode, userOrgIds, userPermissionExceptions] = await Promise.all([
      this.getCurrentRoleCode(userId),
      this.getUserOrganizationIds(userId, now),
      this.getUserPermissionExceptions({
        userId,
        now,
        exceptionAxis: 'action',
      }),
    ]);
    const [rolePermissionCodes, organizationPermissionCodes] = await Promise.all([
      roleCode ? this.getRolePermissionCodes(roleCode) : Promise.resolve(new Set<string>()),
      userOrgIds.length > 0
        ? this.getOrganizationPermissionCodes(userOrgIds, now)
        : Promise.resolve(new Set<string>()),
    ]);
    const grantedPermissionCodes = new Set<string>([
      ...rolePermissionCodes,
      ...organizationPermissionCodes,
    ]);

    for (const permissionCode of userPermissionExceptions.grantedPermissionCodes) {
      grantedPermissionCodes.add(permissionCode);
    }

    for (const permissionCode of userPermissionExceptions.revokedPermissionCodes) {
      grantedPermissionCodes.delete(permissionCode);
    }

    const hasSystemOverride = grantedPermissionCodes.has(SYSTEM_OVERRIDE_PERMISSION_CODE);

    return {
      grantedPermissionCodes,
      policy: this.createPolicyTrace({
        hasSystemOverride,
        grantedPermissionCodes,
        rolePermissionCodes,
        organizationPermissionCodes,
        userGrantedPermissionCodes: userPermissionExceptions.grantedPermissionCodes,
        userRevokedPermissionCodes: userPermissionExceptions.revokedPermissionCodes,
      }),
    };
  }

  async resolveObjectPermissionContext(
    options: ResolveObjectPermissionContextOptions,
  ): Promise<PermissionResolutionContext> {
    const now = new Date();
    const userId = BigInt(options.user.userId);
    const actionContext =
      options.actionContext ?? await this.resolveActionPermissionContext(options.user);
    const grantedPermissionCodes = new Set(actionContext.grantedPermissionCodes);
    const domainGrantedPermissionCodes = new Set(options.domainGrantedPermissionCodes ?? []);

    for (const permissionCode of domainGrantedPermissionCodes) {
      grantedPermissionCodes.add(permissionCode);
    }

    const objectPermissionExceptions = await this.getUserPermissionExceptions({
      userId,
      now,
      exceptionAxis: 'object',
      targetObjectType: options.targetObjectType,
      targetObjectId: options.targetObjectId,
    });

    for (const permissionCode of objectPermissionExceptions.grantedPermissionCodes) {
      grantedPermissionCodes.add(permissionCode);
    }

    for (const permissionCode of objectPermissionExceptions.revokedPermissionCodes) {
      grantedPermissionCodes.delete(permissionCode);
    }

    return {
      grantedPermissionCodes,
      policy: {
        ...actionContext.policy,
        grantedPermissionCodes: this.toSortedCodes(grantedPermissionCodes),
        domainGrantedPermissionCodes: this.toSortedCodes(domainGrantedPermissionCodes),
        objectGrantedPermissionCodes: this.toSortedCodes(
          objectPermissionExceptions.grantedPermissionCodes,
        ),
        objectRevokedPermissionCodes: this.toSortedCodes(
          objectPermissionExceptions.revokedPermissionCodes,
        ),
      },
    };
  }

  private createPolicyTrace(options: {
    hasSystemOverride: boolean;
    grantedPermissionCodes: Iterable<string>;
    rolePermissionCodes?: Iterable<string>;
    organizationPermissionCodes?: Iterable<string>;
    userGrantedPermissionCodes?: Iterable<string>;
    userRevokedPermissionCodes?: Iterable<string>;
    domainGrantedPermissionCodes?: Iterable<string>;
    objectGrantedPermissionCodes?: Iterable<string>;
    objectRevokedPermissionCodes?: Iterable<string>;
  }): PermissionResolutionTrace {
    return {
      hasSystemOverride: options.hasSystemOverride,
      grantedPermissionCodes: this.toSortedCodes(options.grantedPermissionCodes),
      rolePermissionCodes: this.toSortedCodes(options.rolePermissionCodes),
      organizationPermissionCodes: this.toSortedCodes(options.organizationPermissionCodes),
      userGrantedPermissionCodes: this.toSortedCodes(options.userGrantedPermissionCodes),
      userRevokedPermissionCodes: this.toSortedCodes(options.userRevokedPermissionCodes),
      domainGrantedPermissionCodes: this.toSortedCodes(options.domainGrantedPermissionCodes),
      objectGrantedPermissionCodes: this.toSortedCodes(options.objectGrantedPermissionCodes),
      objectRevokedPermissionCodes: this.toSortedCodes(options.objectRevokedPermissionCodes),
    };
  }

  private toSortedCodes(codes?: Iterable<string>): string[] {
    return Array.from(new Set(codes ?? [])).sort((left, right) => left.localeCompare(right));
  }

  private async getCurrentRoleCode(userId: bigint): Promise<string | null> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        roleCode: true,
      },
    });

    return user?.roleCode ?? null;
  }

  private async getRolePermissionCodes(roleCode: string): Promise<Set<string>> {
    const rolePermissions = await this.db.client.rolePermission.findMany({
      where: {
        isActive: true,
        role: {
          roleCode,
          isActive: true,
        },
      },
      select: {
        permission: {
          select: {
            permissionCode: true,
          },
        },
      },
    });

    return new Set(
      rolePermissions.map((relation) => relation.permission.permissionCode),
    );
  }

  private async getOrganizationPermissionCodes(
    orgIds: bigint[],
    now: Date,
  ): Promise<Set<string>> {
    const organizationPermissions = await this.db.client.organizationPermission.findMany({
      where: {
        orgId: { in: orgIds },
        isActive: true,
        organization: {
          isActive: true,
          orgClass: 'permanent',
        },
        AND: [
          {
            OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }],
          },
          {
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
          },
        ],
      },
      select: {
        permission: {
          select: {
            permissionCode: true,
          },
        },
      },
    });

    return new Set(
      organizationPermissions.map((relation) => relation.permission.permissionCode),
    );
  }

  private async getUserPermissionExceptions(options: {
    userId: bigint;
    now: Date;
    exceptionAxis: PermissionExceptionAxis;
    targetObjectType?: string;
    targetObjectId?: string;
  }): Promise<PermissionExceptionBuckets> {
    const permissionExceptions = await this.db.client.userPermissionException.findMany({
      where: {
        userId: options.userId,
        isActive: true,
        exceptionAxis: options.exceptionAxis,
        targetOrgId: options.exceptionAxis === 'action' ? null : undefined,
        targetObjectType:
          options.exceptionAxis === 'action' ? null : options.targetObjectType,
        targetObjectId:
          options.exceptionAxis === 'action' ? null : options.targetObjectId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: options.now } }],
      },
      select: {
        effectType: true,
        permission: {
          select: {
            permissionCode: true,
          },
        },
      },
    });

    const grantedPermissionCodes = new Set<string>();
    const revokedPermissionCodes = new Set<string>();

    for (const exception of permissionExceptions) {
      if (exception.effectType === 'revoke') {
        revokedPermissionCodes.add(exception.permission.permissionCode);
        continue;
      }

      grantedPermissionCodes.add(exception.permission.permissionCode);
    }

    return {
      grantedPermissionCodes,
      revokedPermissionCodes,
    };
  }
}
