import { jest } from '@jest/globals';
import { AccessOperationsService } from '../../src/modules/common/access/access-operations.service.js';
import { OrganizationOperationsService } from '../../src/modules/common/access/organization-operations.service.js';
import { UserService } from '../../src/modules/common/user/user.service.js';

function transactionalClient<T extends object>(client: T) {
  return { ...client, $transaction: async (operation: (tx: T) => Promise<unknown>) => operation(client) };
}

describe('Admin operations safety', () => {
  it.each(['deactivate', 'demote'] as const)('rolls back %s of the last usable administrator inside a Serializable transaction', async operation => {
    const update = jest.fn<() => Promise<unknown>>().mockResolvedValue({});
    const tx = { user: { update }, userAuth: { count: async () => 1, updateMany: async () => ({ count: 1 }) }, userSession: { updateMany: async () => ({ count: 1 }) } };
    const transaction = jest.fn<(fn: (client: typeof tx) => Promise<unknown>, options: unknown) => Promise<unknown>>().mockImplementation(fn => fn(tx));
    const continuity = jest.fn<(client: unknown) => Promise<void>>().mockRejectedValue(new Error('마지막 활성 관리자'));
    const service = new UserService({ client: { $transaction: transaction } } as never, { isPlatformAdmin: async () => true, assertUsableAdministratorRemains: continuity } as never);
    await expect(operation === 'deactivate' ? service.deactivate(1n, 1n) : service.update(1n, { roleCode: 'user' }, 1n)).rejects.toThrow('마지막 활성 관리자');
    expect(continuity).toHaveBeenCalledWith(tx);
    expect(transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'Serializable' });
    expect(update).toHaveBeenCalled();
  });

  it('blocks organization hierarchy cycles before update', async () => {
    const update = jest.fn();
    const findUnique = jest.fn<() => Promise<unknown>>()
      .mockResolvedValueOnce({ orgId: 1n })
      .mockResolvedValueOnce({ isActive: true, orgClass: 'permanent' })
      .mockResolvedValueOnce({ parentOrgId: 1n });
    const service = new OrganizationOperationsService({
      client: transactionalClient({ organization: { findUnique, update } }),
    } as never);

    await expect(service.update(1n, { parentOrgId: '2' }, 99n)).rejects.toThrow(/순환 관계/);
    expect(update).not.toHaveBeenCalled();
  });

  it('blocks organization deactivation while active children or memberships remain', async () => {
    const update = jest.fn();
    const service = new OrganizationOperationsService({
      client: transactionalClient({
        organization: {
          findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue({ orgId: 1n }),
          count: jest.fn<() => Promise<number>>().mockResolvedValue(2),
          update,
        },
        userOrganizationRelation: {
          count: jest.fn<() => Promise<number>>().mockResolvedValue(3),
        },
      }),
    } as never);

    await expect(service.deactivate(1n, 99n)).rejects.toThrow(/활성 하위 조직 2건과 활성 소속 3건/);
    expect(update).not.toHaveBeenCalled();
    await expect(service.update(1n, { isActive: false }, 99n)).rejects.toThrow(/활성 하위 조직 2건과 활성 소속 3건/);
    expect(update).not.toHaveBeenCalled();
  });

  it('preserves an organization parent when reactivation omits parentOrgId', async () => {
    const update = jest.fn<() => Promise<unknown>>().mockResolvedValue({ orgId: 2n });
    const findUnique = jest.fn<() => Promise<unknown>>()
      .mockResolvedValueOnce({ orgId: 2n, parentOrgId: 1n })
      .mockResolvedValueOnce({ isActive: true, orgClass: 'permanent' })
      .mockResolvedValueOnce({
        orgId: 2n,
        orgCode: 'CHILD',
        orgName: 'Child',
        orgType: 'team',
        orgClass: 'permanent',
        scope: 'internal',
        levelType: 'team',
        parentOrgId: 1n,
        isActive: true,
        memo: null,
        createdAt: new Date('2026-08-12T00:00:00Z'),
        updatedAt: new Date('2026-08-12T00:00:00Z'),
        parent: { orgId: 1n, orgCode: 'PARENT', orgName: 'Parent' },
        children: [],
        userRelations: [],
      });
    const service = new OrganizationOperationsService({
      client: transactionalClient({ organization: { findUnique, update } }),
    } as never);

    await service.update(2n, { isActive: true, parentOrgId: undefined }, 99n);

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.not.objectContaining({ parentOrgId: expect.anything() }),
    }));
  });

  it('rejects restoration under a suspended parent before changing the child', async () => {
    const update = jest.fn();
    const findUnique = jest.fn<() => Promise<unknown>>()
      .mockResolvedValueOnce({ orgId: 2n, parentOrgId: 1n })
      .mockResolvedValueOnce({ isActive: false, orgClass: 'permanent' });
    const service = new OrganizationOperationsService({ client: transactionalClient({ organization: { findUnique, update } }) } as never);
    await expect(service.update(2n, { isActive: true }, 99n)).rejects.toThrow('활성 permanent');
    expect(update).not.toHaveBeenCalled();
  });

  it('prevents removal of system.override from the admin role', async () => {
    const transaction = jest.fn();
    const service = new AccessOperationsService({
      client: {
        role: {
          findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue({
            roleId: 1n,
            roleCode: 'admin',
            isActive: true,
          }),
        },
        permission: { findMany: jest.fn() },
        $transaction: transaction,
      },
    } as never, {} as never, {} as never);

    await expect(service.updateRolePermissions('admin', { permissionCodes: ['common.user.manage'], reason: '관리자 보호 검증', expectedRevision: '0'.repeat(64) }, 99n))
      .rejects.toThrow(/system.override/);
    expect(transaction).not.toHaveBeenCalled();
  });
});
