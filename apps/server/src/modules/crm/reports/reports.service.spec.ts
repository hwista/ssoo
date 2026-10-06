import type {
  CrmContractPerformanceResponse,
  CrmOpportunity,
  CrmOpportunityListResponse,
} from '@ssoo/types/crm';
import type { CrmAccessService } from '../access/access.service.js';
import type { DatabaseService } from '../../../database/database.service.js';
import type { ContractService } from '../contract/contract.service.js';
import type { OpportunityService } from '../opportunity/opportunity.service.js';
import { ReportsService } from './reports.service.js';

function createOpportunity(seed: Partial<CrmOpportunity>): CrmOpportunity {
  return {
    id: 'crm-opp-001',
    groupId: 'crm-opp-001',
    customerName: 'LS Electric',
    opportunityName: '스마트 배전반 통합 관제',
    ownerName: '김민준',
    businessType: 'SI 구축',
    industryLine: '전력/제조',
    region: 'domestic',
    status: 'proposal',
    priority: 'high',
    version: 1,
    versionCount: 1,
    isLatest: true,
    confirmed: false,
    contractCreated: false,
    expectedStartDate: '2026-03-01',
    expectedEndDate: '2026-08-31',
    quoteStatus: 'review',
    revenueSubtotal: 500000000,
    specialDiscountType: 'amount',
    specialDiscountValue: 0,
    specialDiscountAmount: 0,
    revenueTotal: 500000000,
    costTotal: 140000000,
    marginTotal: 360000000,
    marginRate: 72,
    revenueLines: [],
    costLines: [],
    pmsHandoffStatus: 'planned',
    dmsLinkStatus: 'planned',
    adminBoundary: 'shared-admin',
    nextAction: '보고 기준 검토',
    updatedAt: '2026-07-07T01:00:00.000Z',
    ...seed,
  };
}

function createOpportunityResponse(items: CrmOpportunity[]): CrmOpportunityListResponse {
  const totalRevenue = items.reduce((sum, item) => sum + item.revenueTotal, 0);
  const totalCost = items.reduce((sum, item) => sum + item.costTotal, 0);
  return {
    summary: {
      totalCount: items.length,
      filteredCount: items.length,
      qualifiedCount: items.filter((item) => item.status === 'qualified').length,
      proposalCount: items.filter((item) => item.status === 'proposal').length,
      wonCount: items.filter((item) => item.status === 'won').length,
      totalRevenue,
      totalCost,
      totalMargin: totalRevenue - totalCost,
      grossMarginRate: totalRevenue > 0 ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 1000) / 10 : 0,
      boundaryNotice: 'CRM opportunity boundary',
      unimplementedIntegrations: [],
      activeFilters: { search: '', status: 'all', sort: 'updated-desc' },
    },
    items,
  };
}

function createPerformanceResponse(): CrmContractPerformanceResponse {
  return {
    summary: {
      year: 2026,
      contractCount: 1,
      planRevenueTotal: 300000000,
      planExternalCostTotal: 80000000,
      planMarginTotal: 220000000,
      actualRevenueTotal: 280000000,
      actualExternalCostTotal: 70000000,
      actualMarginTotal: 210000000,
      revenueDelta: -20000000,
      externalCostDelta: -10000000,
      marginDelta: -10000000,
      revenueAchievementRate: 93.33,
      externalCostAchievementRate: 87.5,
      activeFilters: { year: 2026, businessType: '', industryLine: '', region: 'all', search: '' },
      businessTypeOptions: ['SI 구축'],
      industryLineOptions: ['전력/제조'],
      boundaryNotice: 'CRM contract performance boundary',
    },
    items: [
      {
        contractId: 'crm-ct-001',
        contractCode: 'CT-2026-001',
        customerName: 'LS ITC',
        contractName: '보고 검증 계약',
        ownerName: '김민준',
        businessType: 'SI 구축',
        industryLine: '전력/제조',
        region: 'domestic',
        wbsCode: 'WBS-RPT-001',
        contractStartDate: '2026-01-01',
        contractEndDate: '2026-12-31',
        months: Array.from({ length: 12 }, (_, index) => ({
          month: index + 1,
          planRevenueAmount: index === 0 ? 300000000 : 0,
          planExternalCostAmount: index === 0 ? 80000000 : 0,
          planMarginAmount: index === 0 ? 220000000 : 0,
          actualRevenueAmount: index === 0 ? 280000000 : 0,
          actualExternalCostAmount: index === 0 ? 70000000 : 0,
          actualMarginAmount: index === 0 ? 210000000 : 0,
          revenueDelta: index === 0 ? -20000000 : 0,
          externalCostDelta: index === 0 ? -10000000 : 0,
          marginDelta: index === 0 ? -10000000 : 0,
        })),
        total: {
          month: 0,
          planRevenueAmount: 300000000,
          planExternalCostAmount: 80000000,
          planMarginAmount: 220000000,
          actualRevenueAmount: 280000000,
          actualExternalCostAmount: 70000000,
          actualMarginAmount: 210000000,
          revenueDelta: -20000000,
          externalCostDelta: -10000000,
          marginDelta: -10000000,
        },
      },
    ],
  };
}

