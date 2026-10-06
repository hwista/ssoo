import type { PlatformAdmissionService } from '../../common/onboarding/platform-admission.service.js';
import type { AiIndexingService } from '../../common/ai-index/ai-indexing.service.js';
import type { DatabaseService } from '../../../database/database.service.js';
import { CustomerService } from './customer.service.js';

interface ActivityRow {
  id: bigint;
  activityCode: string;
  customerId: bigint;
  sourceOpportunityId: bigint | null;
  sourceOpportunityCode: string | null;
  activityTypeCode: string;
  activityStatusCode: string;
  subject: string;
  occurredAt: Date;
  dueAt: Date | null;
  ownerName: string;
  ownerUserId: bigint | null;
  summary: string;
  nextAction: string | null;
  isActive: boolean;
  updatedAt: Date;
}

interface CustomerRow {
  id: bigint;
  customerCode: string;
  customerName: string;
  customerTypeCode: string;
  industryLine: string;
  regionCode: string;
  ownerName: string;
  ownerUserId: bigint | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  sourceOpportunityId: bigint | null;
  latestOpportunityCode: string | null;
  latestActivityAt: Date | null;
  lastInteractionSummary: string | null;
  nextAction: string;
  adminBoundaryCode: string;
  isActive: boolean;
  updatedAt: Date;
}

interface CustomerWithActivities extends CustomerRow {
  activities: ActivityRow[];
}

interface MockState {
  customers: CustomerRow[];
  activities: ActivityRow[];
  queuedJobs: unknown[];
  queueFailuresByEntityId: Set<string>;
  customerCreates: unknown[];
  customerUpdates: unknown[];
  activityCreates: unknown[];
  nextCustomerId: bigint;
  nextActivityId: bigint;
}

interface MockClient {
  crmCustomer: {
    findMany: (args?: unknown) => Promise<unknown[]>;
    findFirst: (args: unknown) => Promise<CustomerWithActivities | null>;
    create: (args: unknown) => Promise<{ id: bigint }>;
    update: (args: unknown) => Promise<CustomerWithActivities | null>;
  };
  crmCustomerActivity: {
    findMany: (args?: unknown) => Promise<unknown[]>;
    create: (args: unknown) => Promise<{ id: bigint }>;
  };
  $transaction: <T>(callback: (tx: MockClient) => Promise<T>) => Promise<T>;
}

function createCustomerFixture(): CustomerRow {
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
    isActive: true,
    updatedAt: new Date('2026-06-08T09:31:00.000Z'),
  };
}

function createActivityFixture(): ActivityRow {
  return {
    id: 301n,
    activityCode: 'crm-act-001',
    customerId: 201n,
    sourceOpportunityId: 101n,
    sourceOpportunityCode: 'crm-opp-001',
    activityTypeCode: 'opportunity-next-action',
    activityStatusCode: 'done',
    subject: '스마트 배전반 통합 관제 고도화',
    occurredAt: new Date('2026-06-08T09:30:00.000Z'),
    dueAt: null,
    ownerName: '김민준',
    ownerUserId: 77n,
    summary: '제안 금액 검토 후 계약 후보 전환 여부 결정',
    nextAction: '수정 견적 전달',
    isActive: true,
    updatedAt: new Date('2026-06-08T09:31:00.000Z'),
  };
}

function withActivities(state: MockState, customer: CustomerRow): CustomerWithActivities {
  return {
    ...customer,
    activities: state.activities
      .filter((activity) => activity.customerId === customer.id && activity.isActive)
      .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime()),
  };
}

function findCustomerFromArgs(state: MockState, args: unknown): CustomerWithActivities | null {
  const normalized = args as { where?: { OR?: Array<{ id?: bigint; customerCode?: string }>; isActive?: boolean } };
  const filters = normalized.where?.OR ?? [];
  const row = state.customers.find((customer) => {
    if (normalized.where?.isActive === true && !customer.isActive) {
      return false;
    }

    return filters.some((filter) => (
      (filter.id !== undefined && filter.id === customer.id)
      || (filter.customerCode !== undefined && filter.customerCode === customer.customerCode)
    ));
  });

  return row ? withActivities(state, row) : null;
}

