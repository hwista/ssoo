import { validate } from 'class-validator';
import { OnboardingService } from '../../src/modules/common/onboarding/onboarding.service.js';
import { ApprovalReviewsQueryDto } from '../../src/modules/common/onboarding/onboarding.dto.js';

describe('Functional approval inbox', () => {
  function setup(admin: boolean, authorities: unknown[] = []) {
    const filters: unknown[] = [];
    const counts: unknown[] = [];
    const service = new OnboardingService({ client: {
      onboardingRequest: {
        findMany: async (args: unknown) => { filters.push(args); return []; },
        count: async (args: unknown) => { counts.push(args); return 45; },
      },
      userOrganizationRelation: { findMany: async () => [{ orgId: 7n }] },
      approvalAuthority: { findMany: async () => authorities },
    } } as never, {
      isPlatformAdmin: async () => admin,
      state: async () => ({ status: 'active' }),
    } as never);
    return { service, filters, counts };
  }

  it('keeps the pending default and excludes the reviewer’s own requests', async () => {
    const { service, filters, counts } = setup(true);
    await expect(service.reviewQueue(5n)).resolves.toEqual({ items: [], total: 45, limit: 20 });
    const where = { AND: [{ userId: { not: 5n } }, { statusCode: 'pending' }] };
    expect(filters).toEqual([expect.objectContaining({ where, skip: 0, take: 20 })]);
    expect(counts).toEqual([{ where }]);
  });

  it('applies the same delegated scope to history, filters, pagination and totals', async () => {
    const { service, filters, counts } = setup(false, [{ authorityKind: 'service', orgId: 7n, serviceCode: 'pms' }]);
    const query = Object.assign(new ApprovalReviewsQueryDto(), { status: 'approved', kind: 'service', page: 2 });
    await service.reviewQueue(5n, query);
    const where = { AND: [{ userId: { not: 5n }, OR: [{ kind: 'service', serviceCode: 'pms', orgId: 7n }] }, { statusCode: 'approved', kind: 'service' }] };
    expect(filters).toEqual([expect.objectContaining({ where, skip: 20, take: 20 })]);
    expect(counts).toEqual([{ where }]);
  });

  it('does not widen an empty authority scope when history is requested', async () => {
    const { service, filters } = setup(false);
    await service.reviewQueue(5n, Object.assign(new ApprovalReviewsQueryDto(), { status: 'rejected' }));
    expect(filters).toEqual([expect.objectContaining({ where: { AND: [{ id: { in: [] } }, { statusCode: 'rejected' }] } })]);
  });

  it('keeps an ID-constrained decision denied after all delegation is revoked', async () => {
    const lookups: unknown[] = [];
    const tx = {
      userOrganizationRelation: { findMany: async () => [{ orgId: 7n }] },
      approvalAuthority: { findMany: async () => [] },
      onboardingRequest: { findFirst: async (args: unknown) => { lookups.push(args); return null; } },
    };
    const service = new OnboardingService({ client: { $transaction: async (operation: (client: typeof tx) => Promise<unknown>) => operation(tx) } } as never,
      { isPlatformAdmin: async () => false, state: async () => ({ status: 'active' }) } as never);
    await expect(service.decide(42n, 5n, { decision: 'approve', message: 'review' })).rejects.toThrow('승인 권한이 없습니다');
    expect(lookups).toEqual([expect.objectContaining({ where: { id: 42n, AND: [{ id: { in: [] } }] } })]);
  });

  it('rejects unsupported states, kinds and invalid pages', async () => {
    const query = Object.assign(new ApprovalReviewsQueryDto(), { status: 'all', kind: 'admin', page: 0 });
    const errors = await validate(query);
    expect(errors.map((error) => error.property).sort()).toEqual(['kind', 'page', 'status']);
  });
});
