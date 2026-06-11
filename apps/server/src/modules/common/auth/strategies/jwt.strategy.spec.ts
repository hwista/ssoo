import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy.js';
import type { TokenPayload } from '../interfaces/auth.interface.js';

describe('JwtStrategy session lifecycle validation', () => {
  const activeUser = {
    userId: 1n,
    loginId: 'admin',
    userName: '관리자',
    roleCode: 'admin',
    isActive: true,
    accountStatusCode: 'active',
  };

  function createStrategy(sessionRecord: unknown) {
    const findUniqueCalls: unknown[] = [];
    const configService = {
      get: () => 'test-jwt-secret',
    };
    const userService = {
      findAuthUserById: async () => activeUser,
    };
    const accessFoundationService = {
      getUserOrganizationIds: async () => [10n],
    };
    const db = {
      client: {
        userSession: {
          findUnique: async (args: unknown) => {
            findUniqueCalls.push(args);
            return sessionRecord;
          },
        },
      },
    };

    const strategy = Reflect.construct(JwtStrategy, [
      configService,
      userService,
      accessFoundationService,
      db,
    ]) as JwtStrategy;

    return { strategy, findUniqueCalls };
  }

  const payload: TokenPayload = {
    userId: '1',
    loginId: 'admin',
    userName: '관리자',
    type: 'access',
    sessionId: '11111111-1111-4111-8111-111111111111',
  };

  it('rejects an otherwise valid access token when the backing session is revoked', async () => {
    const { strategy, findUniqueCalls } = createStrategy({
      sessionId: payload.sessionId,
      userId: 1n,
      revokedAt: new Date('2026-06-10T00:00:00.000Z'),
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    });

    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findUniqueCalls).toEqual([{
      where: { sessionId: payload.sessionId },
    }]);
  });
});
