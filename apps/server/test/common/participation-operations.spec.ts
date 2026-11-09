import { jest } from '@jest/globals';
import { validate } from 'class-validator';
import { ParticipationWriteService, assertMembershipPeriod, participationId } from '../../src/modules/common/onboarding/participation-write.service.js';
import { ParticipationOperationsService } from '../../src/modules/common/onboarding/participation-operations.service.js';
import { CreateMembershipDto, ParticipationListQuery } from '../../src/modules/common/onboarding/participation-operations.dto.js';

const revision = new Date('2026-11-04T00:00:00.000Z');

describe('Admin participation lifecycle', () => {
  function setup(admin = true) {
    const changes: Array<{ target: string; args: unknown }> = [];
    const record = { userOrgRelationId: 5n, userId: 9n, orgId: 3n, isActive: true, isPrimary: true, updatedAt: revision, effectiveFrom: null as Date | null, effectiveTo: null as Date | null };
    const tx = {
      userOrganizationRelation: {
        findUnique: async () => record,
        count: async () => 0,
        findFirst: async () => null,
        update: async (args: unknown) => { changes.push({ target: 'membership', args }); return record; },
      },
      serviceGrant: { updateMany: async (args: unknown) => { changes.push({ target: 'grant', args }); return { count: 1 }; } },
      approvalAuthority: { updateMany: async (args: unknown) => { changes.push({ target: 'authority', args }); return { count: 1 }; } },
    };
    const admission = { isPlatformAdmin: async () => admin };
    const writer = { createMembership: jest.fn<() => Promise<unknown>>() };
    const db = { client: { $transaction: async (operation: (client: typeof tx) => Promise<unknown>) => operation(tx) } };
    const service = new ParticipationOperationsService(db as never, admission as never, writer as never);
    return { service, writer, changes, tx, record };
  }

  it('rejects direct management by a nonadministrator before reading or mutating a relationship', async () => {
    const { service, changes } = setup(false);
    await expect(service.endMembership(5n, 2n, { expectedUpdatedAt: revision.toISOString(), reason: '퇴사' })).rejects.toThrow('플랫폼 관리자');
    expect(changes).toEqual([]);
  });

  it('rejects a stale membership action without revoking dependent grants', async () => {
    const { service, changes } = setup();
    await expect(service.endMembership(5n, 2n, { expectedUpdatedAt: '2026-11-03T00:00:00Z', reason: '전보' })).rejects.toThrow('변경된 자료');
    expect(changes).toEqual([]);
  });

  it('ends only the selected membership and revokes grants/delegations only in that organization', async () => {
    const { service, changes } = setup();
    await service.endMembership(5n, 2n, { expectedUpdatedAt: revision.toISOString(), reason: '계약 종료' });
    expect(changes.map((change) => change.target)).toEqual(['membership', 'grant', 'authority']);
    expect(changes[0].args).toEqual(expect.objectContaining({ where: { userOrgRelationId: 5n }, data: expect.objectContaining({ isActive: false, isPrimary: false, memo: '계약 종료' }) }));
    for (const change of changes.slice(1)) expect(change.args).toEqual(expect.objectContaining({
      where: { userId: 9n, orgId: 3n, isActive: true }, data: expect.objectContaining({ isActive: false, updatedBy: 2n }),
    }));
  });

  it('does not revoke organizational access when another effective assignment still exists', async () => {
    const { service, changes, tx } = setup();
    tx.userOrganizationRelation.count = async () => 1;
    await service.endMembership(5n, 2n, { expectedUpdatedAt: revision.toISOString(), reason: '중복 과거 소속 정리' });
    expect(changes.map((change) => change.target)).toEqual(['membership']);
  });

  it('rejects a transfer to the same organization before ending the membership', async () => {
    const { service, changes } = setup();
    await expect(service.transferMembership(5n, 2n, { organizationId: '3', expectedUpdatedAt: revision.toISOString(), reason: '전보' })).rejects.toThrow('다른 조직');
    expect(changes).toEqual([]);
  });

  it('cancels a scheduled membership without creating an inverted effective period', async () => {
    const { service, record, changes } = setup();
    record.effectiveFrom = new Date('2100-01-01');
    record.effectiveTo = new Date('2101-01-01');
    await service.endMembership(5n, 2n, { expectedUpdatedAt: revision.toISOString(), reason: '예약 배치 취소' });
    expect(changes[0].args).toEqual(expect.objectContaining({ data: expect.objectContaining({ isActive: false }) }));
    expect(changes[0].args).toEqual(expect.objectContaining({ data: expect.not.objectContaining({ effectiveTo: expect.anything() }) }));
  });

  it('does not extend the recorded end of an already expired assignment', async () => {
    const { service, record, changes } = setup();
    record.effectiveFrom = new Date('2000-01-01');
    record.effectiveTo = new Date('2001-01-01');
    await service.endMembership(5n, 2n, { expectedUpdatedAt: revision.toISOString(), reason: '만료 소속 정리' });
    expect(changes[0].args).toEqual(expect.objectContaining({ data: expect.objectContaining({ effectiveTo: record.effectiveTo }) }));
  });

  it('requires a nonblank operation reason', async () => {
    const { service, changes } = setup();
    await expect(service.endMembership(5n, 2n, { expectedUpdatedAt: revision.toISOString(), reason: '   ' })).rejects.toThrow('변경 사유');
    expect(changes).toEqual([]);
  });
});

