import { jest } from '@jest/globals';
import { PlatformAdmissionService } from '../../src/modules/common/onboarding/platform-admission.service.js';
import { UserService } from '../../src/modules/common/user/user.service.js';

describe('Usable platform administrator continuity', () => {
  function setup() {
    const candidates = jest.fn<() => Promise<Array<{ id: bigint }>>>().mockResolvedValue([{ id: 9n }]);
    const exceptions = jest.fn<() => Promise<Array<{ effectType: string }>>>().mockResolvedValue([]);
    const rolePermissionCount = jest.fn<() => Promise<number>>().mockResolvedValue(1);
    const tx = {
      user: { findMany: candidates, findUnique: async () => ({ id: 9n, isActive: true, roleCode: 'admin', platformEnrollment: { isActive: true, statusCode: 'active' } }) },
      userPermissionException: { findMany: exceptions }, rolePermission: { count: rolePermissionCount },
    };
    const service = new PlatformAdmissionService({ client: tx } as never);
    return { service, tx, candidates, exceptions, rolePermissionCount };
  }

  it('requires an active login account, participation and an unlocked login for the remaining administrator', async () => {
    const { service, tx, candidates } = setup();
    candidates.mockResolvedValue([]);
    await expect(service.assertUsableAdministratorRemains(tx as never)).rejects.toThrow('로그인 가능한 후임');
    expect(candidates).toHaveBeenCalledWith(expect.objectContaining({ where: {
      isActive: true, platformEnrollment: { statusCode: 'active', isActive: true },
      authAccount: { accountStatusCode: 'active', OR: [{ lockedUntil: null }, { lockedUntil: { lte: expect.any(Date) } }] },
    } }));
  });

  it('rejects an administrator label without effective system.override', async () => {
    const { service, tx, rolePermissionCount } = setup();
    rolePermissionCount.mockResolvedValue(0);
    await expect(service.assertUsableAdministratorRemains(tx as never)).rejects.toThrow('마지막 활성 관리자');
  });

  it('does not count a system.override denial as a usable successor', async () => {
    const { service, tx, exceptions } = setup();
    exceptions.mockResolvedValue([{ effectType: 'grant' }, { effectType: 'revoke' }]);
    await expect(service.assertUsableAdministratorRemains(tx as never)).rejects.toThrow('마지막 활성 관리자');
  });

  it('recognizes a valid successor with an effective explicit grant even when the role itself has none', async () => {
    const { service, tx, exceptions, rolePermissionCount } = setup();
    exceptions.mockResolvedValue([{ effectType: 'grant' }]); rolePermissionCount.mockResolvedValue(0);
    await expect(service.assertUsableAdministratorRemains(tx as never)).resolves.toBeUndefined();
  });
});

describe('Serializable account changes', () => {
  function setup() {
    const update = jest.fn<() => Promise<unknown>>().mockResolvedValue({});
    const tx = { user: { update }, userAuth: { count: async () => 1, updateMany: async () => ({ count: 1 }) }, userSession: { updateMany: async () => ({ count: 1 }) } };
    const isAdmin = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);
    const continuity = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const transaction = jest.fn<(operation: (client: typeof tx) => Promise<unknown>, options: unknown) => Promise<unknown>>().mockImplementation(operation => operation(tx));
    const service = new UserService({ client: { $transaction: transaction } } as never, { isPlatformAdmin: isAdmin, assertUsableAdministratorRemains: continuity } as never);
    return { service, tx, update, isAdmin, continuity, transaction };
  }

  it('rejects an operator whose management permission changed before the transaction', async () => {
    const { service, update, isAdmin } = setup(); isAdmin.mockResolvedValue(false);
    await expect(service.update(9n, { isActive: false }, 1n)).rejects.toThrow('현재 활성 플랫폼 관리자');
    expect(update).not.toHaveBeenCalled();
  });

  it('rechecks continuity after a serialization conflict instead of committing an earlier decision', async () => {
    const { service, transaction, continuity, tx } = setup();
    transaction.mockImplementationOnce(async operation => { await operation(tx); throw { code: 'P2034' }; });
    continuity.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('마지막 활성 관리자'));
    await expect(service.update(9n, { roleCode: 'user' }, 1n)).rejects.toThrow('마지막 활성 관리자');
    expect(transaction).toHaveBeenCalledTimes(2); expect(continuity).toHaveBeenCalledTimes(2);
    expect(transaction.mock.calls.every(call => JSON.stringify(call[1]) === JSON.stringify({ isolationLevel: 'Serializable' }))).toBe(true);
  });

  it('bounds repeated serialization retries with an actionable conflict', async () => {
    const { service, transaction } = setup(); transaction.mockRejectedValue({ code: 'P2034' });
    await expect(service.deactivate(9n, 1n)).rejects.toThrow('최신 상태를 조회');
    expect(transaction).toHaveBeenCalledTimes(3);
  });
});
