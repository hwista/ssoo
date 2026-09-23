import { jest } from '@jest/globals';
import { AuthService } from './auth.service.js';
import type { TokenPayload } from './interfaces/auth.interface.js';

const activeUser = {
  userId: 42n,
  loginId: 'current-login',
  userName: 'Current User',
  passwordHash: 'unused',
  accountStatusCode: 'active',
  lastLoginAt: null,
  loginFailCount: 0,
  lockedUntil: null,
  roleCode: 'user',
  isActive: true,
};

const accessPayload: TokenPayload = {
  userId: '42',
  loginId: 'stale-login',
  userName: 'Stale User',
  organizationIds: ['999'],
  teamIds: [' team-1 ', 'team-1', '', 'team-2'],
  groupIds: ['group-1'],
  sessionId: '11111111-1111-4111-8111-111111111111',
  type: 'access',
};

function createService(
  payload: TokenPayload = accessPayload,
  sessionRecord: object | null = {
    sessionId: accessPayload.sessionId,
    sessionTokenHash: 'sha256:' + 'a'.repeat(64),
    userId: 42n,
    revokedAt: null,
    expiresAt: new Date('2099-01-01T00:00:00.000Z'),
  },
) {
  const findAuthUserById = jest.fn(async () => activeUser);
  const findUnique = jest.fn(async () => sessionRecord);
  const getUserOrganizationIds = jest.fn(async () => [10n, 20n]);
  const verify = jest.fn(() => payload);
  const service = Reflect.construct(AuthService, [
    { client: { userSession: { findUnique } } },
    { findAuthUserById },
    { verify },
    {
      get: () => 'test-jwt-secret',
      getOrThrow: () => 'test-jwt-secret',
    },
    { getUserOrganizationIds },
  ]) as AuthService;

  return {
    service,
    findAuthUserById,
    findUnique,
    getUserOrganizationIds,
    verify,
  };
}

describe('AuthService validateToken', () => {
  it('returns a current active principal backed by a live session', async () => {
    const { service, findAuthUserById, findUnique, getUserOrganizationIds } = createService();

    await expect(service.validateToken('access-token')).resolves.toEqual({
      userId: '42',
      loginId: 'current-login',
      userName: 'Current User',
      organizationIds: ['10', '20'],
      teamIds: ['team-1', 'team-2'],
      groupIds: ['group-1'],
      sessionId: accessPayload.sessionId,
      type: 'access',
    });
    expect(findAuthUserById).toHaveBeenCalledWith(42n);
    expect(findUnique).toHaveBeenCalledWith({
      where: { sessionId: accessPayload.sessionId },
    });
    expect(getUserOrganizationIds).toHaveBeenCalledWith(42n);
  });

  it('rejects legacy sessions even while the access token has not expired', async () => {
    const { service } = createService(accessPayload, {
      sessionId: accessPayload.sessionId, userId: 42n, revokedAt: null,
      sessionTokenHash: '$2b$10$legacy', expiresAt: new Date('2099-01-01'),
    });
    await expect(service.validateToken('legacy-access')).resolves.toBeNull();
  });

  it('rejects refresh tokens before loading identity or session state', async () => {
    const { service, findAuthUserById, findUnique, getUserOrganizationIds } = createService({
      ...accessPayload,
      type: 'refresh',
    });

    await expect(service.validateToken('refresh-token')).resolves.toBeNull();
    expect(findAuthUserById).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
    expect(getUserOrganizationIds).not.toHaveBeenCalled();
  });

  it('rejects an otherwise valid token when its backing session is revoked', async () => {
    const { service } = createService(accessPayload, {
      sessionId: accessPayload.sessionId,
      userId: 42n,
      revokedAt: new Date('2026-07-15T00:00:00.000Z'),
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    });

    await expect(service.validateToken('revoked-token')).resolves.toBeNull();
  });
});
