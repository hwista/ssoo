import { jest } from '@jest/globals';
import { CommonPermissionsService } from '../../src/modules/common/access/common-permissions.service.js';
import { AccessFoundationService } from '../../src/modules/common/access/access-foundation.service.js';
import type { TokenPayload } from '../../src/modules/common/auth/interfaces/auth.interface.js';

const revision = new Date('2026-11-04T00:00:00Z');
const input = { targetId: '9', permissionCode: 'common.code.read', effect: 'grant' as const, reason: '업무 배치', effectiveFrom: null, effectiveTo: null };

describe('Common permission management boundaries', () => {
  function setup(admin = true) {
    const permission = { permissionId: 4n, permissionCode: 'common.code.read', isActive: true };
    const exception = { userPermissionExceptionId: 6n, userId: 9n, permissionId: 4n, isActive: true, updatedAt: revision,
      exceptionAxis: 'action', targetOrgId: null as bigint | null, targetObjectType: null as string | null, targetObjectId: null as string | null, permission };
    const org = { orgPermissionId: 7n, orgId: 9n, permissionId: 4n, isActive: true, updatedAt: revision, permission };
    const createOrg = jest.fn<(args: unknown) => Promise<unknown>>().mockResolvedValue(org);
    const updateOrg = jest.fn<(args: unknown) => Promise<unknown>>().mockResolvedValue(org);
    const createUser = jest.fn<(args: unknown) => Promise<unknown>>().mockResolvedValue(exception);
    const updateUser = jest.fn<(args: unknown) => Promise<unknown>>().mockResolvedValue(exception);
    const tx = {
      permission: { findFirst: async () => permission }, organization: { count: async () => 1 }, user: { count: async () => 1 },
      organizationPermission: { count: async () => 0, findUnique: async () => org, create: createOrg, update: updateOrg },
      userPermissionException: { count: async () => 0, findUnique: async () => exception, create: createUser, update: updateUser },
    };
    const transaction = jest.fn<(operation: (client: typeof tx) => Promise<unknown>, options: unknown) => Promise<unknown>>().mockImplementation(operation => operation(tx));
    const service = new CommonPermissionsService({ client: { $transaction: transaction } } as never, { isPlatformAdmin: async () => admin } as never);
    return { service, tx, exception, org, createOrg, updateOrg, createUser, updateUser, transaction };
  }

  it('rechecks the current operator in the write transaction', async () => {
    const { service, createOrg, transaction } = setup(false);
    await expect(service.create('organization', 2n, input)).rejects.toThrow('플랫폼 관리자');
    expect(createOrg).not.toHaveBeenCalled();
    expect(transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'Serializable' });
  });

  it.each(['system.override', 'dms.document.read', 'crm.customer.write'])('rejects privileged or domain permission %s', async code => {
    const { service, createUser } = setup();
    await expect(service.create('user', 2n, { ...input, permissionCode: code })).rejects.toThrow('공통 action');
    expect(createUser).not.toHaveBeenCalled();
  });

  it('rejects unsupported organizational deny and user scheduling', async () => {
    const { service, createOrg, createUser } = setup();
    await expect(service.create('organization', 2n, { ...input, effect: 'revoke' })).rejects.toThrow('직접 부여');
    await expect(service.create('user', 2n, { ...input, effectiveFrom: '2100-01-01T00:00:00Z' })).rejects.toThrow('예약');
    expect(createOrg).not.toHaveBeenCalled(); expect(createUser).not.toHaveBeenCalled();
  });

  it('rejects past or inverted periods and blank reasons', async () => {
    const { service, createOrg } = setup();
    await expect(service.create('organization', 2n, { ...input, effectiveTo: '2000-01-01T00:00:00Z' })).rejects.toThrow('현재 이후');
    await expect(service.create('organization', 2n, { ...input, effectiveFrom: '2101-01-01T00:00:00Z', effectiveTo: '2100-01-01T00:00:00Z' })).rejects.toThrow('시작일');
    await expect(service.create('organization', 2n, { ...input, reason: '  ' })).rejects.toThrow('변경 사유');
    expect(createOrg).not.toHaveBeenCalled();
  });

  it('does not duplicate existing organization relations or effective equal-effect user exceptions', async () => {
    const { service, tx, createOrg, createUser } = setup();
    tx.organizationPermission.count = async () => 1;
    tx.userPermissionException.count = async () => 1;
    await expect(service.create('organization', 2n, input)).rejects.toThrow('기존 조직 권한');
    await expect(service.create('user', 2n, input)).rejects.toThrow('같은 효과');
    expect(createOrg).not.toHaveBeenCalled(); expect(createUser).not.toHaveBeenCalled();
  });

  it('records operator, reason and period in the original audited relation', async () => {
    const { service, createOrg, createUser } = setup();
    await service.create('organization', 2n, { ...input, effectiveTo: '2100-01-01T00:00:00Z' });
    await service.create('user', 2n, { ...input, effect: 'revoke' });
    expect(createOrg).toHaveBeenCalledWith({ data: expect.objectContaining({ orgId: 9n, permissionId: 4n, effectiveTo: new Date('2100-01-01'), memo: '업무 배치', updatedBy: 2n }) });
    expect(createUser).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 9n, effectType: 'revoke', exceptionAxis: 'action', targetOrgId: null, targetObjectType: null, targetObjectId: null, appliedByUserId: 2n, reason: '업무 배치' }) });
  });

  it('rejects stale updates and changes to the original relation identity', async () => {
    const { service, updateOrg, updateUser } = setup();
    await expect(service.update('organization', 7n, 2n, { ...input, expectedUpdatedAt: '2026-11-03T00:00:00Z' })).rejects.toThrow('변경된 기록');
    await expect(service.update('user', 6n, 2n, { ...input, targetId: '10', expectedUpdatedAt: revision.toISOString() })).rejects.toThrow('대상과 권한');
    expect(updateOrg).not.toHaveBeenCalled(); expect(updateUser).not.toHaveBeenCalled();
  });

  it('cannot revoke object-scoped or system override exceptions through this endpoint', async () => {
    const { service, exception, updateUser } = setup();
    const dto = { reason: '회수', expectedUpdatedAt: revision.toISOString() };
    exception.targetOrgId = 3n;
    await expect(service.revoke('user', 6n, 2n, dto)).rejects.toThrow('해당 애플리케이션');
    exception.targetOrgId = null; exception.permission.permissionCode = 'system.override';
    await expect(service.revoke('user', 6n, 2n, dto)).rejects.toThrow('공통 action');
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('can revoke an inactive permission definition without requiring the target to be active', async () => {
    const { service, exception, tx, updateUser } = setup();
    exception.permission.isActive = false; tx.user.count = async () => 0;
    await service.revoke('user', 6n, 2n, { reason: '폐기된 권한 정리', expectedUpdatedAt: revision.toISOString() });
    expect(updateUser).toHaveBeenCalledWith({ where: { userPermissionExceptionId: 6n }, data: expect.objectContaining({ isActive: false, reason: '폐기된 권한 정리' }) });
  });
});

