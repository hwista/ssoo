import type { CrmAccessService } from '../access/access.service.js';
import type { AiIndexObjectProjection } from '@ssoo/types/common';
import type { DatabaseService } from '../../../database/database.service.js';
import type { AiEmbeddingProviderService } from '../../common/ai-index/ai-embedding-provider.service.js';
import { AiIndexRegistryService } from '../../common/ai-index/ai-index-registry.service.js';
import { assertAiIndexObjectProjection } from '../../common/ai-index/ai-index-projection.validator.js';
import { CrmAiIndexAdapter } from './crm-ai-index.adapter.js';

type FindUniqueOpportunity = (args: unknown) => Promise<unknown>;

interface FindUniqueOpportunityMock extends FindUniqueOpportunity {
  calls: unknown[];
}

function createOpportunityFixture() {
  return {
    id: 101n,
    opportunityCode: 'crm-opp-001',
    customerName: 'LS Electric',
    opportunityName: '스마트 배전반 통합 관제 고도화',
    ownerName: '김민준',
    businessType: 'SI 구축',
    industryLine: '전력/제조',
    regionCode: 'domestic',
    statusCode: 'proposal',
    priorityCode: 'high',
    versionNo: 3,
    confirmed: false,
    expectedStartDate: new Date('2026-07-01T00:00:00.000Z'),
    expectedEndDate: new Date('2026-12-31T00:00:00.000Z'),
    revenueTotal: 840000000n,
    costTotal: 592000000n,
    pmsHandoffStatusCode: 'planned',
    dmsLinkStatusCode: 'planned',
    adminBoundaryCode: 'shared-admin',
    nextAction: '제안 금액 검토 후 계약 후보 전환 여부 결정',
    updatedAt: new Date('2026-06-08T09:20:00.000Z'),
    lines: [
      {
        lineCode: 'rev-001-1',
        lineKindCode: 'revenue',
        categoryCode: 'product',
        lineLabel: '관제 플랫폼 라이선스',
        amount: 390000000n,
        sortOrder: 10,
      },
      {
        lineCode: 'cost-001-1',
        lineKindCode: 'cost',
        categoryCode: 'internal-cost',
        lineLabel: '내부 수행 원가',
        amount: 348000000n,
        sortOrder: 20,
      },
    ],
  };
}

function createCustomerFixture() {
  return {
    id: 201n,
    customerCode: 'crm-cust-ls',
    customerName: 'LS Electric',
    customerTypeCode: 'active',
    industryLine: '전력/제조',
    regionCode: 'domestic',
    ownerName: '김민준',
    ownerUserId: 77n,
    contactName: '이현우',
    contactEmail: 'client@example.com',
    contactPhone: '02-1234-5678',
    sourceOpportunityId: 101n,
    latestOpportunityCode: 'crm-opp-001',
    latestActivityAt: new Date('2026-06-08T09:30:00.000Z'),
    lastInteractionSummary: '제안 금액 검토 후 계약 후보 전환 여부 결정',
    nextAction: '계약 조건 재검토',
    adminBoundaryCode: 'shared-admin',
    updatedAt: new Date('2026-06-08T09:31:00.000Z'),
    activities: [
      {
        id: 301n,
        activityCode: 'crm-act-001',
        customerId: 201n,
        sourceOpportunityId: 101n,
        sourceOpportunityCode: 'crm-opp-001',
        activityTypeCode: 'meeting',
        activityStatusCode: 'done',
        subject: '제안 금액 검토 회의',
        occurredAt: new Date('2026-06-08T09:30:00.000Z'),
        dueAt: null,
        ownerName: '김민준',
        ownerUserId: 77n,
        summary: '고객 예산 범위와 납기 조건 확인',
        nextAction: '수정 견적 전달',
        updatedAt: new Date('2026-06-08T09:31:00.000Z'),
      },
    ],
  };
}

function createActivityFixture() {
  return {
    id: 301n,
    activityCode: 'crm-act-001',
    customerId: 201n,
    sourceOpportunityId: 101n,
    sourceOpportunityCode: 'crm-opp-001',
    activityTypeCode: 'meeting',
    activityStatusCode: 'done',
    subject: '제안 금액 검토 회의',
    occurredAt: new Date('2026-06-08T09:30:00.000Z'),
    dueAt: new Date('2026-06-10T09:00:00.000Z'),
    ownerName: '김민준',
    ownerUserId: 77n,
    summary: '고객 예산 범위와 납기 조건 확인',
    nextAction: '수정 견적 전달',
    updatedAt: new Date('2026-06-08T09:31:00.000Z'),
    customer: {
      id: 201n,
      customerCode: 'crm-cust-ls',
      customerName: 'LS Electric',
      customerTypeCode: 'active',
      industryLine: '전력/제조',
      regionCode: 'domestic',
      ownerName: '김민준',
      ownerUserId: 77n,
      adminBoundaryCode: 'shared-admin',
      isActive: true,
    },
  };
}

