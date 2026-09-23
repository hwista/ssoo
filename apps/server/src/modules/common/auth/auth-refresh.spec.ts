import { jest } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { hashSessionToken } from './session-token.js';
import type { TokenPayload } from './interfaces/auth.interface.js';

const jwt = new JwtService();
const secret = 'test-refresh-secret-only';
const activeUser = { userId: 42n, loginId: 'test', userName: 'Test', isActive: true, accountStatusCode: 'active', lockedUntil: null };
const claims: TokenPayload = { userId: '42', loginId: 'test', sessionId: 'test-session', type: 'refresh', jti: 'initial-token' };
function setup() {
  const original = jwt.sign(claims, { secret, expiresIn: '7d' });
  const session = { sessionId: 'test-session', userId: 42n, sessionTokenHash: hashSessionToken(original), revokedAt: null as Date | null,
    expiresAt: new Date(Date.now() + 86400000), lastSeenAt: new Date(), createdAt: new Date(), issuedApp: 'sns', userAgent: 'test' };
  type Swap = { where: { sessionTokenHash: string; revokedAt: null; expiresAt: { gt: Date } }; data: Partial<typeof session> };
  const updateMany = jest.fn(async ({ where, data }: Swap) => {
    if (session.revokedAt !== where.revokedAt || session.sessionTokenHash !== where.sessionTokenHash || session.expiresAt <= where.expiresAt.gt) return { count: 0 };
    Object.assign(session, data); return { count: 1 };
  });
  const findUnique = jest.fn(async () => ({ ...session }));
  const signAsync = jest.fn(async (...args: Parameters<JwtService['signAsync']>) => jwt.signAsync(...args));
  const service = Reflect.construct(AuthService, [
    { client: { userSession: { findUnique, updateMany } } },
    { findAuthUserById: async () => activeUser },
    { verify: jwt.verify.bind(jwt), signAsync },
    { get: () => 30, getOrThrow: (key: string) => key.endsWith('SECRET') ? secret : '7d' },
    {},
  ]) as AuthService;
  return { service, original, session, updateMany, findUnique, signAsync };
}

describe('refresh token one-time exchange', () => {
  it('authorizes concurrent files without rotating and rejects their cookie after a real exchange', async () => {
    const ctx = setup();
    const tokens = await Promise.all(Array.from({ length: 5 }, () => ctx.service.getSessionAccessToken(ctx.original)));
    expect(tokens.every((token) => jwt.decode(token).type === 'access')).toBe(true);
    expect(ctx.session.sessionTokenHash).toBe(hashSessionToken(ctx.original));
    expect(ctx.updateMany).not.toHaveBeenCalled();
    const next = await ctx.service.refreshTokens(ctx.original);
    await expect(ctx.service.getSessionAccessToken(ctx.original)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(ctx.service.getSessionAccessToken(next.refreshToken)).resolves.toEqual(expect.any(String));
    ctx.session.revokedAt = new Date();
    await expect(ctx.service.getSessionAccessToken(next.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('issues distinct tokens in the same second and rejects both prior generations', async () => {
    const ctx = setup();
    const first = await ctx.service.refreshTokens(ctx.original);
    const second = await ctx.service.refreshTokens(first.refreshToken);
    expect(first.refreshToken).not.toBe(ctx.original);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(ctx.session.sessionTokenHash).toBe(hashSessionToken(second.refreshToken));
    await expect(ctx.service.refreshTokens(ctx.original)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(ctx.service.refreshTokens(first.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('lets exactly one parallel request exchange a token', async () => {
    const ctx = setup();
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => ctx.service.refreshTokens(ctx.original)));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(7);
  });
  it('cannot overwrite a revocation committed while signing the replacement', async () => {
    const ctx = setup();
    ctx.signAsync.mockImplementation(async (...args) => { ctx.session.revokedAt = new Date(); return jwt.signAsync(...args); });
    await expect(ctx.service.refreshTokens(ctx.original)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(ctx.session.revokedAt).not.toBeNull();
    expect(ctx.session.sessionTokenHash).toBe(hashSessionToken(ctx.original));
    expect(ctx.updateMany.mock.calls[0][0].data).not.toHaveProperty('revokedAt');
  });
  it('does not refresh legacy storage even with an otherwise signed new-format token', async () => {
    const ctx = setup(); ctx.session.sessionTokenHash = '$2b$10$legacy';
    await expect(ctx.service.refreshTokens(ctx.original)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(ctx.updateMany).not.toHaveBeenCalled();
  });
  it.each([
    { ...claims, type: 'access' }, { ...claims, jti: undefined }, { ...claims, sessionId: undefined },
  ])('rejects wrong token kind or missing claims before reading a session', async (payload) => {
    const ctx = setup(); const token = jwt.sign(payload, { secret, expiresIn: '7d' });
    await expect(ctx.service.refreshTokens(token)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(ctx.findUnique).not.toHaveBeenCalled();
  });
  it.each(['revoked', 'expired', 'idle'])('keeps %s sessions rejected', async (kind) => {
    const ctx = setup();
    if (kind === 'revoked') ctx.session.revokedAt = new Date();
    if (kind === 'expired') ctx.session.expiresAt = new Date(0);
    if (kind === 'idle') ctx.session.lastSeenAt = new Date(0);
    await expect(ctx.service.refreshTokens(ctx.original)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
