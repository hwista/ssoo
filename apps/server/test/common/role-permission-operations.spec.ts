import { jest } from '@jest/globals';
import { AccessOperationsService } from '../../src/modules/common/access/access-operations.service.js';

describe('Role permission operations', () => {
  function setup() {
    const role = { roleId: 4n, roleCode: 'fixture', roleName: '검증', roleScopeCode: 'system', description: null, isActive: true, updatedAt: new Date('2026-11-04T00:00:00Z'), rolePermissions: [{ permission: { permissionCode: 'common.user.manage' } }] };
    const update = jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({});
    const create = jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({});
    const revoke = jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({ count: 1 });
    const permissionLookup = jest.fn<() => Promise<unknown[]>>().mockResolvedValue([{ permissionId: 2n, permissionCode: 'common.user.manage' }]);
    const tx = {
      role: { findUnique: async () => role, findMany: async () => [role], update },
      user: { groupBy: async () => [{ roleCode: 'fixture', isActive: true, _count: { _all: 5 } }, { roleCode: 'fixture', isActive: false, _count: { _all: 2 } }] },
      permission: { findMany: permissionLookup },
      rolePermission: { updateMany: revoke, findFirst: async () => ({ rolePermissionId: 9n, isActive: true }), update, create },
    };
    const transaction = jest.fn<(fn: (client: typeof tx) => Promise<unknown>, options: unknown) => Promise<unknown>>().mockImplementation(fn => fn(tx));
    const admin = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);
    const continuity = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const service = new AccessOperationsService({ client: { ...tx, $transaction: transaction } } as never, {} as never, { isPlatformAdmin: admin, assertUsableAdministratorRemains: continuity } as never);
    const dto = async () => ({ permissionCodes: ['common.user.manage'], reason: '역할 운영 검증', expectedRevision: (await service.listRolesWithPermissions())[0].revision });
    return { service, role, dto, tx, transaction, admin, continuity, update, create, revoke, permissionLookup };
  }

  it('reports role assignment counts including suspended users separately', async () => {
    const { service } = setup();
    expect((await service.listRolesWithPermissions())[0]).toMatchObject({ assignedUserCount: 7, activeUserCount: 5, revision: expect.stringMatching(/^[a-f0-9]{64}$/) });
  });

  it('rejects stale permissions before any relation write', async () => {
    const fixture = setup();
    const dto = await fixture.dto();
    fixture.role.rolePermissions = [];
    await expect(fixture.service.updateRolePermissions('fixture', dto, 1n)).rejects.toThrow('조회 후');
    expect(fixture.update).not.toHaveBeenCalled();
    expect(fixture.revoke).not.toHaveBeenCalled();
  });

  it('rechecks operator authority inside the transaction', async () => {
    const fixture = setup();
    fixture.admin.mockResolvedValue(false);
    await expect(fixture.service.updateRolePermissions('fixture', await fixture.dto(), 1n)).rejects.toThrow('플랫폼 관리자');
    expect(fixture.permissionLookup).not.toHaveBeenCalled();
  });

  it('rejects unknown permissions without partially removing current grants', async () => {
    const fixture = setup();
    await expect(fixture.service.updateRolePermissions('fixture', { ...await fixture.dto(), permissionCodes: ['unknown'] }, 1n)).rejects.toThrow('unknown');
    expect(fixture.revoke).not.toHaveBeenCalled();
  });

  it('records the reason and checks administrator continuity in the same Serializable transaction', async () => {
    const fixture = setup();
    await fixture.service.updateRolePermissions('fixture', await fixture.dto(), 1n);
    expect(fixture.transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'Serializable' });
    expect(fixture.update).toHaveBeenCalledTimes(1); // Unchanged active relation is not re-granted.
    expect(fixture.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ memo: '역할 운영 검증', updatedBy: 1n }) }));
    expect(fixture.continuity).toHaveBeenCalled();
    expect(fixture.create).not.toHaveBeenCalled();
  });

  it('rolls back when removal leaves no usable administrator', async () => {
    const fixture = setup();
    fixture.continuity.mockRejectedValue(new Error('마지막 활성 관리자'));
    await expect(fixture.service.updateRolePermissions('fixture', await fixture.dto(), 1n)).rejects.toThrow('마지막 활성 관리자');
  });

  it('retries serialization conflicts a bounded number of times and reports a conflict', async () => {
    const fixture = setup();
    fixture.transaction.mockRejectedValue(Object.assign(new Error('serialization'), { code: 'P2034' }));
    await expect(fixture.service.updateRolePermissions('fixture', await fixture.dto(), 1n)).rejects.toThrow('다른 작업');
    expect(fixture.transaction).toHaveBeenCalledTimes(3);
  });

  it('requires a reason before opening a transaction', async () => {
    const fixture = setup();
    await expect(fixture.service.updateRolePermissions('fixture', { ...await fixture.dto(), reason: ' ' }, 1n)).rejects.toThrow();
    expect(fixture.transaction).not.toHaveBeenCalled();
  });
});