function createConfirmationRow(seed: Record<string, unknown> = {}) {
  const querySnapshot = {
    year: 2026,
    businessType: '',
    industryLine: '',
    region: 'all',
    search: '',
  };
  const summarySnapshot = {
    year: 2026,
    opportunityCount: 1,
    contractCount: 1,
    pipelineRevenueTotal: 500000000,
    pipelineMarginTotal: 360000000,
    planRevenueTotal: 300000000,
    planMarginTotal: 220000000,
    actualRevenueTotal: 280000000,
    actualMarginTotal: 210000000,
    revenueDelta: -20000000,
    marginDelta: -10000000,
    revenueAchievementRate: 93.33,
    marginAchievementRate: 95.45,
    activeFilters: querySnapshot,
    businessTypeOptions: ['SI 구축'],
    industryLineOptions: ['전력/제조'],
    boundaryNotice: 'CRM report boundary',
    unavailableActions: [],
  };
  return {
    id: 7n,
    targetYear: 2026,
    businessType: '',
    industryLine: '',
    regionCode: 'all',
    searchText: '',
    statusCode: 'confirmed',
    querySnapshot,
    summarySnapshot,
    monthlyTrendSnapshot: createPerformanceResponse().items[0].months,
    breakdownsSnapshot: [],
    attentionItemsSnapshot: [],
    opportunityCount: 1,
    contractCount: 1,
    breakdownCount: 3,
    attentionItemCount: 2,
    pipelineRevenueTotal: 500000000n,
    planRevenueTotal: 300000000n,
    actualRevenueTotal: 280000000n,
    revenueDelta: -20000000n,
    marginDelta: -10000000n,
    memo: '월간 보고 확정',
    confirmedAt: '2026-07-09T01:00:00.000Z',
    reopenedAt: null,
    updatedAt: '2026-07-09T01:00:00.000Z',
    ...seed,
  };
}

function createService(db?: unknown) {
  const performanceQueries: unknown[] = [];
  const opportunities = [
    createOpportunity({}),
    createOpportunity({
      id: 'crm-opp-hold',
      opportunityName: '보류 보고 제외',
      status: 'hold',
      revenueTotal: 90000000,
      marginTotal: 50000000,
    }),
  ];
  const opportunityService: Pick<OpportunityService, 'listResponse'> = {
    listResponse: async () => createOpportunityResponse(opportunities),
  };
  const contractService: Pick<ContractService, 'getMonthlyPerformance'> = {
    getMonthlyPerformance: async (query) => {
      performanceQueries.push(query ?? {});
      return createPerformanceResponse();
    },
  };

  return {
    service: new ReportsService(
      opportunityService as OpportunityService,
      contractService as ContractService,
      db as DatabaseService,
      {
        actorForUser: async (id: bigint) => ({ userId: id.toString(), loginId: 'unit-test' }),
        resolveReadOrganization: async (_actor: unknown, id?: string) => id ? BigInt(id) : null,
        resolveWriteOrganization: async (id: bigint) => ({ user: { userId: id.toString(), loginId: 'unit-test' }, organizationId: 13n }),
        assertOrganizationCapability: async () => undefined,
      } as unknown as CrmAccessService,
    ),
    performanceQueries,
  };
}