function findCustomersFromArgs(state: MockState, args?: unknown): unknown[] {
  const normalized = args as {
    where?: { id?: { in?: bigint[] }; isActive?: boolean };
    select?: Record<string, boolean>;
    take?: number;
  } | undefined;
  const ids = normalized?.where?.id?.in;
  const rows = state.customers
    .filter((customer) => normalized?.where?.isActive !== true || customer.isActive)
    .filter((customer) => !ids || ids.includes(customer.id))
    .sort((left, right) => (
      right.updatedAt.getTime() - left.updatedAt.getTime()
      || Number(left.id - right.id)
    ))
    .slice(0, normalized?.take ?? state.customers.length);

  if (normalized?.select) {
    return rows.map((customer) => ({
      id: customer.id,
      updatedAt: customer.updatedAt,
    }));
  }

  return rows.map((customer) => withActivities(state, customer));
}

function findActivitiesFromArgs(state: MockState, args?: unknown): unknown[] {
  const normalized = args as {
    where?: {
      id?: { in?: bigint[] };
      customerId?: { in?: bigint[] };
      isActive?: boolean;
      customer?: { isActive?: boolean };
    };
    take?: number;
  } | undefined;
  const ids = normalized?.where?.id?.in;
  const customerIds = normalized?.where?.customerId?.in;
  const rows = state.activities
    .filter((activity) => normalized?.where?.isActive !== true || activity.isActive)
    .filter((activity) => {
      if (normalized?.where?.customer?.isActive !== true) {
        return true;
      }
      return state.customers.some((customer) => customer.id === activity.customerId && customer.isActive);
    })
    .filter((activity) => !ids || ids.includes(activity.id))
    .filter((activity) => !customerIds || customerIds.includes(activity.customerId))
    .sort((left, right) => (
      right.updatedAt.getTime() - left.updatedAt.getTime()
      || Number(left.id - right.id)
    ))
    .slice(0, normalized?.take ?? state.activities.length);

  return rows.map((activity) => ({
    id: activity.id,
    customerId: activity.customerId,
    updatedAt: activity.updatedAt,
  }));
}

