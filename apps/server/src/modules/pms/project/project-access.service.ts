import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  PmsProjectAccessFeatures,
  PmsProjectAccessSnapshot,
  ProjectMemberAccessLevel,
} from '@ssoo/types';
import { DatabaseService } from '../../../database/database.service.js';
import { AccessFoundationService } from '../../common/access/access-foundation.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';

const PROJECT_OBJECT_TYPE = 'pms.project';

const PROJECT_PERMISSION_CODES = {
  manageProject: 'pms.project.manage',
  manageMembers: 'pms.project.member.manage',
  manageWork: 'pms.project.work.manage',
  manageDeliverables: 'pms.project.deliverable.manage',
  manageCloseConditions: 'pms.project.close-condition.manage',
  advanceStage: 'pms.project.stage.advance',
} as const;

const OWNER_BASELINE_PERMISSION_CODES = [
  PROJECT_PERMISSION_CODES.manageProject,
  PROJECT_PERMISSION_CODES.manageMembers,
  PROJECT_PERMISSION_CODES.manageWork,
  PROJECT_PERMISSION_CODES.manageDeliverables,
  PROJECT_PERMISSION_CODES.manageCloseConditions,
  PROJECT_PERMISSION_CODES.advanceStage,
] as const;

const PROJECT_CAPABILITY_PERMISSION_CODES = new Set<string>(OWNER_BASELINE_PERMISSION_CODES);
const PROJECT_MEMBER_ACCESS_LEVELS = new Set<ProjectMemberAccessLevel>([
  'owner',
  'participant',
  'contributor',
]);

const CAPABILITY_ERROR_MESSAGES: Record<keyof PmsProjectAccessFeatures, string> = {
  canViewProject: '프로젝트를 조회할 권한이 없습니다.',
  canEditProject: '프로젝트 기본 정보를 수정할 권한이 없습니다.',
  canManageMembers: '프로젝트 멤버를 관리할 권한이 없습니다.',
  canManageTasks: '프로젝트 태스크를 관리할 권한이 없습니다.',
  canManageMilestones: '프로젝트 마일스톤을 관리할 권한이 없습니다.',
  canManageIssues: '프로젝트 이슈를 관리할 권한이 없습니다.',
  canManageDeliverables: '프로젝트 산출물을 관리할 권한이 없습니다.',
  canManageCloseConditions: '프로젝트 종료조건을 관리할 권한이 없습니다.',
  canAdvanceStage: '프로젝트 단계를 진행할 권한이 없습니다.',
};

const buildFeatures = (enabled: boolean): PmsProjectAccessFeatures => ({
  canViewProject: enabled,
  canEditProject: enabled,
  canManageMembers: enabled,
  canManageTasks: enabled,
  canManageMilestones: enabled,
  canManageIssues: enabled,
  canManageDeliverables: enabled,
  canManageCloseConditions: enabled,
  canAdvanceStage: enabled,
});

export type PmsProjectCapabilityKey = keyof PmsProjectAccessFeatures;

@Injectable()
export class ProjectAccessService {
  constructor(
    private readonly db: DatabaseService,
    private readonly accessFoundationService: AccessFoundationService,
  ) {}