describe('Shared approval/operator participation invariants', () => {
  function writerSetup() {
    const upsert = jest.fn<(args: unknown) => Promise<unknown>>().mockResolvedValue({ id: 8n });
    const tx = {
      userAuth: { count: async () => 1 }, organization: { count: async () => 1 },
      userOrganizationRelation: { count: async () => 1 }, serviceGrant: { upsert },
    };
    const writer = new ParticipationWriteService({ state: async () => ({ status: 'active', user: { id: 9n } }) } as never);
    const grant = { userId: 9n, orgId: 3n, serviceCode: 'crm', roleCode: 'viewer', expiresAt: null, reason: '업무 배치' };
    return { writer, tx, upsert, grant };
  }

  it('rejects a service grant without a currently effective membership', async () => {
    const { writer, tx, grant, upsert } = writerSetup();
    tx.userOrganizationRelation.count = async () => 0;
    await expect(writer.setGrant(tx as never, grant, 2n, 'test')).rejects.toThrow('유효 소속');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects expired grants and unsupported administrative service roles before mutation', async () => {
    const { writer, tx, grant, upsert } = writerSetup();
    await expect(writer.setGrant(tx as never, { ...grant, expiresAt: new Date('2000-01-01') }, 2n, 'test')).rejects.toThrow('현재 시각보다 이후');
    await expect(writer.setGrant(tx as never, { ...grant, roleCode: 'admin' }, 2n, 'test')).rejects.toThrow('부여할 역할');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('uses the same scoped grant identity and audited decision for operator and request approval', async () => {
    const { writer, tx, grant, upsert } = writerSetup();
    await writer.setGrant(tx as never, grant, 2n, 'service-grant.admin.create');
    await writer.setGrant(tx as never, grant, 4n, 'onboarding.approve.42');
    for (const call of upsert.mock.calls) expect(call[0]).toEqual(expect.objectContaining({
      where: { userId_serviceCode_scopeKey: { userId: 9n, serviceCode: 'crm', scopeKey: '3' } },
      create: expect.objectContaining({ orgId: 3n, sourceCode: 'approval', roleCode: 'viewer', memo: '업무 배치' }),
    }));
  });

  it('checks overlapping periods even when the assignment is scheduled for the future', async () => {
    const { writer, tx } = writerSetup();
    await expect(writer.assertNoOverlap(tx as never, { userId: 9n, orgId: 3n,
      effectiveFrom: new Date('2100-01-01'), effectiveTo: new Date('2101-01-01'), reason: '예약 배치' })).rejects.toThrow('기간이 겹치는 소속');
  });

  it('validates ID bounds, dates and request filter/boolean shapes', async () => {
    expect(() => participationId('9223372036854775808')).toThrow('ID 형식');
    expect(() => assertMembershipPeriod(new Date('2030-01-02'), new Date('2030-01-01'))).toThrow('시작일');
    expect((await validate(Object.assign(new ParticipationListQuery(), { page: 0, status: 'anything' }))).length).toBe(2);
    const dto = Object.assign(new CreateMembershipDto(), { userId: '9', organizationId: '3', isPrimary: 'false', isLeader: false, reason: '등록' });
    expect((await validate(dto)).map((error) => error.property)).toContain('isPrimary');
  });
});