function createFindUniqueMock(result: unknown): FindUniqueOpportunityMock {
  const findUnique = (async (args: unknown) => {
    findUnique.calls.push(args);
    return result;
  }) as FindUniqueOpportunityMock;
  findUnique.calls = [];
  return findUnique;
}

function createAdapter(
  opportunity: unknown,
  embeddingReady = false,
  customer: unknown = null,
  activity: unknown = null,
) {
  const findUnique = createFindUniqueMock(opportunity);
  const findCustomerUnique = createFindUniqueMock(customer);
  const findActivityUnique = createFindUniqueMock(activity);
  const db = {
    client: {
      crmOpportunity: {
        findUnique,
      },
      crmCustomer: {
        findUnique: findCustomerUnique,
      },
      crmCustomerActivity: {
        findUnique: findActivityUnique,
      },
    },
  } as unknown as DatabaseService;
  const registry = new AiIndexRegistryService();
  const embeddingProvider = {
    getStatus: () => ({
      profileCode: 'default',
      providerCode: 'azure-openai',
      ready: embeddingReady,
      reasonCode: embeddingReady ? undefined : 'not_configured',
    }),
  } as unknown as AiEmbeddingProviderService;
  const adapter = new CrmAiIndexAdapter(db, registry, embeddingProvider, {} as CrmAccessService);

  return {
    adapter,
    registry,
    findUnique,
    findCustomerUnique,
    findActivityUnique,
  };
}

function requireProjection(result: { projection?: AiIndexObjectProjection }): AiIndexObjectProjection {
  if (!result.projection) {
    throw new Error('Expected CRM AI index projection');
  }
  return result.projection;
}

