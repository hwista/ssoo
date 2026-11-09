import { jest } from '@jest/globals';
import { AuthAdminOperationsService } from '../../src/modules/common/auth/auth-admin-operations.service.js';

describe('Account session summary', () => {
  it('counts all active sessions even when none occur in the latest 50 displayed records', async () => {
    const revokedAt = new Date('2026-01-01T00:00:00Z');
    const sessions = Array.from({ length: 50 }, (_, index) => ({ sessionId: `revoked-${index}`, revokedAt, expiresAt: new Date('2100-01-01T00:00:00Z') }));
    const count = jest.fn<() => Promise<number>>().mockResolvedValueOnce(61).mockResolvedValueOnce(80).mockResolvedValueOnce(12);
    const findUnique = jest.fn<() => Promise<unknown>>().mockResolvedValue({ id: 9n, userName: 'Fixture', email: 'fixture@example.invalid', isActive: true, authAccount: {}, externalIdentities: [], authSessions: sessions });
    const service = new AuthAdminOperationsService({ client: { user: { findUnique }, userSession: { count } } } as never, {} as never);
    const result = await service.getAccountSnapshot(9n);
    expect(result.sessions).toHaveLength(50);
    expect(result.sessions.every(session => session.active === false)).toBe(true);
    expect(result.sessionSummary).toEqual({ active: 61, revoked: 80, expired: 12 });
    expect(count).toHaveBeenCalledWith({ where: { userId: 9n, revokedAt: null, expiresAt: { gt: expect.any(Date) } } });
    expect(count).toHaveBeenCalledWith({ where: { userId: 9n, revokedAt: null, expiresAt: { lte: expect.any(Date) } } });
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ select: expect.objectContaining({ authSessions: expect.objectContaining({ take: 50 }) }) }));
  });

  it('does not expose aggregate data for a nonexistent account', async () => {
    const count = jest.fn();
    const service = new AuthAdminOperationsService({ client: { user: { findUnique: async () => null }, userSession: { count } } } as never, {} as never);
    await expect(service.getAccountSnapshot(9n)).rejects.toThrow('사용자를 찾을 수 없습니다');
    expect(count).not.toHaveBeenCalled();
  });
});
