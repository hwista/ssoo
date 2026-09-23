import { jest } from '@jest/globals';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller.js';

function setup(cookie?: string, origin?: string, cookieName = 'ssoo-session') {
  const refreshTokens = jest.fn(async (_token: string, _context: unknown) => ({
    accessToken: 'access', refreshToken: 'rotated',
  }));
  const validateToken = jest.fn(async (_token: string) => ({
    userId: '42', loginId: 'test', userName: 'Test',
  } as { userId: string; loginId: string; userName: string } | null));
  const getSessionAccessToken = jest.fn(async (_token: string) => 'access');
  const controller = Reflect.construct(AuthController, [
    { refreshTokens, validateToken, getSessionAccessToken }, {}, {}, {},
    { get: (key: string) => key === 'AUTH_SESSION_COOKIE_NAME' ? cookieName : undefined },
  ]) as AuthController;
  const request = {
    headers: { cookie, origin, host: 'app.test' }, protocol: 'https', ip: '127.0.0.1',
  } as Request;
  const response = { cookie: jest.fn(), clearCookie: jest.fn() };
  return { controller, request, response, refreshTokens, validateToken, getSessionAccessToken,
    run: () => controller.session(request, response as unknown as Response) };
}

describe('AuthController session presence boundary', () => {
  it('authorizes file proxies without rotating the browser cookie', async () => {
    const ctx = setup('ssoo-session=current');
    await expect(ctx.controller.sessionAccess(ctx.request, ctx.response as unknown as Response))
      .resolves.toMatchObject({ success: true, data: { accessToken: 'access' } });
    expect(ctx.getSessionAccessToken).toHaveBeenCalledWith('current');
    expect(ctx.refreshTokens).not.toHaveBeenCalled();
    expect(ctx.response.cookie).not.toHaveBeenCalled();
  });
  it('keeps anonymous file-session checks anonymous', async () => {
    const ctx = setup();
    await expect(ctx.controller.sessionAccess(ctx.request, ctx.response as unknown as Response))
      .resolves.toMatchObject({ success: true, data: { status: 'anonymous', accessToken: null, user: null } });
    expect(ctx.getSessionAccessToken).not.toHaveBeenCalled();
  });
  it.each([undefined, '', 'preference=dark; unrelated=value', 'ssoo-session-other=value']) (
    'returns anonymous only when the session cookie is absent: %s', async (cookie) => {
      const ctx = setup(cookie);
      await expect(ctx.run()).resolves.toMatchObject({
        success: true, data: { status: 'anonymous', accessToken: null, user: null },
      });
      expect(ctx.refreshTokens).not.toHaveBeenCalled();
      expect(ctx.validateToken).not.toHaveBeenCalled();
      expect(ctx.response.cookie).not.toHaveBeenCalled();
    },
  );

  it.each(['ssoo-session=', 'ssoo-session', 'preference=dark; ssoo-session=']) (
    'keeps a present but empty session unauthorized: %s', async (cookie) => {
      const ctx = setup(cookie);
      await expect(ctx.run()).rejects.toBeInstanceOf(UnauthorizedException);
      expect(ctx.refreshTokens).not.toHaveBeenCalled();
      expect(ctx.response.clearCookie).toHaveBeenCalled();
    },
  );

  it('uses the configured cookie name and preserves authenticated response and rotation', async () => {
    const ctx = setup('preference=dark; custom-session=refresh%3Dvalue', undefined, 'custom-session');
    await expect(ctx.run()).resolves.toMatchObject({
      success: true, data: { accessToken: 'access', user: { userId: '42', loginId: 'test', userName: 'Test' } },
    });
    expect(ctx.refreshTokens).toHaveBeenCalledWith('refresh=value', expect.any(Object));
    expect(ctx.validateToken).toHaveBeenCalledWith('access');
    expect(ctx.response.cookie).toHaveBeenCalledWith('custom-session', 'rotated', expect.objectContaining({ httpOnly: true }));
  });

  it.each([new UnauthorizedException('invalid session'), new Error('backend unavailable')]) (
    'propagates refresh rejection instead of declaring anonymous: %s', async (error) => {
      const ctx = setup('ssoo-session=present');
      ctx.refreshTokens.mockRejectedValueOnce(error);
      await expect(ctx.run()).rejects.toBe(error);
      expect(ctx.validateToken).not.toHaveBeenCalled();
    },
  );

  it('keeps malformed cookie decoding as an error', async () => {
    await expect(setup('ssoo-session=%').run()).rejects.toBeInstanceOf(URIError);
  });

  it('rejects untrusted origin before the anonymous response', async () => {
    await expect(setup(undefined, 'https://untrusted.test').run()).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an invalid access identity after refresh', async () => {
    const ctx = setup('ssoo-session=present');
    ctx.validateToken.mockResolvedValueOnce(null);
    await expect(ctx.run()).rejects.toBeInstanceOf(UnauthorizedException);
    expect(ctx.response.clearCookie).toHaveBeenCalled();
  });
});