describe('CrmAiIndexAdapter', () => {
  it('registers a provider-gated CRM opportunity domain adapter', () => {
    const { adapter, registry } = createAdapter(createOpportunityFixture(), true);

    adapter.onModuleInit();

    expect(registry.get('crm')).toBe(adapter);
    expect(adapter.capabilities).toMatchObject({
      keyword: true,
      metadata: true,
      semantic: true,
      vector: true,
      ragContext: true,
      indexing: true,
    });
  });

  it('projects CRM opportunity RDB rows into a valid AI index object', async () => {
    const { adapter, findUnique } = createAdapter(createOpportunityFixture(), false);

    const result = await adapter.syncObject({
      sourceApp: 'crm',
      entityType: 'opportunity',
      entityId: '101',
      jobType: 'upsert',
    });
    const projection = requireProjection(result);

    expect(result.status).toBe('indexed');
    expect(findUnique.calls[0]).toMatchObject({
      where: {
        id: 101n,
        isActive: true,
      },
    });
    expect(() => assertAiIndexObjectProjection(projection)).not.toThrow();
    expect(projection).toMatchObject({
      sourceApp: 'crm',
      sourceKind: 'domain',
      adapterCode: 'crm.opportunity.ai-index',
      entityType: 'opportunity',
      entityId: '101',
      title: '스마트 배전반 통합 관제 고도화',
      target: {
        sourceApp: 'crm',
        path: '/?selected=crm-opp-001',
      },
      acl: {
        accessScope: 'policy',
        searchEligible: true,
        contextEligible: true,
      },
      capabilities: {
        semantic: false,
        vector: false,
        ragContext: false,
      },
    });
    expect(projection.bodyText).toContain('Revenue total: 840000000');
    expect(projection.bodyText).toContain('관제 플랫폼 라이선스');
    expect(projection.metadata).toMatchObject({
      opportunityCode: 'crm-opp-001',
      customerName: 'LS Electric',
      revenueTotal: 840000000,
      marginTotal: 248000000,
    });
    expect(projection.chunks?.map((chunk) => chunk.chunkKey)).toEqual([
      'crm-opportunity-overview',
      'crm-opportunity-financials',
      'crm-opportunity-integration',
    ]);
  });

  it('projects CRM customer rows and recent activities into a valid AI index object', async () => {
    const { adapter, findCustomerUnique } = createAdapter(
      createOpportunityFixture(),
      false,
      createCustomerFixture(),
    );

    const result = await adapter.syncObject({
      sourceApp: 'crm',
      entityType: 'customer',
      entityId: '201',
      jobType: 'upsert',
    });
    const projection = requireProjection(result);

    expect(result.status).toBe('indexed');
    expect(findCustomerUnique.calls[0]).toMatchObject({
      where: {
        id: 201n,
        isActive: true,
      },
    });
    expect(() => assertAiIndexObjectProjection(projection)).not.toThrow();
    expect(projection).toMatchObject({
      sourceApp: 'crm',
      entityType: 'customer',
      entityId: '201',
      title: 'LS Electric',
      target: {
        sourceApp: 'crm',
        path: '/?search=LS%20Electric',
      },
      metadata: {
        customerCode: 'crm-cust-ls',
        activityCount: 1,
      },
    });
    expect(projection.acl.snapshot).toMatchObject({
      policy: 'crm.customer.read',
      objectType: 'crm.customer',
      objectId: 'crm-cust-ls',
      access: 'crm-policy-or-owner',
      ownerUserIds: ['77'],
      ownerNames: ['김민준'],
    });
    expect(projection.bodyText).toContain('CRM Customer Recent Activities');
    expect(projection.bodyText).toContain('제안 금액 검토 회의');
    expect(projection.chunks?.map((chunk) => chunk.chunkKey)).toEqual([
      'crm-customer-overview',
      'crm-customer-contact',
      'crm-customer-activities',
    ]);
  });

  it('projects CRM customer activity rows into a valid AI index object', async () => {
    const activity = createActivityFixture();
    activity.ownerName = '박지원';
    activity.ownerUserId = 88n;
    const { adapter, findActivityUnique } = createAdapter(
      createOpportunityFixture(),
      false,
      createCustomerFixture(),
      activity,
    );

    const result = await adapter.syncObject({
      sourceApp: 'crm',
      entityType: 'activity',
      entityId: '301',
      jobType: 'upsert',
    });
    const projection = requireProjection(result);

    expect(result.status).toBe('indexed');
    expect(findActivityUnique.calls[0]).toMatchObject({
      where: {
        id: 301n,
        isActive: true,
      },
    });
    expect(() => assertAiIndexObjectProjection(projection)).not.toThrow();
    expect(projection).toMatchObject({
      sourceApp: 'crm',
      entityType: 'activity',
      entityId: '301',
      title: 'LS Electric · 제안 금액 검토 회의',
      metadata: {
        activityCode: 'crm-act-001',
        customerCode: 'crm-cust-ls',
      },
    });
    expect(projection.acl.snapshot).toMatchObject({
      policy: 'crm.customer.activity.read',
      objectType: 'crm.customer.activity',
      objectId: 'crm-act-001',
      parentObjectType: 'crm.customer',
      parentObjectId: 'crm-cust-ls',
      access: 'crm-policy-or-owner',
      ownerUserIds: ['88', '77'],
      ownerNames: ['박지원', '김민준'],
    });
    expect(projection.bodyText).toContain('CRM Customer Activity Source Context');
    expect(projection.bodyText).toContain('수정 견적 전달');
  });

  it('skips unsupported CRM entity types and invalid IDs', async () => {
    const { adapter, findUnique } = createAdapter(createOpportunityFixture(), false);

    await expect(adapter.syncObject({
      sourceApp: 'crm',
      entityType: 'contract',
      entityId: '101',
      jobType: 'upsert',
    })).resolves.toMatchObject({
      status: 'skipped',
      reasonCode: 'unsupported_entity_type',
    });

    await expect(adapter.syncObject({
      sourceApp: 'crm',
      entityType: 'opportunity',
      entityId: 'crm-opp-001',
      jobType: 'upsert',
    })).resolves.toMatchObject({
      status: 'skipped',
      reasonCode: 'invalid_opportunity_id',
    });

    expect(findUnique.calls).toHaveLength(0);
  });

  it('returns deleted when CRM source requests opportunity deletion', async () => {
    const { adapter, findUnique } = createAdapter(createOpportunityFixture(), false);

    await expect(adapter.syncObject({
      sourceApp: 'crm',
      entityType: 'opportunity',
      entityId: '101',
      jobType: 'delete',
    })).resolves.toMatchObject({
      status: 'deleted',
      reasonCode: 'deleted_by_source',
    });

    expect(findUnique.calls).toHaveLength(0);
  });
});