  async getProjectAccess(projectId: bigint, currentUser: TokenPayload): Promise<PmsProjectAccessSnapshot> {
    const now = new Date();
    const userId = BigInt(currentUser.userId);

    const project = await this.db.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        currentOwnerUserId: true,
        ownerOrganizationId: true,
        projectMembers: {
          where: {
            userId,
            isActive: true,
            OR: [{ releasedAt: null }, { releasedAt: { gte: now } }],
          },
          select: {
            roleCode: true,
            organizationId: true,
            accessLevel: true,
            isPhaseOwner: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const userOrgIds = new Set(
      (await this.accessFoundationService.getUserOrganizationIds(userId, now)).map((orgId) =>
        orgId.toString(),
      ),
    );
    const memberAccessLevels = Array.from(
      new Set(
        project.projectMembers
          .map((member) => member.accessLevel)
          .filter(
            (accessLevel): accessLevel is ProjectMemberAccessLevel =>
              PROJECT_MEMBER_ACCESS_LEVELS.has(accessLevel as ProjectMemberAccessLevel),
          ),
      ),
    );
    const memberRoleCodes = Array.from(new Set(project.projectMembers.map((member) => member.roleCode)));
    const memberOrganizationIds = Array.from(
      new Set(
        project.projectMembers
          .map((member) => member.organizationId?.toString())
          .filter((organizationId): organizationId is string => Boolean(organizationId)),
      ),
    );
    const phaseOwnerRoleCodes = Array.from(
      new Set(
        project.projectMembers
          .filter((member) => member.isPhaseOwner)
          .map((member) => member.roleCode),
      ),
    );
    const isProjectOwner = project.currentOwnerUserId === userId;
    const isOwnerOrganizationMember =
      project.ownerOrganizationId !== null &&
      project.ownerOrganizationId !== undefined &&
      userOrgIds.has(project.ownerOrganizationId.toString());
    const isProjectMember = memberRoleCodes.length > 0;
    const hasOwnerLevelMembership = memberAccessLevels.includes('owner');
    const hasPhaseOwnership = phaseOwnerRoleCodes.length > 0;
    const actionContext = await this.accessFoundationService.resolveActionPermissionContext(currentUser);

    if (actionContext.policy.hasSystemOverride) {
      return {
        projectId: project.id.toString(),
        ownerOrganizationId: project.ownerOrganizationId?.toString() ?? null,
        currentOwnerUserId: project.currentOwnerUserId?.toString() ?? null,
        features: buildFeatures(true),
        roles: {
          isProjectOwner,
          isOwnerOrganizationMember,
          isProjectMember,
          memberRoleCodes,
          memberAccessLevels,
          phaseOwnerRoleCodes,
          memberOrganizationIds,
        },
        policy: actionContext.policy,
      };
    }

    const domainGrantedPermissionCodes = new Set<string>();
    if (isProjectOwner || hasOwnerLevelMembership || hasPhaseOwnership) {
      for (const permissionCode of OWNER_BASELINE_PERMISSION_CODES) {
        domainGrantedPermissionCodes.add(permissionCode);
      }
    }

    const roleBasedPermissionCodes = project.projectMembers
      .filter((member) => member.accessLevel !== 'contributor')
      .map((member) => member.roleCode);

    if (roleBasedPermissionCodes.length > 0) {
      const rolePermissions = await this.db.client.projectRolePermission.findMany({
        where: {
          roleCode: { in: roleBasedPermissionCodes },
          isActive: true,
        },
        select: {
          permission: {
            select: {
              permissionCode: true,
            },
          },
        },
      });

      for (const rolePermission of rolePermissions) {
        domainGrantedPermissionCodes.add(rolePermission.permission.permissionCode);
      }
    }

    const objectContext = await this.accessFoundationService.resolveObjectPermissionContext({
      user: currentUser,
      targetObjectType: PROJECT_OBJECT_TYPE,
      targetObjectId: projectId.toString(),
      actionContext,
      domainGrantedPermissionCodes,
    });

    const hasExplicitProjectCapability = Array.from(PROJECT_CAPABILITY_PERMISSION_CODES).some(
      (permissionCode) => objectContext.grantedPermissionCodes.has(permissionCode),
    );
    const canViewProject =
      isProjectOwner
      || isProjectMember
      || isOwnerOrganizationMember
      || hasExplicitProjectCapability;

    return {
      projectId: project.id.toString(),
      ownerOrganizationId: project.ownerOrganizationId?.toString() ?? null,
      currentOwnerUserId: project.currentOwnerUserId?.toString() ?? null,
        features: {
          canViewProject,
          canEditProject: objectContext.grantedPermissionCodes.has(PROJECT_PERMISSION_CODES.manageProject),
        canManageMembers: objectContext.grantedPermissionCodes.has(PROJECT_PERMISSION_CODES.manageMembers),
        canManageTasks: objectContext.grantedPermissionCodes.has(PROJECT_PERMISSION_CODES.manageWork),
        canManageMilestones: objectContext.grantedPermissionCodes.has(PROJECT_PERMISSION_CODES.manageWork),
        canManageIssues: objectContext.grantedPermissionCodes.has(PROJECT_PERMISSION_CODES.manageWork),
        canManageDeliverables: objectContext.grantedPermissionCodes.has(PROJECT_PERMISSION_CODES.manageDeliverables),
        canManageCloseConditions: objectContext.grantedPermissionCodes.has(PROJECT_PERMISSION_CODES.manageCloseConditions),
        canAdvanceStage: objectContext.grantedPermissionCodes.has(PROJECT_PERMISSION_CODES.advanceStage),
      },
        roles: {
          isProjectOwner,
          isOwnerOrganizationMember,
          isProjectMember,
          memberRoleCodes,
          memberAccessLevels,
          phaseOwnerRoleCodes,
          memberOrganizationIds,
        },
        policy: objectContext.policy,
      };
  }

  async assertProjectCapability(
    projectId: bigint,
    currentUser: TokenPayload,
    capability: PmsProjectCapabilityKey,
  ): Promise<PmsProjectAccessSnapshot> {
    const access = await this.getProjectAccess(projectId, currentUser);

    if (!access.features[capability]) {
      throw new ForbiddenException(CAPABILITY_ERROR_MESSAGES[capability]);
    }

    return access;
  }
}
