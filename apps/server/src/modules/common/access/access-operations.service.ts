import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AccessInspectionResult,
  PermissionExceptionAxis,
  PermissionCatalogGroup,
  PermissionCatalogItem,
  PermissionCatalogOwner,
  PermissionCatalogResult,
  PermissionCatalogStatus,
  PermissionExceptionListResult,
  PermissionExceptionRecord,
} from '@ssoo/types/common';
import { toIdString } from '../../../common/utils/bigint.util.js';
import { DatabaseService } from '../../../database/database.service.js';
import type { TokenPayload } from '../auth/interfaces/auth.interface.js';
import { AccessFoundationService } from './access-foundation.service.js';
import type { InspectAccessQueryDto } from './dto/inspect-access.query.dto.js';
import type { ListPermissionExceptionsQueryDto } from './dto/list-permission-exceptions.query.dto.js';
import type { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto.js';

type AccessSubjectRow = Awaited<ReturnType<AccessOperationsService['findSubjectOrThrow']>>;

const CRM_LAUNCH_ACTIVE_PERMISSION_CODES = new Set([
  'crm.business-year.read',
  'crm.business-year.manage',
  'crm.opportunity.read',
  'crm.opportunity.write',
  'crm.opportunity.confirm',
  'crm.opportunity.version.manage',
  'crm.customer.read',
  'crm.customer.write',
  'crm.customer.activity.read',
  'crm.customer.activity.write',
  'crm.contract.read',
  'crm.contract.write',
  'crm.contract.confirm',
  'crm.business-plan.read',
  'crm.business-plan.write',
  'crm.business-plan.confirm',
  'crm.business-plan.delete',
  'crm.cost-plan.read',
  'crm.cost-plan.write',
  'crm.cost-plan.confirm',
  'crm.report.read',
  'crm.report.confirm',
  'crm.quote-settings.read',
  'crm.quote-settings.manage',
  'crm.operations.read',
  'crm.operations.execute',
  'crm.settings.manage',
]);

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


  async listPermissionCatalog(): Promise<PermissionCatalogResult> {
    const permissions = await this.db.client.permission.findMany({
      where: { isActive: true },
      orderBy: { permissionCode: 'asc' },
      select: {
        permissionCode: true,
        permissionName: true,
      },
    });

    const items = permissions.map((permission): PermissionCatalogItem => {
      const appCode = permission.permissionCode.split('.')[0] ?? 'unknown';
      const owner = this.resolvePermissionOwner(appCode);
      const status = this.resolvePermissionStatus(owner, permission.permissionCode);
      return {
        permissionCode: permission.permissionCode,
        permissionName: permission.permissionName,
        owner,
        appCode,
        capability: this.resolveCapability(permission.permissionCode),
        status,
        menuSurface: this.resolveMenuSurface(owner, permission.permissionCode),
        operationSurface: this.resolveOperationSurface(owner),
        notes: this.resolvePermissionNotes(owner, permission.permissionCode),
      };
    });

    const groups = this.buildPermissionCatalogGroups(items);
    const summary = items.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === 'launch-active') acc.launchActive += 1;
        if (item.status === 'foundation') acc.foundation += 1;
        if (item.status === 'planned') acc.planned += 1;
        return acc;
      },
      { total: 0, launchActive: 0, foundation: 0, planned: 0 },
    );

    return {
      generatedAt: new Date().toISOString(),
      summary,
      groups,
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

  async listRolesWithPermissions() {
    const roles = await this.db.client.role.findMany({
      orderBy: [{ sortOrder: 'asc' }, { roleCode: 'asc' }],
      select: {
        roleId: true,
        roleCode: true,
        roleName: true,
        roleScopeCode: true,
        description: true,
        isActive: true,
        rolePermissions: {
          where: { isActive: true, permission: { isActive: true } },
          select: { permission: { select: { permissionCode: true } } },
        },
      },
    });
    return roles.map((role) => ({
      roleId: role.roleId.toString(),
      roleCode: role.roleCode,
      roleName: role.roleName,
      roleScopeCode: role.roleScopeCode,
      description: role.description,
      isActive: role.isActive,
      permissionCodes: role.rolePermissions
        .map((relation) => relation.permission.permissionCode)
        .sort((left, right) => left.localeCompare(right)),
    }));
  }

  async updateRolePermissions(
    roleCode: string,
    dto: UpdateRolePermissionsDto,
    operatorUserId: bigint,
  ) {
    const role = await this.db.client.role.findUnique({
      where: { roleCode },
      select: { roleId: true, roleCode: true, isActive: true },
    });
    if (!role || !role.isActive) {
      throw new NotFoundException('활성 역할을 찾을 수 없습니다.');
    }

    const permissionCodes = Array.from(new Set(dto.permissionCodes.map((code) => code.trim()).filter(Boolean)));
    if (roleCode === 'admin' && !permissionCodes.includes('system.override')) {
      throw new BadRequestException('admin 역할에서는 system.override 권한을 제거할 수 없습니다.');
    }
    const permissions = await this.db.client.permission.findMany({
      where: { permissionCode: { in: permissionCodes }, isActive: true },
      select: { permissionId: true, permissionCode: true },
    });
    const foundCodes = new Set(permissions.map((permission) => permission.permissionCode));
    const missingCodes = permissionCodes.filter((code) => !foundCodes.has(code));
    if (missingCodes.length > 0) {
      throw new BadRequestException(`활성 permission을 찾을 수 없습니다: ${missingCodes.join(', ')}`);
    }
    const permissionIds = permissions.map((permission) => permission.permissionId);

    await this.db.client.$transaction(async (tx) => {
      await tx.rolePermission.updateMany({
        where: {
          roleId: role.roleId,
          isActive: true,
          ...(permissionIds.length > 0 ? { permissionId: { notIn: permissionIds } } : {}),
        },
        data: {
          isActive: false,
          updatedBy: operatorUserId,
          lastSource: 'admin-access-operations',
          lastActivity: 'access.admin.role-permissions.revoke',
        },
      });

      for (const permission of permissions) {
        const existing = await tx.rolePermission.findFirst({
          where: { roleId: role.roleId, permissionId: permission.permissionId },
          select: { rolePermissionId: true },
        });
        if (existing) {
          await tx.rolePermission.update({
            where: { rolePermissionId: existing.rolePermissionId },
            data: {
              isActive: true,
              updatedBy: operatorUserId,
              lastSource: 'admin-access-operations',
              lastActivity: 'access.admin.role-permissions.grant',
            },
          });
        } else {
          await tx.rolePermission.create({
            data: {
              roleId: role.roleId,
              permissionId: permission.permissionId,
              createdBy: operatorUserId,
              updatedBy: operatorUserId,
              lastSource: 'admin-access-operations',
              lastActivity: 'access.admin.role-permissions.grant',
            },
          });
        }
      }
    });

    const updated = (await this.listRolesWithPermissions()).find((item) => item.roleCode === roleCode);
    if (!updated) {
      throw new NotFoundException('갱신된 역할을 찾을 수 없습니다.');
    }
    return updated;
  }

  async listAuditEvents(limit = 100) {
    const take = Math.min(Math.max(limit, 1), 500);
    const [users, authAccounts, sessions, organizations, rolePermissions] = await Promise.all([
      this.db.client.userHistory.findMany({
        orderBy: { eventAt: 'desc' },
        take,
        select: {
          userId: true,
          historySeq: true,
          eventType: true,
          eventAt: true,
          userName: true,
          roleCode: true,
          isActive: true,
          updatedBy: true,
          lastSource: true,
          lastActivity: true,
          transactionId: true,
        },
      }),
      this.db.client.userAuthHistory.findMany({
        orderBy: { eventAt: 'desc' },
        take,
        select: {
          userId: true,
          historySeq: true,
          eventType: true,
          eventAt: true,
          loginId: true,
          accountStatusCode: true,
          loginFailCount: true,
          lockedUntil: true,
          updatedBy: true,
          lastSource: true,
          lastActivity: true,
          transactionId: true,
        },
      }),
      this.db.client.userSessionHistory.findMany({
        orderBy: { eventAt: 'desc' },
        take,
        select: {
          sessionId: true,
          historySeq: true,
          eventType: true,
          eventAt: true,
          userId: true,
          issuedApp: true,
          revokedAt: true,
          revokeReason: true,
          updatedBy: true,
          lastSource: true,
          lastActivity: true,
          transactionId: true,
        },
      }),
      this.db.client.organizationHistory.findMany({
        orderBy: { eventAt: 'desc' },
        take,
        select: {
          orgId: true,
          historySeq: true,
          eventType: true,
          eventAt: true,
          orgCode: true,
          orgName: true,
          isActive: true,
          updatedBy: true,
          lastSource: true,
          lastActivity: true,
          transactionId: true,
        },
      }),
      this.db.client.rolePermissionHistory.findMany({
        orderBy: { eventAt: 'desc' },
        take,
        select: {
          rolePermissionId: true,
          historySeq: true,
          eventType: true,
          eventAt: true,
          roleId: true,
          permissionId: true,
          isActive: true,
          updatedBy: true,
          lastSource: true,
          lastActivity: true,
          transactionId: true,
        },
      }),
    ]);

    const events = [
      ...users.map((item) => ({
        id: `user:${item.userId}:${item.historySeq}`,
        category: 'user',
        eventType: item.eventType,
        eventAt: item.eventAt,
        subjectId: item.userId.toString(),
        summary: `${item.userName} · role ${item.roleCode} · ${item.isActive ? 'active' : 'inactive'}`,
        operatorUserId: item.updatedBy?.toString() ?? null,
        source: item.lastSource,
        activity: item.lastActivity,
        transactionId: item.transactionId,
      })),
      ...authAccounts.map((item) => ({
        id: `auth:${item.userId}:${item.historySeq}`,
        category: 'auth-account',
        eventType: item.eventType,
        eventAt: item.eventAt,
        subjectId: item.userId.toString(),
        summary: `${item.loginId} · ${item.accountStatusCode} · failures ${item.loginFailCount}${item.lockedUntil ? ' · locked' : ''}`,
        operatorUserId: item.updatedBy?.toString() ?? null,
        source: item.lastSource,
        activity: item.lastActivity,
        transactionId: item.transactionId,
      })),
      ...sessions.map((item) => ({
        id: `session:${item.sessionId}:${item.historySeq}`,
        category: 'session',
        eventType: item.eventType,
        eventAt: item.eventAt,
        subjectId: item.userId.toString(),
        summary: `${item.issuedApp} · ${item.revokedAt ? `revoked (${item.revokeReason ?? '-'})` : 'active'}`,
        operatorUserId: item.updatedBy?.toString() ?? null,
        source: item.lastSource,
        activity: item.lastActivity,
        transactionId: item.transactionId,
      })),
      ...organizations.map((item) => ({
        id: `organization:${item.orgId}:${item.historySeq}`,
        category: 'organization',
        eventType: item.eventType,
        eventAt: item.eventAt,
        subjectId: item.orgId.toString(),
        summary: `${item.orgName} (${item.orgCode}) · ${item.isActive ? 'active' : 'inactive'}`,
        operatorUserId: item.updatedBy?.toString() ?? null,
        source: item.lastSource,
        activity: item.lastActivity,
        transactionId: item.transactionId,
      })),
      ...rolePermissions.map((item) => ({
        id: `role-permission:${item.rolePermissionId}:${item.historySeq}`,
        category: 'role-permission',
        eventType: item.eventType,
        eventAt: item.eventAt,
        subjectId: item.rolePermissionId.toString(),
        summary: `role ${item.roleId} · permission ${item.permissionId} · ${item.isActive ? 'granted' : 'revoked'}`,
        operatorUserId: item.updatedBy?.toString() ?? null,
        source: item.lastSource,
        activity: item.lastActivity,
        transactionId: item.transactionId,
      })),
    ];
    return events
      .sort((left, right) => right.eventAt.getTime() - left.eventAt.getTime())
      .slice(0, take)
      .map((event) => ({ ...event, eventAt: event.eventAt.toISOString() }));
  }


  private resolvePermissionOwner(appCode: string): PermissionCatalogOwner {
    switch (appCode) {
      case 'common':
      case 'system':
        return 'admin-platform';
      case 'dms':
        return 'dms';
      case 'pms':
        return 'pms';
      case 'crm':
        return 'crm';
      case 'sns':
        return 'sns';
      case 'cms':
        return 'cms';
      default:
        return 'unknown';
    }
  }

  private resolvePermissionStatus(
    owner: PermissionCatalogOwner,
    permissionCode: string,
  ): PermissionCatalogStatus {
    if (
      owner === 'admin-platform'
      || owner === 'dms'
      || (owner === 'crm' && CRM_LAUNCH_ACTIVE_PERMISSION_CODES.has(permissionCode))
    ) {
      return 'launch-active';
    }
    if (permissionCode.startsWith('pms.') || permissionCode.startsWith('sns.')) {
      return 'foundation';
    }
    return 'planned';
  }

  private resolveCapability(permissionCode: string): string {
    const [, ...parts] = permissionCode.split('.');
    return parts.join('.') || permissionCode;
  }

  private resolveMenuSurface(owner: PermissionCatalogOwner, permissionCode: string): string {
    if (owner === 'admin-platform') {
      if (permissionCode === 'common.user.manage') return 'Admin > 사용자 관리 / 역할 & 권한';
      if (permissionCode === 'system.override') return 'Admin > 역할 & 권한 > 권한 해석';
      return 'Admin > 플랫폼 관리';
    }
    if (owner === 'dms') {
      if (permissionCode.includes('document')) return 'DMS > 문서 / 설정 > 문서 권한 관리';
      if (permissionCode.includes('settings') || permissionCode.includes('storage') || permissionCode.includes('git')) return 'DMS > 설정 > DMS 시스템 설정 / 운영 상태';
      if (permissionCode.includes('template')) return 'DMS > 설정 > 관리자 템플릿';
      if (permissionCode.includes('search') || permissionCode.includes('assistant')) return 'DMS > 통합 검색 / 문서 보조';
      return 'DMS > 설정';
    }
    if (owner === 'pms') return 'PMS > 프로젝트/코드/멤버 관리 (개발 진행 중)';
    if (owner === 'sns') return 'SNS > 피드/프로필/소셜 (개발 진행 중)';
    if (owner === 'cms') return 'CMS/SNS legacy 권한 vocabulary (정리 예정)';
    if (owner === 'crm') {
      if (permissionCode.includes('quote-settings') || permissionCode.includes('settings')) return 'CRM > 환경설정 / Admin > 역할 & 권한';
      if (permissionCode.includes('operations')) return 'CRM > 운영센터 / Admin > 역할 & 권한';
      if (permissionCode.includes('contract')) return 'CRM > 계약 / 계약대비실적';
      if (permissionCode.includes('business-plan')) return 'CRM > 사업계획 / 사업계획대비실적';
      if (permissionCode.includes('cost-plan')) return 'CRM > 내부원가 / AMS';
      if (permissionCode.includes('report')) return 'CRM > 영업보고';
      if (permissionCode.includes('customer')) return 'CRM > 고객 / 고객활동';
      return 'CRM > 영업기회 / 대시보드';
    }
    return '미분류';
  }

  private resolveOperationSurface(owner: PermissionCatalogOwner): string {
    if (owner === 'admin-platform') {
      return '플랫폼/base 사용자·조직·역할·권한 운영. 도메인 문서/프로젝트/고객 세부 운영은 소유하지 않음.';
    }
    if (owner === 'dms') {
      return 'DMS 문서 도메인 내부의 설정·제어·운영. Admin은 read-only 관측/링크만 제공.';
    }
    if (owner === 'crm') {
      return 'CRM 영업·계약·계획·원가·보고 도메인 action을 CRM API guard와 UI access snapshot으로 집행. Admin은 부여·감사 surface를 소유.';
    }
    return '앱별 도메인 운영 surface에서 구현/노출해야 하는 foundation permission.';
  }

  private resolvePermissionNotes(owner: PermissionCatalogOwner, permissionCode: string): string {
    if (owner === 'admin-platform') {
      return 'SSOO 공통 권한 vocabulary. Admin이 부여/해석/예외를 운영한다.';
    }
    if (owner === 'dms') {
      return 'DMS 런칭 대상. 문서 ACL, 요청/승인, 저장소/Git/검색/템플릿 기능으로 실제 동작 검증 대상이다.';
    }
    if (owner === 'crm' && CRM_LAUNCH_ACTIVE_PERMISSION_CODES.has(permissionCode)) {
      return 'CRM 런칭 active permission. roleCode 표시는 보존하지만 판정은 공용 permission resolution 결과를 사용한다.';
    }
    return `${permissionCode.split('.')[0].toUpperCase()} 앱 개발 진행에 맞춰 메뉴/기능 검증을 이어갈 항목이다.`;
  }

  private buildPermissionCatalogGroups(items: PermissionCatalogItem[]): PermissionCatalogGroup[] {
    const definitions: Array<Omit<PermissionCatalogGroup, 'items'>> = [
      {
        owner: 'admin-platform',
        title: 'Admin / Platform base',
        responsibility: '사용자, 조직, 역할, 권한 vocabulary, app access grant, system override 등 SSOO 플랫폼/base 권한 운영',
        launchFocus: true,
      },
      {
        owner: 'dms',
        title: 'DMS / Document domain',
        responsibility: '문서 조회/작성, 검색/AI, Git/storage/settings/template, 문서별 ACL·요청·승인 운영',
        launchFocus: true,
      },
      {
        owner: 'pms',
        title: 'PMS / Project domain',
        responsibility: '프로젝트/멤버/산출물/종료조건/단계 진행 권한. 현재 개발 진행 중이라 foundation으로 유지',
        launchFocus: false,
      },
      {
        owner: 'crm',
        title: 'CRM / Customer-sales domain',
        responsibility: '영업/계약/청구/계획/원가/보고와 CRM 설정·운영 action. CRM API guard와 access snapshot으로 집행',
        launchFocus: true,
      },
      {
        owner: 'sns',
        title: 'SNS / Profile-social domain',
        responsibility: '프로필/피드/소셜 권한. 계정/profile 사용자 surface는 SNS가 담당하되 app grant 운영은 Admin이 담당',
        launchFocus: false,
      },
      {
        owner: 'cms',
        title: 'CMS legacy vocabulary',
        responsibility: '현 런칭 축에서는 낮은 우선순위/정리 예정 vocabulary',
        launchFocus: false,
      },
      {
        owner: 'unknown',
        title: 'Unknown',
        responsibility: '소유자 매핑이 필요한 권한',
        launchFocus: false,
      },
    ];

    return definitions
      .map((definition) => ({
        ...definition,
        items: items.filter((item) => item.owner === definition.owner),
      }))
      .filter((group) => group.items.length > 0);
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
