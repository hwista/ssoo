import type { OnboardingServiceCode } from '@ssoo/types/common';
import { PlatformAdmissionService } from '../onboarding/platform-admission.service.js';
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
  roleCode: string | null;
}

interface ResolveObjectPermissionContextOptions {
  user: TokenPayload;
  targetObjectType: string;
  targetObjectId: string;
  targetOrganizationId?: bigint | null;
  actionContext?: PermissionResolutionContext;
  domainGrantedPermissionCodes?: Iterable<string>;
}

@Injectable()
export class AccessFoundationService {
  constructor(private readonly db: DatabaseService, private readonly admission: PlatformAdmissionService = new PlatformAdmissionService(db)) {}

  async getBusinessOrganizationScope(userId: bigint, service: 'pms' | 'crm'): Promise<bigint[] | null> {
    if (await this.admission.isPlatformAdmin(userId)) return null;
    const grants = (await this.admission.grants(userId)).filter((grant) => grant.serviceCode === service);
    // Explicit migration evidence preserves the pre-onboarding object policy.
    if (grants.some((grant) => grant.sourceCode === 'migration' || grant.sourceCode === 'bootstrap')) return null;
    return [...new Set(grants.flatMap((grant) => grant.orgId === null ? [] : [grant.orgId]))];
  }

  async getServiceRoleCodes(userId: bigint, service: OnboardingServiceCode): Promise<string[]> {
    if (await this.admission.isPlatformAdmin(userId)) return ['admin'];
    const grants = (await this.admission.grants(userId)).filter((grant) => grant.serviceCode === service);
    const currentRole = await this.getCurrentRoleCode(userId);
    return [...new Set(grants.map((grant) => grant.sourceCode === 'migration' || grant.sourceCode === 'bootstrap'
      ? currentRole ?? 'viewer' : grant.roleCode))];
  }

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

  async resolveActionPermissionContext(user: TokenPayload, organizationScope?: { serviceCode: 'pms' | 'crm'; organizationId: bigint | null }): Promise<PermissionResolutionContext> {
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

    const admissionState = await this.admission.state(userId);
    if (!await this.admission.isPlatformAdmin(userId)) grantedPermissionCodes.delete(SYSTEM_OVERRIDE_PERMISSION_CODE);
    if (admissionState.status !== 'active') {
      grantedPermissionCodes.clear();
    } else if (!grantedPermissionCodes.has(SYSTEM_OVERRIDE_PERMISSION_CODE)) {
      const serviceGrants = await this.admission.grants(userId);
      // Migrated accounts retain their original action policy. New app roles are
      // resolved independently so a CRM manager is not a DMS/SNS manager.
      const scopedPermissions = new Set<string>();
      for (const grant of serviceGrants) {
        if (organizationScope && grant.sourceCode === 'approval' && grant.serviceCode === organizationScope.serviceCode && grant.orgId !== organizationScope.organizationId) continue;
        const prefix = `${grant.serviceCode}.`;
        if (grant.sourceCode === 'migration' || grant.sourceCode === 'bootstrap') {
          for (const code of grantedPermissionCodes) if (code.startsWith(prefix)) scopedPermissions.add(code);
        } else {
          const permissions = await this.getRolePermissionCodes(grant.roleCode);
          for (const code of permissions) if (code.startsWith(prefix)) scopedPermissions.add(code);
        }
      }
      for (const code of [...grantedPermissionCodes]) {
        if (/^(crm|pms|dms|sns)\./.test(code)) grantedPermissionCodes.delete(code);
      }
      for (const code of scopedPermissions) if (!userPermissionExceptions.revokedPermissionCodes.has(code)) grantedPermissionCodes.add(code);
    }
    const hasSystemOverride = grantedPermissionCodes.has(SYSTEM_OVERRIDE_PERMISSION_CODE);

    return {
      grantedPermissionCodes,
      roleCode,
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

    const userIdForAdmission = BigInt(options.user.userId);
    if ((await this.admission.state(userIdForAdmission)).status !== 'active') grantedPermissionCodes.clear();
    else if (!actionContext.policy.hasSystemOverride) {
      const grants = await this.admission.grants(userIdForAdmission);
      for (const code of [...grantedPermissionCodes]) {
        const prefix = code.split('.')[0];
        if (!['crm', 'pms', 'dms', 'sns'].includes(prefix)) continue;
        const serviceGrants = grants.filter((grant) => grant.serviceCode === prefix && (options.targetOrganizationId === undefined || grant.sourceCode !== 'approval' || grant.orgId === options.targetOrganizationId));
        if (!serviceGrants.length || (serviceGrants.every((grant) => grant.sourceCode === 'approval' && grant.roleCode === 'viewer') && !code.endsWith('.read'))) grantedPermissionCodes.delete(code);
      }
    }
    return {
      grantedPermissionCodes,
      roleCode: actionContext.roleCode,
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

  async getCurrentRoleCode(userId: bigint): Promise<string | null> {
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
