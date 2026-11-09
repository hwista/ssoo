import { jest } from '@jest/globals';
import { AuthRegistrationService } from '../../src/modules/common/auth/auth-registration.service.js';

describe('Registration decision operations', () => {
  function setup() {
    const request = { registrationRequestId: 'fixture-request', providerCode: 'microsoft', tenantId: 'fixture-tenant', subjectId: 'fixture-subject', email: 'fixture@example.invalid', userPrincipalName: null, displayName: '검증', statusCode: 'pending', requestedAt: new Date(), updatedAt: new Date('2026-11-04T00:00:00Z'), decidedAt: null, decidedByUserId: null, decisionMemo: null, createdUserId: null };
    const claim = jest.fn<(...args: unknown[]) => Promise<{ count: number }>>().mockResolvedValue({ count: 1 });
    const create = jest.fn();
    const tx = {
      userRegistrationRequest: { findUnique: async () => request, updateMany: claim, findUniqueOrThrow: async () => ({ ...request, statusCode: 'rejected' }) },
      role: { findUnique: async () => ({ isActive: true }) },
      user: { findUnique: async () => ({ id: 7n, isActive: false }), create },
    };
    const transaction = jest.fn<(fn: (tx: unknown) => Promise<unknown>, options: unknown) => Promise<unknown>>().mockImplementation(fn => fn(tx));
    const service = new AuthRegistrationService({ client: { $transaction: transaction } } as never, { isPlatformAdmin: async () => true } as never);
    const dto = { memo: '가입 검토 결과', expectedUpdatedAt: request.updatedAt.toISOString() };
    return { service, request, claim, create, tx, transaction, dto };
  }

  it('records the reason and claims only the pending revision in a Serializable transaction', async () => {
    const fixture = setup();
    const result = await fixture.service.rejectRequest('fixture-request', fixture.dto, 1n);
    expect(result.statusCode).toBe('rejected');
    expect(fixture.transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'Serializable' });
    expect(fixture.claim).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ statusCode: 'pending', updatedAt: fixture.request.updatedAt }), data: expect.objectContaining({ decisionMemo: '가입 검토 결과', decidedByUserId: 1n }) }));
  });

  it.each(['approved', 'rejected', 'expired'])('does not overwrite an already %s decision', async status => {
    const fixture = setup();
    fixture.request.statusCode = status;
    await expect(fixture.service.rejectRequest('fixture-request', fixture.dto, 1n)).rejects.toThrow('변경');
    expect(fixture.claim).not.toHaveBeenCalled();
  });

  it('rejects an old revision of a renewed pending request', async () => {
    const fixture = setup();
    await expect(fixture.service.rejectRequest('fixture-request', { ...fixture.dto, expectedUpdatedAt: '2026-11-03T00:00:00Z' }, 1n)).rejects.toThrow('변경');
    expect(fixture.claim).not.toHaveBeenCalled();
  });

  it('stops a competing decision that lost the pending row claim', async () => {
    const fixture = setup();
    fixture.claim.mockResolvedValue({ count: 0 });
    await expect(fixture.service.rejectRequest('fixture-request', fixture.dto, 1n)).rejects.toThrow('이미 처리');
  });

  it('does not reactivate a suspended account through registration approval', async () => {
    const fixture = setup();
    await expect(fixture.service.approveRequest('fixture-request', fixture.dto, 1n)).rejects.toThrow('중지된 기존 사용자');
    expect(fixture.create).not.toHaveBeenCalled();
  });

  it('does not decide without a reason', async () => {
    const fixture = setup();
    await expect(fixture.service.rejectRequest('fixture-request', { ...fixture.dto, memo: ' ' }, 1n)).rejects.toThrow('사유');
    expect(fixture.claim).not.toHaveBeenCalled();
  });
});
