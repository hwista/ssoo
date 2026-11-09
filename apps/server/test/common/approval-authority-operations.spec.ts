import { jest } from '@jest/globals';
import { OnboardingService } from '../../src/modules/common/onboarding/onboarding.service.js';

const revision = new Date('2026-11-04T00:00:00Z');
const input = { userId: '9', authorityKind: 'service' as const, organizationId: '3', serviceCode: 'dms' as const, maxRoleCode: 'user' as const, reason: '담당자 배치' };

describe('Approval delegation lifecycle', () => {
  function setup() {
    const existing = { id: 7n, isActive: true, updatedAt: revision };
    const upsert = jest.fn<(args: unknown) => Promise<{ id: bigint }>>().mockResolvedValue({ id: 7n });
    const update = jest.fn<(args: unknown) => Promise<unknown>>().mockResolvedValue(existing);
    const tx = {
      userAuth: { count: async () => 1 }, userOrganizationRelation: { count: async () => 1 },
      organization: { count: async () => 1 },
      approvalAuthority: { findUnique: async (): Promise<typeof existing | null> => existing, upsert, update },
    };
    const admission = { isPlatformAdmin: async () => true, state: async () => ({ status: 'active' }) };
    const db = { client: { $transaction: async (operation: (client: typeof tx) => Promise<unknown>) => operation(tx) } };
    const service = new OnboardingService(db as never, admission as never);
    return { service, tx, existing, upsert, update, admission };
  }

  it('records expiry and reason when creating a delegation', async () => {
    const { service, tx, upsert } = setup();
    tx.approvalAuthority.findUnique = async () => null;
    await service.setAuthority(2n, { ...input, expiresAt: '2100-01-01T00:00:00Z' });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ expiresAt: new Date('2100-01-01'), memo: '담당자 배치', updatedBy: 2n }) }));
  });

  it('rejects existing-scope overwrite without the current revision', async () => {
    const { service, upsert } = setup();
    await expect(service.setAuthority(2n, input)).rejects.toThrow('기록이 변경');
    await expect(service.setAuthority(2n, { ...input, expectedUpdatedAt: '2020-01-01T00:00:00Z' })).rejects.toThrow('기록이 변경');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('updates the exact delegation and preserves the explicitly chosen expiration', async () => {
    const { service, upsert } = setup();
    await service.setAuthority(2n, { ...input, expectedUpdatedAt: revision.toISOString(), expiresAt: '2100-01-01T00:00:00Z' });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { userId_authorityKind_serviceCode_scopeKey: { userId: 9n, authorityKind: 'service', serviceCode: 'dms', scopeKey: '3' } }, update: expect.objectContaining({ isActive: true, expiresAt: new Date('2100-01-01') }) }));
  });

  it('rejects expiry in the past, blank reason and a target without membership', async () => {
    const { service, tx, upsert } = setup();
    await expect(service.setAuthority(2n, { ...input, expiresAt: '2000-01-01T00:00:00Z' })).rejects.toThrow('현재 시각');
    await expect(service.setAuthority(2n, { ...input, reason: ' ' })).rejects.toThrow('변경 사유');
    tx.userOrganizationRelation.count = async () => 0;
    await expect(service.setAuthority(2n, input)).rejects.toThrow('소속된 사용자');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects a stale or repeated revocation and checks the current operator', async () => {
    const { service, update, existing, admission } = setup();
    await expect(service.revokeAuthority(7n, 2n, { reason: '교체', expectedUpdatedAt: '2020-01-01T00:00:00Z' })).rejects.toThrow('위임이 변경');
    existing.isActive = false;
    await expect(service.revokeAuthority(7n, 2n, { reason: '교체', expectedUpdatedAt: revision.toISOString() })).rejects.toThrow('위임이 변경');
    admission.isPlatformAdmin = async () => false;
    await expect(service.revokeAuthority(7n, 2n, { reason: '교체', expectedUpdatedAt: revision.toISOString() })).rejects.toThrow('관리자 권한');
    expect(update).not.toHaveBeenCalled();
  });

  it('records revocation in place without deleting the delegation', async () => {
    const { service, update } = setup();
    await service.revokeAuthority(7n, 2n, { reason: '후임 인계 완료', expectedUpdatedAt: revision.toISOString() });
    expect(update).toHaveBeenCalledWith({ where: { id: 7n }, data: expect.objectContaining({ isActive: false, memo: '후임 인계 완료', updatedBy: 2n }) });
  });
});