describe('ReportsService', () => {
  it('builds a read-only reporting preview from pipeline and contract performance data', async () => {
    const { service } = createService();

    const result = await service.getPreview({ year: 2026 });

    expect(result.summary.opportunityCount).toBe(1);
    expect(result.summary.contractCount).toBe(1);
    expect(result.summary.pipelineRevenueTotal).toBe(500000000);
    expect(result.summary.pipelineMarginTotal).toBe(360000000);
    expect(result.summary.planRevenueTotal).toBe(300000000);
    expect(result.summary.actualRevenueTotal).toBe(280000000);
    expect(result.summary.marginAchievementRate).toBe(95.45);
    expect(result.summary.latestConfirmation).toBeNull();
    expect(result.monthlyTrend[0]).toMatchObject({
      month: 1,
      planRevenueAmount: 300000000,
      actualRevenueAmount: 280000000,
      revenueAchievementRate: 93.33,
    });
    expect(result.breakdowns).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'business-type:SI 구축',
        opportunityCount: 1,
        contractCount: 1,
      }),
      expect.objectContaining({
        id: 'wbs:WBS-RPT-001',
        contractCount: 1,
      }),
    ]));
    expect(result.attentionItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'opportunity', title: '스마트 배전반 통합 관제' }),
      expect.objectContaining({ kind: 'contract', title: '보고 검증 계약' }),
    ]));
  });

  it('passes normalized filters into the contract performance read model', async () => {
    const { service, performanceQueries } = createService();

    await service.getPreview({
      year: 2026,
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      region: 'domestic',
      search: '보고',
    });

    expect(performanceQueries).toEqual([{
      mode: 'operations',
      year: 2026,
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      region: 'domestic',
      search: '보고',
    }]);
  });

  it('surfaces the latest confirmed report snapshot for the active filters', async () => {
    let queryCalls = 0;
    const db = {
      client: { crmReportConfirmation: { findUnique: async () => ({ ownerOrganizationId: 13n }) } },
      $queryRaw: async () => {
        queryCalls += 1;
        return [createConfirmationRow()];
      },
    };
    const { service } = createService(db);

    const result = await service.getPreview({ year: 2026 });

    expect(queryCalls).toBe(1);
    expect(result.summary.latestConfirmation).toMatchObject({
      id: '7',
      status: 'confirmed',
      opportunityCount: 1,
      contractCount: 1,
      breakdownCount: 3,
      attentionItemCount: 2,
      memo: '월간 보고 확정',
    });
  });

  it('confirms the current reporting preview as a CRM-owned snapshot ledger', async () => {
    let executeCalls = 0;
    let insertCalls = 0;
    let transactionCalls = 0;
    const tx = {
      $executeRaw: async () => {
        executeCalls += 1;
        return 1;
      },
      $queryRaw: async () => {
        insertCalls += 1;
        return [createConfirmationRow()];
      },
    };
    const db = {
      $queryRaw: async () => [],
      $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => {
        transactionCalls += 1;
        return callback(tx);
      },
    };
    const { service } = createService(db);

    const result = await service.confirmReport({ year: 2026, memo: '월간 보고 확정' }, 11n);

    expect(transactionCalls).toBe(1);
    expect(executeCalls).toBe(1);
    expect(insertCalls).toBe(1);
    expect(result.boundaryNotice).toContain('CRM 보고 snapshot 원장');
    expect(result.confirmation).toMatchObject({
      id: '7',
      status: 'confirmed',
      year: 2026,
      opportunityCount: 1,
      contractCount: 1,
      pipelineRevenueTotal: 500000000,
      actualRevenueTotal: 280000000,
    });
    expect('latestConfirmation' in result.confirmation.summarySnapshot).toBe(false);
  });

  it('reopens a confirmed report snapshot without touching accounting or DMS state', async () => {
    let queryCalls = 0;
    const db = {
      client: { crmReportConfirmation: { findUnique: async () => ({ ownerOrganizationId: 13n }) } },
      $queryRaw: async () => {
        queryCalls += 1;
        return [
          createConfirmationRow({
            statusCode: 'reopened',
            reopenedAt: '2026-07-09T02:00:00.000Z',
            updatedAt: '2026-07-09T02:00:00.000Z',
          }),
        ];
      },
    };
    const { service } = createService(db);

    const result = await service.reopenReportConfirmation('7', 11n);

    expect(queryCalls).toBe(1);
    expect(result.confirmation).toMatchObject({
      id: '7',
      status: 'reopened',
      reopenedAt: '2026-07-09T02:00:00.000Z',
    });
    expect(result.boundaryNotice).toContain('회계 전표');
  });
});