describe('Common permission resolution', () => {
  it('keeps deny precedence and uses direct memberships with exclusive end and active permission definitions', async () => {
    const relationQuery = jest.fn<(args: unknown) => Promise<unknown[]>>().mockResolvedValue([{ orgId: 9n }]);
    const orgQuery = jest.fn<(args: unknown) => Promise<unknown[]>>().mockResolvedValue([{ permission: { permissionCode: 'common.code.read' } }]);
    const roleQuery = jest.fn<(args: unknown) => Promise<unknown[]>>().mockResolvedValue([]);
    const exceptionQuery = jest.fn<(args: unknown) => Promise<unknown[]>>().mockResolvedValue([
      { effectType: 'grant', permission: { permissionCode: 'common.code.read' } },
      { effectType: 'revoke', permission: { permissionCode: 'common.code.read' } },
    ]);
    const db = { user: { findUnique: async () => ({ roleCode: 'user' }) }, client: {
      userOrganizationRelation: { findMany: relationQuery }, rolePermission: { findMany: roleQuery },
      organizationPermission: { findMany: orgQuery }, userPermissionException: { findMany: exceptionQuery },
    } };
    const service = new AccessFoundationService(db as never, { state: async () => ({ status: 'active' }), isPlatformAdmin: async () => false, grants: async () => [] } as never);
    const result = await service.resolveActionPermissionContext({ userId: '9', roleCode: 'user' } as TokenPayload);
    expect(result.grantedPermissionCodes.has('common.code.read')).toBe(false);
    expect(result.policy.organizationPermissionCodes).toContain('common.code.read');
    expect(result.policy.userRevokedPermissionCodes).toContain('common.code.read');
    expect(orgQuery).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ orgId: { in: [9n] }, permission: { isActive: true },
      AND: expect.arrayContaining([{ OR: [{ effectiveTo: null }, { effectiveTo: { gt: expect.any(Date) } }] }]) }) }));
    for (const query of [roleQuery, exceptionQuery]) expect(query).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ permission: { isActive: true } }) }));
    expect(relationQuery).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ AND: expect.arrayContaining([{ OR: [{ effectiveTo: null }, { effectiveTo: { gt: expect.any(Date) } }] }]) }) }));
  });
});