function createMockServices(seedCustomer = createCustomerFixture(), seedActivity = createActivityFixture()) {
  const state: MockState = {
    customers: [seedCustomer],
    activities: [seedActivity],
    queuedJobs: [],
    queueFailuresByEntityId: new Set<string>(),
    customerCreates: [],
    customerUpdates: [],
    activityCreates: [],
    nextCustomerId: 900n,
    nextActivityId: 950n,
  };

  const client = {} as MockClient;
  client.crmCustomer = {
      findMany: async (args?: unknown) => findCustomersFromArgs(state, args),
      findFirst: async (args: unknown) => findCustomerFromArgs(state, args),
      create: async (args: unknown) => {
        state.customerCreates.push(args);
        const data = (args as { data: Record<string, unknown> }).data;
        const row: CustomerRow = {
          id: state.nextCustomerId,
          customerCode: String(data.customerCode),
          customerName: String(data.customerName),
          customerTypeCode: String(data.customerTypeCode),
          industryLine: String(data.industryLine),
          regionCode: String(data.regionCode),
          ownerName: String(data.ownerName),
          ownerUserId: data.ownerUserId as bigint | null,
          contactName: data.contactName as string | null,
          contactEmail: data.contactEmail as string | null,
          contactPhone: data.contactPhone as string | null,
          sourceOpportunityId: data.sourceOpportunityId as bigint | null,
          latestOpportunityCode: data.latestOpportunityCode as string | null,
          latestActivityAt: data.latestActivityAt as Date | null,
          lastInteractionSummary: data.lastInteractionSummary as string | null,
          nextAction: String(data.nextAction),
          adminBoundaryCode: String(data.adminBoundaryCode),
          isActive: true,
          updatedAt: new Date('2026-07-07T09:00:00.000Z'),
        };
        state.nextCustomerId += 1n;
        state.customers.push(row);
        return { id: row.id };
      },
      update: async (args: unknown) => {
        state.customerUpdates.push(args);
        const normalized = args as { where: { id: bigint }; data: Record<string, unknown> };
        const row = state.customers.find((customer) => customer.id === normalized.where.id);
        if (row) {
          row.customerName = String(normalized.data.customerName ?? row.customerName);
          row.customerTypeCode = String(normalized.data.customerTypeCode ?? row.customerTypeCode);
          row.industryLine = String(normalized.data.industryLine ?? row.industryLine);
          row.regionCode = String(normalized.data.regionCode ?? row.regionCode);
          row.ownerName = String(normalized.data.ownerName ?? row.ownerName);
          row.ownerUserId = normalized.data.ownerUserId as bigint | null;
          row.latestActivityAt = (normalized.data.latestActivityAt as Date | null | undefined) ?? row.latestActivityAt;
          row.lastInteractionSummary = (
            normalized.data.lastInteractionSummary as string | null | undefined
          ) ?? row.lastInteractionSummary;
          row.nextAction = String(normalized.data.nextAction ?? row.nextAction);
          row.updatedAt = new Date('2026-07-07T09:10:00.000Z');
        }
        return row ? withActivities(state, row) : null;
      },
    };
  client.crmCustomerActivity = {
      findMany: async (args?: unknown) => findActivitiesFromArgs(state, args),
      create: async (args: unknown) => {
        state.activityCreates.push(args);
        const data = (args as { data: Record<string, unknown> }).data;
        const row: ActivityRow = {
          id: state.nextActivityId,
          activityCode: String(data.activityCode),
          customerId: data.customerId as bigint,
          sourceOpportunityId: data.sourceOpportunityId as bigint | null,
          sourceOpportunityCode: data.sourceOpportunityCode as string | null,
          activityTypeCode: String(data.activityTypeCode),
          activityStatusCode: String(data.activityStatusCode),
          subject: String(data.subject),
          occurredAt: data.occurredAt as Date,
          dueAt: data.dueAt as Date | null,
          ownerName: String(data.ownerName),
          ownerUserId: data.ownerUserId as bigint | null,
          summary: String(data.summary),
          nextAction: data.nextAction as string | null,
          isActive: true,
          updatedAt: new Date('2026-07-07T09:20:00.000Z'),
        };
        state.nextActivityId += 1n;
        state.activities.push(row);
        return { id: row.id };
      },
    };
  client.$transaction = async <T>(callback: (tx: MockClient) => Promise<T>) => callback(client);

  const db = { client } as unknown as DatabaseService;
  const aiIndexingService = {
    queueJob: async (request: unknown) => {
      const entityId = (request as { entityId?: string }).entityId;
      if (entityId && state.queueFailuresByEntityId.has(entityId)) {
        throw new Error(`queue failed for ${entityId}`);
      }
      state.queuedJobs.push(request);
      return {};
    },
  } as unknown as AiIndexingService;
  const service = new CustomerService(db, aiIndexingService, { resolveBusinessOrganization: async () => 13n } as unknown as PlatformAdmissionService);

  return {
    service,
    state,
  };
}

describe('CustomerService', () => {
  it('lists CRM customers with opportunity backfilled activities', async () => {
    const { service } = createMockServices();

    const result = await service.listResponse({ search: '배전반' });

    expect(result.summary.totalCount).toBe(1);
    expect(result.summary.filteredCount).toBe(1);
    expect(result.summary.activityBackfillCount).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: '201',
      code: 'crm-cust-ls',
      customerName: 'LS Electric',
      type: 'active',
      ownerUserId: '77',
      latestOpportunityCode: 'crm-opp-001',
      activityCount: 1,
    });
  });

  it('creates a CRM customer and queues customer AI projection sync', async () => {
    const { service, state } = createMockServices();

    const customer = await service.createCustomer({
      customerName: '신규 고객',
      type: 'prospect',
      industryLine: '공공',
      region: 'domestic',
      ownerName: '박영업',
      ownerUserId: '88',
      contactName: '최고객',
      nextAction: '초기 미팅 일정 확정',
    }, 1n);

    expect(customer.customerName).toBe('신규 고객');
    expect(customer.ownerUserId).toBe('88');
    expect(state.customerCreates).toHaveLength(1);
    expect(state.queuedJobs).toContainEqual(expect.objectContaining({
      sourceApp: 'crm',
      entityType: 'customer',
      entityId: customer.id,
      jobType: 'upsert',
    }));
  });

  it('adds a CRM customer activity, updates the customer snapshot, and queues both projections', async () => {
    const { service, state } = createMockServices();

    const activity = await service.addActivity('201', {
      type: 'meeting',
      status: 'done',
      subject: '계약 전환 협의',
      occurredAt: '2026-07-07T09:20:00.000Z',
      ownerName: '김민준',
      ownerUserId: '77',
      summary: '계약 조건과 납기 기준 재확인',
      nextAction: '계약 초안 공유',
    }, 1n);

    expect(activity).toMatchObject({
      customerId: '201',
      type: 'meeting',
      subject: '계약 전환 협의',
      nextAction: '계약 초안 공유',
    });
    expect(state.activityCreates).toHaveLength(1);
    expect(state.customerUpdates).toContainEqual(expect.objectContaining({
      where: { id: 201n },
      data: expect.objectContaining({
        lastInteractionSummary: '계약 조건과 납기 기준 재확인',
        nextAction: '계약 초안 공유',
      }),
    }));
    expect(state.queuedJobs).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceApp: 'crm', entityType: 'activity', entityId: activity.id }),
      expect.objectContaining({ sourceApp: 'crm', entityType: 'customer', entityId: '201' }),
    ]));
  });

  it('queues controlled CRM customer/activity AI index backfill jobs', async () => {
    const { service, state } = createMockServices();

    const result = await service.queueAiIndexBackfill({
      customerIds: ['201'],
      limit: 10,
      reasonCode: 'manual_customer_backfill',
    }, {
      userId: '1',
      loginId: 'admin',
    });

    expect(result).toMatchObject({
      sourceApp: 'crm',
      entityTypes: ['customer', 'activity'],
      jobType: 'backfill',
      requestedCustomerCount: 1,
      requestedActivityCount: 0,
      selectedCustomerCount: 1,
      selectedActivityCount: 1,
      queuedCount: 2,
      failedCount: 0,
      skippedCount: 0,
      limit: 10,
      reasonCode: 'manual_customer_backfill',
    });
    expect(result.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityType: 'customer', entityId: '201', status: 'queued' }),
      expect.objectContaining({ entityType: 'activity', entityId: '301', customerId: '201', status: 'queued' }),
    ]));
    expect(state.queuedJobs).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceApp: 'crm',
        entityType: 'customer',
        entityId: '201',
        jobType: 'backfill',
        priority: 30,
        payload: expect.objectContaining({
          backfill: true,
          reasonCode: 'manual_customer_backfill',
        }),
      }),
      expect.objectContaining({
        sourceApp: 'crm',
        entityType: 'activity',
        entityId: '301',
        jobType: 'backfill',
        priority: 30,
        payload: expect.objectContaining({
          backfill: true,
          customerId: '201',
        }),
      }),
    ]));
  });

  it('reports CRM customer/activity AI index backfill queue failures without aborting the batch', async () => {
    const { service, state } = createMockServices();
    state.queueFailuresByEntityId.add('301');

    const result = await service.queueAiIndexBackfill({
      customerIds: ['201'],
      limit: 10,
    }, {
      userId: '1',
      loginId: 'admin',
    });

    expect(result).toMatchObject({
      selectedCustomerCount: 1,
      selectedActivityCount: 1,
      queuedCount: 1,
      failedCount: 1,
      skippedCount: 0,
    });
    expect(result.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ entityType: 'customer', entityId: '201', status: 'queued' }),
      expect.objectContaining({
        entityType: 'activity',
        entityId: '301',
        status: 'failed',
        errorMessage: 'queue failed for 301',
      }),
    ]));
  });

  it('rejects invalid CRM customer/activity AI index backfill ids before querying', async () => {
    const { service } = createMockServices();

    await expect(service.queueAiIndexBackfill({
      customerIds: ['crm-cust-ls'],
    })).rejects.toThrow('유효한 CRM 고객 식별자 목록이 아닙니다.');

    await expect(service.queueAiIndexBackfill({
      activityIds: ['crm-act-001'],
    })).rejects.toThrow('유효한 CRM 고객 활동 식별자 목록이 아닙니다.');
  });
});
