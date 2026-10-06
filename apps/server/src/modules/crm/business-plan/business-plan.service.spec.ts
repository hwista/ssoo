import type {
  CrmContractPerformanceResponse,
  CrmContract,
  CrmOpportunity,
  CrmOpportunityListResponse,
} from '@ssoo/types/crm';
import type { CrmAccessService } from '../access/access.service.js';
import type { DatabaseService } from '../../../database/database.service.js';
import type { ContractService } from '../contract/contract.service.js';
import type { OpportunityService } from '../opportunity/opportunity.service.js';
import { BusinessPlanService } from './business-plan.service.js';

function createAsyncMock<T>(responses: T[] = []) {
  const calls: unknown[][] = [];
  const fn = async (...args: unknown[]) => {
    calls.push(args);
    return responses.shift();
  };
  return Object.assign(fn, { calls });
}

function createValueAsyncMock<T>(value: T) {
  const calls: unknown[][] = [];
  const fn = async (...args: unknown[]) => {
    calls.push(args);
    return value;
  };
  return Object.assign(fn, { calls });
}

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
    expectedStartDate: '2026-08-01',
    expectedEndDate: '2026-12-31',
    quoteStatus: 'review',
    revenueSubtotal: 700000000,
    specialDiscountType: 'amount',
    specialDiscountValue: 0,
    specialDiscountAmount: 0,
    revenueTotal: 700000000,
    costTotal: 420000000,
    marginTotal: 280000000,
    marginRate: 40,
    revenueLines: [],
    costLines: [],
    pmsHandoffStatus: 'planned',
    dmsLinkStatus: 'planned',
    adminBoundary: 'shared-admin',
    nextAction: '사업계획 후보 검토',
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

function createPerformanceResponse(year: number, planAmount: number, actualAmount: number): CrmContractPerformanceResponse {
  const planMarginAmount = planAmount - 120000000;
  const actualMarginAmount = actualAmount - 90000000;
  return {
    summary: {
      year,
      contractCount: planAmount > 0 || actualAmount > 0 ? 1 : 0,
      planRevenueTotal: planAmount,
      planExternalCostTotal: 120000000,
      planMarginTotal: planMarginAmount,
      actualRevenueTotal: actualAmount,
      actualExternalCostTotal: 90000000,
      actualMarginTotal: actualMarginAmount,
      revenueDelta: actualAmount - planAmount,
      externalCostDelta: -30000000,
      marginDelta: actualMarginAmount - planMarginAmount,
      revenueAchievementRate: planAmount > 0 ? Math.round((actualAmount / planAmount) * 10000) / 100 : 0,
      externalCostAchievementRate: 75,
      activeFilters: { year, businessType: '', industryLine: '', region: 'all', search: '' },
      businessTypeOptions: ['SI 구축'],
      industryLineOptions: ['전력/제조'],
      boundaryNotice: 'CRM contract performance boundary',
    },
    items: planAmount > 0 || actualAmount > 0 ? [
      {
        contractId: `crm-ct-${year}`,
        contractCode: `CT-${year}`,
        customerName: 'LS ITC',
        contractName: `${year}년 통합 계약`,
        ownerName: '김민준',
        businessType: 'SI 구축',
        industryLine: '전력/제조',
        region: 'domestic',
        wbsCode: `WBS-${year}`,
        contractStartDate: `${year}-01-01`,
        contractEndDate: `${year}-12-31`,
        months: Array.from({ length: 12 }, (_, index) => ({
          month: index + 1,
          planRevenueAmount: index === 0 ? planAmount : 0,
          planExternalCostAmount: index === 0 ? 120000000 : 0,
          planMarginAmount: index === 0 ? planMarginAmount : 0,
          actualRevenueAmount: index === 0 ? actualAmount : 0,
          actualExternalCostAmount: index === 0 ? 90000000 : 0,
          actualMarginAmount: index === 0 ? actualMarginAmount : 0,
          revenueDelta: index === 0 ? actualAmount - planAmount : 0,
          externalCostDelta: index === 0 ? -30000000 : 0,
          marginDelta: index === 0 ? actualMarginAmount - planMarginAmount : 0,
        })),
        total: {
          month: 0,
          planRevenueAmount: planAmount,
          planExternalCostAmount: 120000000,
          planMarginAmount,
          actualRevenueAmount: actualAmount,
          actualExternalCostAmount: 90000000,
          actualMarginAmount,
          revenueDelta: actualAmount - planAmount,
          externalCostDelta: -30000000,
          marginDelta: actualMarginAmount - planMarginAmount,
        },
      },
    ] : [],
  };
}

function createService(db?: Pick<DatabaseService, '$queryRaw' | '$executeRaw' | 'client'>, contracts: CrmContract[] = []) {
  const performanceQueries: unknown[] = [];
  const opportunityService: Pick<OpportunityService, 'listResponse'> = {
    listResponse: async () => createOpportunityResponse([
      createOpportunity({}),
      createOpportunity({
        id: 'crm-opp-002',
        opportunityName: '보류된 고도화',
        status: 'hold',
        expectedStartDate: '2026-09-01',
        revenueTotal: 500000000,
      }),
      createOpportunity({
        id: 'crm-opp-003',
        opportunityName: '차년도 확장',
        status: 'qualified',
        expectedStartDate: '2027-03-01',
        revenueTotal: 300000000,
      }),
    ]),
  };
  const contractService: Pick<ContractService, 'getMonthlyPerformance' | 'listContracts'> = {
    listContracts: async () => contracts,
    getMonthlyPerformance: async (query) => {
      const normalizedQuery = query ?? {};
      performanceQueries.push(normalizedQuery);
      const year = Number(normalizedQuery.year);
      if (year === 2026) {
        return createPerformanceResponse(year, 200000000, 180000000);
      }
      if (year === 2027) {
        return createPerformanceResponse(year, 120000000, 60000000);
      }
      return createPerformanceResponse(year, 0, 0);
    },
  };

  return {
    service: new BusinessPlanService(
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

describe('BusinessPlanService', () => {
  it('rejects all bulk rows before writing when a later row is invalid', async () => {
    const execute = createValueAsyncMock(1);
    const db = { $queryRaw: createValueAsyncMock([{ id: 1n, baseYear: 2026, isLatest: true, confirmed: false }]), $executeRaw: execute, client: { $transaction: async () => { throw new Error('must not start transaction'); } } };
    const { service } = createService(db as unknown as DatabaseService);
    const row = { businessType: 'SI', industryLine: 'IT', ownerName: '담당', region: 'unspecified' as const, businessName: '유효 행', monthlyRevenueAmounts: Array(12).fill(0) as number[], monthlyExternalCostAmounts: Array(12).fill(0) as number[], nextYearRevenueAmount: 0, nextYearExternalCostAmount: 0, followingYearRevenueAmount: 0, followingYearExternalCostAmount: 0 };
    await expect(service.savePlanRows('1', [row, { ...row, businessName: '' }], 7n)).rejects.toThrow('사업명');
    await expect(service.savePlanRows('1', [{ ...row, rowCode: 'A' }, { ...row, rowCode: 'A' }], 7n)).rejects.toThrow('중복');
    await expect(service.savePlanRows('1', [{ ...row, nextYearRevenueAmount: 1e20 }], 7n)).rejects.toThrow('안전');
    expect(execute.calls).toHaveLength(0);
  });

  it('uses only confirmed ongoing contracts and preserves billing cents in won and unspecified region', async () => {
    const contract = { id: '1', confirmed: true, contractStartDate: '2025-01-01', contractEndDate: '2026-02-28', businessType: 'SI', industryLine: 'IT', ownerName: '담당', contractName: '진행', region: 'unspecified', revenueTotal: 140000000, externalCostTotal: 70000000, billingPlan: [{ billingYm: '2026/01', revenueAmount: 100000001, externalCostAmount: 30000000 }, { billingYm: '2025/12', revenueAmount: 39999999, externalCostAmount: 40000000 }] } as CrmContract;
    const { service } = createService(undefined, [contract, { ...contract, id: '2', confirmed: false }, { ...contract, id: '3', contractStartDate: '2026-01-01' }, { ...contract, id: '4', contractEndDate: '2025-12-31' }]);
    const user = { userId: '7', loginId: 'unit-test' } as Parameters<BusinessPlanService['getCarryContracts']>[1];
    const billing = await service.getCarryContracts({ baseYear: 2026 }, user);
    expect(billing).toHaveLength(1);
    expect(billing[0]?.row.region).toBe('unspecified');
    expect(billing[0]?.row.monthlyRevenueAmounts).toEqual([100000001, ...Array(11).fill(0)]);
    const progress = await service.getCarryContracts({ baseYear: 2026, method: 'progress' }, user);
    expect(progress[0]?.row.monthlyRevenueAmounts).toEqual([10000000, 10000000, ...Array(10).fill(0)]);
    expect(progress[0]?.row.monthlyExternalCostAmounts).toEqual([5000000, 5000000, ...Array(10).fill(0)]);
  });

  it('keeps zero billing groups, excludes actual-only contracts, and does not require opportunity access in source mode', async () => {
    const response = createPerformanceResponse(2026, 1, 0);
    const sample = response.items[0]!;
    const zeroMonths = sample.months.map((month) => ({ ...month, planRevenueAmount: 0, planExternalCostAmount: 0, planMarginAmount: 0, actualRevenueAmount: 0, actualExternalCostAmount: 0, actualMarginAmount: 0 }));
    response.items = [
      { ...sample, contractId: 'zero', wbsCode: undefined, hasBillingPlanInYear: true, months: zeroMonths },
      { ...sample, contractId: 'actual-only', wbsCode: undefined, hasBillingPlanInYear: false },
    ];
    const service = new BusinessPlanService(
      { listResponse: async () => { throw new Error('opportunities unavailable'); } } as unknown as OpportunityService,
      { getMonthlyPerformance: async () => response } as unknown as ContractService,
    );
    const result = await service.getPerformancePreview({ year: 2026, mode: 'source-compatible' });
    expect(result.rows.map((row) => row.key)).toEqual(['contract:zero']);
    expect(result.summary.actualRevenueTotal).toBe(0);
    expect(result.summary.confirmedPlanAvailable).toBe(false);
  });

  it('preserves offsetting months and approved case-insensitive WBS grouping', async () => {
    const response = createPerformanceResponse(2026, 1, 0);
    const sample = response.items[0]!;
    const months = sample.months.map((month, index) => ({ ...month, planRevenueAmount: index === 0 ? 100 : index === 1 ? -100 : 0, planExternalCostAmount: 0, actualRevenueAmount: 0, actualExternalCostAmount: 0 }));
    response.items = [{ ...sample, contractId: 'a', wbsCode: ' abc ', hasBillingPlanInYear: true, months }, { ...sample, contractId: 'b', wbsCode: 'ABC', hasBillingPlanInYear: true, months }];
    const service = new BusinessPlanService(
      { listResponse: async () => createOpportunityResponse([]) } as unknown as OpportunityService,
      { getMonthlyPerformance: async () => response } as unknown as ContractService,
    );
    for (const mode of ['source-compatible', 'extended-actual'] as const) {
      const result = await service.getPerformancePreview({ year: 2026, mode });
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]?.key).toBe('wbs:ABC');
      const field = mode === 'source-compatible' ? 'actualRevenueAmount' : 'planRevenueAmount';
      expect(result.rows[0]?.months[0]?.[field]).toBe(200);
      expect(result.rows[0]?.months[1]?.[field]).toBe(-200);
      expect(result.rows[0]?.total[field]).toBe(0);
    }
  });

  it('builds a three-year read-only preview from pipeline and contract performance', async () => {
    const { service } = createService();

    const result = await service.getPreview({ baseYear: 2026 });

    expect(result.summary.baseYear).toBe(2026);
    expect(result.summary.yearCount).toBe(3);
    expect(result.summary.pipelineAmountTotal).toBe(1000000000);
    expect(result.summary.contractPlanAmountTotal).toBe(320000000);
    expect(result.summary.contractActualAmountTotal).toBe(240000000);
    expect(result.summary.planCandidateAmountTotal).toBe(1320000000);
    expect(result.summary.actualGapAmountTotal).toBe(-1080000000);
    expect(result.summary.unavailableActions).toEqual(expect.arrayContaining([
      '내부원가/AMS 원가 저장',
    ]));
    expect(result.years.map((item) => item.year)).toEqual([2026, 2027, 2028]);
    expect(result.years[0]).toMatchObject({
      pipelineAmount: 700000000,
      contractPlanAmount: 200000000,
      contractActualAmount: 180000000,
      planCandidateAmount: 900000000,
      actualGapAmount: -720000000,
    });
  });

  it('passes normalized filters into the contract performance read model', async () => {
    const { service, performanceQueries } = createService();

    await service.getPreview({
      baseYear: 2026,
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      region: 'domestic',
      search: 'LS',
    });

    expect(performanceQueries).toHaveLength(3);
    expect(performanceQueries[0]).toEqual({
      year: 2026,
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      region: 'domestic',
      search: 'LS',
    });
  });

  it('builds a monthly business plan performance preview from pipeline candidates and confirmed contract performance', async () => {
    const { service } = createService();

    const result = await service.getPerformancePreview({ year: 2026 });

    expect(result.summary.year).toBe(2026);
    expect(result.summary.mode).toBe('extended-actual');
    expect(result.summary.actualBasisLabel).toBe('계약 청구실적 + 직접실적 + 확정원가');
    expect(result.summary.rowCount).toBe(2);
    expect(result.summary.confirmedPlanAvailable).toBe(false);
    expect(result.summary.planBasisLabel).toBe('Pipeline 후보 + 확정 계약 청구계획');
    expect(result.summary.planRevenueTotal).toBe(900000000);
    expect(result.summary.planCostTotal).toBe(540000000);
    expect(result.summary.planMarginTotal).toBe(360000000);
    expect(result.summary.actualRevenueTotal).toBe(180000000);
    expect(result.summary.actualCostTotal).toBe(90000000);
    expect(result.summary.actualMarginTotal).toBe(90000000);
    expect(result.summary.revenueGapTotal).toBe(-720000000);
    expect(result.summary.marginGapTotal).toBe(-270000000);
    expect(result.summary.unavailableActions).toEqual(expect.arrayContaining([
      '확정 사업계획 차수 기준 비교',
      '확정 원가 회계/지급 반영',
    ]));
    expect(result.months[0]).toMatchObject({
      month: 1,
      planRevenueAmount: 200000000,
      actualRevenueAmount: 180000000,
      revenueGapAmount: -20000000,
    });
    expect(result.months[7]).toMatchObject({
      month: 8,
      planRevenueAmount: 700000000,
      actualRevenueAmount: 0,
      revenueGapAmount: -700000000,
    });
    expect(result.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'pipeline', label: '스마트 배전반 통합 관제' }),
      expect.objectContaining({ source: 'contract', label: '2026년 통합 계약', wbsCode: 'WBS-2026' }),
    ]));
  });

  it('adjusts duplicated contract external costs when confirmed AMS cost inputs share the same WBS', async () => {
    const db = {
      $queryRaw: createAsyncMock([
        [],
        [],
        [
          {
            costSource: 'internal',
            id: 31n,
            targetYear: 2026,
            businessType: 'SI 구축',
            industryLine: '전력/제조',
            ownerName: '김민준',
            regionCode: 'domestic',
            wbsCode: 'WBS-2026',
            vendorName: null,
            monthlyPlanAmounts: [12000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            monthlyActualAmounts: [6000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            planAmountTotal: 12000000n,
            actualAmountTotal: 6000000n,
            confirmedAt: new Date('2026-07-08T01:00:00.000Z'),
          },
          {
            costSource: 'ams-external',
            id: 32n,
            targetYear: 2026,
            businessType: 'SI 구축',
            industryLine: '전력/제조',
            ownerName: '김민준',
            regionCode: 'domestic',
            wbsCode: 'WBS-2026',
            vendorName: '에이엠서비스',
            monthlyPlanAmounts: [24000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            monthlyActualAmounts: [18000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            planAmountTotal: 24000000n,
            actualAmountTotal: 18000000n,
            confirmedAt: new Date('2026-07-08T01:00:00.000Z'),
          },
        ],
        [],
      ]),
      $executeRaw: createValueAsyncMock(1),
      client: {},
    };
    const { service } = createService(db as unknown as DatabaseService);

    const result = await service.getPerformancePreview({ year: 2026 });

    expect(result.summary.rowCount).toBe(4);
    expect(result.summary.costBasisLabel).toBe('사업계획 외부원가 + 계약 청구실적 + 확정 내부원가/AMS 원가(AMS WBS 계약 외부원가 제외)');
    expect(result.summary.confirmedCostInputCount).toBe(2);
    expect(result.summary.confirmedInternalCostInputCount).toBe(1);
    expect(result.summary.confirmedAmsExternalCostInputCount).toBe(1);
    expect(result.summary.amsExternalCostAdjustedWbsCount).toBe(1);
    expect(result.summary.amsExternalCostAdjustedPlanAmountTotal).toBe(120000000);
    expect(result.summary.amsExternalCostAdjustedActualAmountTotal).toBe(90000000);
    expect(result.summary.planCostTotal).toBe(456000000);
    expect(result.summary.actualCostTotal).toBe(24000000);
    expect(result.months[0]).toMatchObject({
      month: 1,
      planCostAmount: 36000000,
      actualCostAmount: 24000000,
    });
    expect(result.rows.find((row) => row.source === 'contract')).toMatchObject({
      wbsCode: 'WBS-2026',
      total: expect.objectContaining({
        planCostAmount: 0,
        actualCostAmount: 0,
      }),
    });
    expect(result.rows.filter((row) => row.source === 'confirmed-cost')).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: '내부원가 확정 · WBS-2026',
        wbsCode: 'WBS-2026',
        total: expect.objectContaining({
          planCostAmount: 12000000,
          actualCostAmount: 6000000,
        }),
      }),
      expect.objectContaining({
        label: 'AMS 정산 확정 · 에이엠서비스',
        wbsCode: 'WBS-2026',
        total: expect.objectContaining({
          planCostAmount: 24000000,
          actualCostAmount: 18000000,
        }),
      }),
    ]));
  });

  it('adds manual actual input rows to the business plan performance preview', async () => {
    const db = {
      $queryRaw: createAsyncMock([
        [],
        [],
        [],
        [
          {
            id: 41n,
            targetYear: 2026,
            businessType: 'SI 구축',
            industryLine: '전력/제조',
            ownerName: '김민준',
            regionCode: 'domestic',
            wbsCode: 'WBS-MANUAL',
            monthlyRevenueAmounts: [50000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            monthlyCostAmounts: [20000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            revenueAmountTotal: 50000000n,
            costAmountTotal: 20000000n,
            memo: '직접 실적 조정',
            updatedAt: new Date('2026-07-09T01:00:00.000Z'),
          },
        ],
      ]),
      $executeRaw: createValueAsyncMock(1),
      client: {},
    };
    const { service } = createService(db as unknown as DatabaseService);

    const result = await service.getPerformancePreview({ year: 2026 });

    expect(result.summary.directActualInputCount).toBe(1);
    expect(result.summary.directActualRevenueTotal).toBe(50000000);
    expect(result.summary.directActualCostTotal).toBe(20000000);
    expect(result.summary.actualRevenueTotal).toBe(230000000);
    expect(result.summary.actualCostTotal).toBe(110000000);
    expect(result.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'manual-actual',
        label: '직접 실적 입력 · WBS-MANUAL',
        wbsCode: 'WBS-MANUAL',
        total: expect.objectContaining({
          actualRevenueAmount: 50000000,
          actualCostAmount: 20000000,
        }),
      }),
    ]));
  });

  it('saves manual monthly actual input with a stable ledger activity', async () => {
    const db = {
      $queryRaw: createAsyncMock([
        [{
          id: 41n,
          targetYear: 2026,
          businessType: 'SI 구축',
          industryLine: '전력/제조',
          ownerName: '김민준',
          regionCode: 'domestic',
          wbsCode: 'WBS-MANUAL',
          monthlyRevenueAmounts: [50000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          monthlyCostAmounts: [20000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          revenueAmountTotal: 50000000n,
          costAmountTotal: 20000000n,
          memo: '직접 실적 조정',
          updatedAt: new Date('2026-07-09T01:00:00.000Z'),
        }],
      ]),
      $executeRaw: createValueAsyncMock(1),
      client: {},
    };
    const { service } = createService(db as unknown as DatabaseService);

    const result = await service.savePerformanceActualInput({
      year: 2026,
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      ownerName: '김민준',
      region: 'domestic',
      wbsCode: 'WBS-MANUAL',
      monthlyRevenueAmounts: [50000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      monthlyCostAmounts: [20000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      memo: '직접 실적 조정',
    }, 7n);

    expect(db.$queryRaw.calls).toHaveLength(1);
    expect(result.input).toMatchObject({
      id: '41',
      year: 2026,
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      ownerName: '김민준',
      region: 'domestic',
      wbsCode: 'WBS-MANUAL',
      revenueAmountTotal: 50000000,
      costAmountTotal: 20000000,
    });
    expect(result.boundaryNotice).toContain('manual-actual row');
  });

  it('uses confirmed business plan ledger lines as the business plan performance basis', async () => {
    const db = {
      $queryRaw: createAsyncMock([
        [{
          id: 11n,
          code: 'BP-2026-V001',
          planName: '2026 확정 사업계획',
          baseYear: 2026,
          versionNo: 1,
          statusCode: 'confirmed',
          confirmed: true,
          confirmedAt: new Date('2026-07-07T00:00:00.000Z'),
          businessTypeFilter: null,
          industryLineFilter: null,
          regionFilter: 'all',
          searchFilter: null,
          pipelineAmountTotal: 700000000n,
          contractPlanAmountTotal: 500000000n,
          contractActualAmountTotal: 180000000n,
          planCandidateAmountTotal: 1200000000n,
          actualGapAmountTotal: -1020000000n,
          rowCount: 1,
          memo: 'confirmed',
          updatedAt: new Date('2026-07-07T01:00:00.000Z'),
        }],
        [{
          businessPlanId: 11n,
          id: 21n,
          lineCode: 'line-2026',
          rowCode: 'ROW-2026',
          targetYear: 2026,
          businessType: 'SI 구축',
          industryLine: '전력/제조',
          ownerName: '김민준',
          regionCode: 'domestic',
          businessName: '2026년 통합 사업',
          wbsCode: 'WBS-2026',
          pipelineAmount: 700000000n,
          contractPlanAmount: 500000000n,
          contractActualAmount: 180000000n,
          planCandidateAmount: 1200000000n,
          planExternalCostAmount: 360000000n,
          planMonthlyExternalCostAmounts: Array(12).fill(30000000),
          actualGapAmount: -1020000000n,
          sortOrder: 10,
        }],
      ]),
      $executeRaw: createValueAsyncMock(1),
      client: {},
    };
    const { service } = createService(db as unknown as DatabaseService);

    const result = await service.getPerformancePreview({ year: 2026 });

    expect(result.summary.confirmedPlanAvailable).toBe(true);
    expect(result.summary.confirmedPlanId).toBe('11');
    expect(result.summary.confirmedPlanCode).toBe('BP-2026-V001');
    expect(result.summary.confirmedPlanName).toBe('2026 확정 사업계획');
    expect(result.summary.planBasisLabel).toBe('확정 사업계획 차수 매출·외부원가 기준');
    expect(result.summary.unavailableActions).not.toContain('확정 사업계획 차수 기준 비교');
    expect(result.summary.planRevenueTotal).toBe(1200000000);
    expect(result.summary.planCostTotal).toBe(360000000);
    expect(result.summary.actualRevenueTotal).toBe(180000000);
    expect(result.summary.revenueGapTotal).toBe(-1020000000);
    expect(result.months[0]).toMatchObject({
      month: 1,
      planRevenueAmount: 100000000,
      planCostAmount: 30000000,
      actualRevenueAmount: 180000000,
      actualCostAmount: 90000000,
      revenueGapAmount: 80000000,
      costGapAmount: 60000000,
    });
    expect(result.months[1]).toMatchObject({
      month: 2,
      planRevenueAmount: 100000000,
      actualRevenueAmount: 0,
      revenueGapAmount: -100000000,
    });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      source: 'mixed',
      label: '2026년 통합 사업',
      wbsCode: 'WBS-2026',
      total: expect.objectContaining({
        planRevenueAmount: 1200000000,
        planCostAmount: 360000000,
        actualRevenueAmount: 180000000,
        actualCostAmount: 90000000,
      }),
    });
  });

  it('uses confirmed contract billing plans as actuals in source-compatible mode', async () => {
    const db = {
      $queryRaw: createAsyncMock([
        [{
          id: 11n,
          code: 'BP-2026-V001',
          planName: '2026 확정 사업계획',
          baseYear: 2026,
          versionNo: 1,
          statusCode: 'confirmed',
          confirmed: true,
          confirmedAt: new Date('2026-07-07T00:00:00.000Z'),
          businessTypeFilter: null,
          industryLineFilter: null,
          regionFilter: 'all',
          searchFilter: null,
          pipelineAmountTotal: 700000000n,
          contractPlanAmountTotal: 500000000n,
          contractActualAmountTotal: 180000000n,
          planCandidateAmountTotal: 1200000000n,
          actualGapAmountTotal: -1020000000n,
          rowCount: 1,
          memo: 'confirmed',
          updatedAt: new Date('2026-07-07T01:00:00.000Z'),
        }],
        [{
          businessPlanId: 11n,
          id: 21n,
          lineCode: 'line-2026',
          rowCode: 'ROW-2026',
          targetYear: 2026,
          businessType: 'SI 구축',
          industryLine: '전력/제조',
          ownerName: '김민준',
          regionCode: 'domestic',
          businessName: '2026년 통합 사업',
          wbsCode: 'WBS-2026',
          pipelineAmount: 700000000n,
          contractPlanAmount: 500000000n,
          contractActualAmount: 180000000n,
          planCandidateAmount: 1200000000n,
          planExternalCostAmount: 360000000n,
          planMonthlyExternalCostAmounts: Array(12).fill(30000000),
          actualGapAmount: -1020000000n,
          sortOrder: 10,
        }],
      ]),
      $executeRaw: createValueAsyncMock(1),
      client: {},
    };
    const { service } = createService(db as unknown as DatabaseService);

    const result = await service.getPerformancePreview({ year: 2026, mode: 'source-compatible' });

    expect(result.summary.mode).toBe('source-compatible');
    expect(result.summary.activeFilters.mode).toBe('source-compatible');
    expect(result.summary.actualBasisLabel).toBe('확정 계약 청구계획 매출·외부원가');
    expect(result.summary.planRevenueTotal).toBe(1200000000);
    expect(result.summary.planCostTotal).toBe(360000000);
    expect(result.summary.actualRevenueTotal).toBe(200000000);
    expect(result.summary.actualCostTotal).toBe(120000000);
    expect(result.summary.revenueGapTotal).toBe(-1000000000);
    expect(result.summary.directActualInputCount).toBe(0);
    expect(result.summary.confirmedCostInputCount).toBe(0);
    expect(result.summary.boundaryNotice).toContain('app.bp_rpt.js');
    expect(result.months[0]).toMatchObject({
      planRevenueAmount: 100000000,
      actualRevenueAmount: 200000000,
      actualCostAmount: 120000000,
      revenueGapAmount: 100000000,
    });
    expect(result.rows[0]).toMatchObject({
      source: 'mixed',
      wbsCode: 'WBS-2026',
      total: expect.objectContaining({
        actualRevenueAmount: 200000000,
        actualCostAmount: 120000000,
      }),
    });
  });

  it('uses manual monthly business plan inputs before falling back to annual distribution', async () => {
    const db = {
      $queryRaw: createAsyncMock([
        [{
          id: 11n,
          code: 'BP-2026-V001',
          planName: '2026 확정 사업계획',
          baseYear: 2026,
          versionNo: 1,
          statusCode: 'confirmed',
          confirmed: true,
          confirmedAt: new Date('2026-07-07T00:00:00.000Z'),
          businessTypeFilter: null,
          industryLineFilter: null,
          regionFilter: 'all',
          searchFilter: null,
          pipelineAmountTotal: 0n,
          contractPlanAmountTotal: 0n,
          contractActualAmountTotal: 180000000n,
          planCandidateAmountTotal: 600000000n,
          actualGapAmountTotal: -420000000n,
          rowCount: 1,
          memo: 'confirmed',
          updatedAt: new Date('2026-07-07T01:00:00.000Z'),
        }],
        [{
          businessPlanId: 11n,
          id: 21n,
          lineCode: 'line-2026',
          targetYear: 2026,
          businessType: 'SI 구축',
          industryLine: '전력/제조',
          ownerName: '김민준',
          regionCode: 'domestic',
          pipelineAmount: 0n,
          contractPlanAmount: 0n,
          contractActualAmount: 180000000n,
          planCandidateAmount: 600000000n,
          planMonthlyRevenueAmounts: [500000000, 100000000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          actualGapAmount: -420000000n,
          sortOrder: 10,
        }],
      ]),
      $executeRaw: createValueAsyncMock(1),
      client: {},
    };
    const { service } = createService(db as unknown as DatabaseService);

    const result = await service.getPerformancePreview({ year: 2026 });

    expect(result.summary.planRevenueTotal).toBe(600000000);
    expect(result.rows.find((row) => row.source === 'confirmed-plan')?.months[0]).toMatchObject({
      month: 1,
      planRevenueAmount: 500000000,
    });
    expect(result.rows.find((row) => row.source === 'confirmed-plan')?.months[1]).toMatchObject({
      month: 2,
      planRevenueAmount: 100000000,
    });
  });

  it('updates a draft business plan line with monthly direct input and recalculates totals', async () => {
    const writer = {
      $queryRaw: createAsyncMock([]),
      $executeRaw: createValueAsyncMock(1),
    };
    const db = {
      client: {
        $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(writer),
      },
      $queryRaw: createAsyncMock([
        [{
          id: 11n,
          code: 'BP-2026-V001',
          planName: '2026 draft',
          baseYear: 2026,
          versionNo: 1,
          statusCode: 'draft',
          confirmed: false,
          confirmedAt: null,
          businessTypeFilter: null,
          industryLineFilter: null,
          regionFilter: 'all',
          searchFilter: null,
          pipelineAmountTotal: 700000000n,
          contractPlanAmountTotal: 200000000n,
          contractActualAmountTotal: 180000000n,
          planCandidateAmountTotal: 900000000n,
          actualGapAmountTotal: -720000000n,
          rowCount: 1,
          memo: 'draft',
          updatedAt: new Date('2026-07-07T01:00:00.000Z'),
        }],
        [{
          businessPlanId: 11n,
          id: 21n,
          lineCode: 'line-2026',
          targetYear: 2026,
          businessType: 'SI 구축',
          industryLine: '전력/제조',
          ownerName: '김민준',
          regionCode: 'domestic',
          pipelineAmount: 700000000n,
          contractPlanAmount: 200000000n,
          contractActualAmount: 180000000n,
          planCandidateAmount: 900000000n,
          actualGapAmount: -720000000n,
          sortOrder: 10,
        }],
        [{
          id: 11n,
          code: 'BP-2026-V001',
          planName: '2026 draft',
          baseYear: 2026,
          versionNo: 1,
          statusCode: 'draft',
          confirmed: false,
          confirmedAt: null,
          businessTypeFilter: null,
          industryLineFilter: null,
          regionFilter: 'all',
          searchFilter: null,
          pipelineAmountTotal: 700000000n,
          contractPlanAmountTotal: 200000000n,
          contractActualAmountTotal: 180000000n,
          planCandidateAmountTotal: 780000000n,
          actualGapAmountTotal: -600000000n,
          rowCount: 1,
          memo: '월별 입력',
          updatedAt: new Date('2026-07-08T01:00:00.000Z'),
        }],
        [{
          businessPlanId: 11n,
          id: 21n,
          lineCode: 'line-2026',
          targetYear: 2026,
          businessType: 'SI 구축',
          industryLine: '전력/제조',
          ownerName: '김민준',
          regionCode: 'domestic',
          pipelineAmount: 700000000n,
          contractPlanAmount: 200000000n,
          contractActualAmount: 180000000n,
          planCandidateAmount: 780000000n,
          planMonthlyRevenueAmounts: [120000000, 100000000, 90000000, 80000000, 70000000, 60000000, 60000000, 50000000, 50000000, 40000000, 40000000, 20000000],
          actualGapAmount: -600000000n,
          sortOrder: 10,
        }],
      ]),
      $executeRaw: createValueAsyncMock(1),
    };
    const { service } = createService(db as unknown as DatabaseService);

    const result = await service.updateMonthlyPlanLine('BP-2026-V001', '21', {
      monthlyRevenueAmounts: [120000000, 100000000, 90000000, 80000000, 70000000, 60000000, 60000000, 50000000, 50000000, 40000000, 40000000, 20000000],
      memo: '월별 입력',
    }, 7n);

    expect(writer.$executeRaw.calls).toHaveLength(2);
    expect(result.plan.planCandidateAmountTotal).toBe(780000000);
    expect(result.line).toMatchObject({
      id: '21',
      planCandidateAmount: 780000000,
      monthlyPlanInputMode: 'manual',
      monthlyPlanRevenueAmounts: [120000000, 100000000, 90000000, 80000000, 70000000, 60000000, 60000000, 50000000, 50000000, 40000000, 40000000, 20000000],
    });
    expect(result.boundaryNotice).toContain('draft 차수 line');
  });

  it('rejects monthly direct input for confirmed business plan ledgers', async () => {
    const writer = {
      $queryRaw: createAsyncMock([]),
      $executeRaw: createValueAsyncMock(1),
    };
    const db = {
      client: {
        $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(writer),
      },
      $queryRaw: createAsyncMock([
        [{
          id: 11n,
          code: 'BP-2026-V001',
          planName: '2026 confirmed',
          baseYear: 2026,
          versionNo: 1,
          statusCode: 'confirmed',
          confirmed: true,
          confirmedAt: new Date('2026-07-07T00:00:00.000Z'),
          businessTypeFilter: null,
          industryLineFilter: null,
          regionFilter: 'all',
          searchFilter: null,
          pipelineAmountTotal: 700000000n,
          contractPlanAmountTotal: 200000000n,
          contractActualAmountTotal: 180000000n,
          planCandidateAmountTotal: 900000000n,
          actualGapAmountTotal: -720000000n,
          rowCount: 1,
          memo: 'confirmed',
          updatedAt: new Date('2026-07-07T01:00:00.000Z'),
        }],
      ]),
      $executeRaw: createValueAsyncMock(1),
    };
    const { service } = createService(db as unknown as DatabaseService);

    await expect(service.updateMonthlyPlanLine('BP-2026-V001', '21', {
      monthlyRevenueAmounts: Array.from({ length: 12 }, () => 10000000),
    }, 7n)).rejects.toThrow('확정된 사업계획 차수');
    expect(writer.$executeRaw.calls).toHaveLength(0);
  });

  it('updates WBS across a confirmed previous-version logical row', async () => {
    const planRow = {
      id: 11n,
      code: 'BP-2026-V001',
      planName: '2026 confirmed',
      baseYear: 2026,
      versionNo: 1,
      statusCode: 'confirmed',
      confirmed: true,
      confirmedAt: new Date('2026-07-07T00:00:00.000Z'),
      businessTypeFilter: null,
      industryLineFilter: null,
      regionFilter: 'all',
      searchFilter: null,
      pipelineAmountTotal: 0n,
      contractPlanAmountTotal: 0n,
      contractActualAmountTotal: 0n,
      planCandidateAmountTotal: 600000000n,
      actualGapAmountTotal: -600000000n,
      rowCount: 1,
      memo: null,
      updatedAt: new Date('2026-07-07T01:00:00.000Z'),
    };
    const lineRows = [2026, 2027, 2028].map((targetYear, index) => ({
      businessPlanId: 11n,
      id: BigInt(21 + index),
      lineCode: `line-${targetYear}`,
      rowCode: 'ROW-ONE',
      targetYear,
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      ownerName: '김민준',
      regionCode: 'domestic',
      businessName: '통합 사업',
      wbsCode: 'WBS-CONFIRMED-EDIT',
      pipelineAmount: 0n,
      contractPlanAmount: 0n,
      contractActualAmount: 0n,
      planCandidateAmount: 200000000n,
      planExternalCostAmount: 50000000n,
      actualGapAmount: -200000000n,
      sortOrder: (index + 1) * 10,
    }));
    const db = {
      $queryRaw: createAsyncMock([
        [{ ...planRow, isLatest: false }],
        [{ lineCount: 3n }],
        [planRow],
        lineRows,
      ]),
      $executeRaw: createValueAsyncMock(3),
      client: {},
    };
    const { service } = createService(db as unknown as DatabaseService);

    const result = await service.updatePlanRowWbs('BP-2026-V001', 'ROW-ONE', ' WBS-CONFIRMED-EDIT ', 7n);

    expect(db.$executeRaw.calls).toHaveLength(1);
    expect(result.rowCode).toBe('ROW-ONE');
    expect(result.plan).toMatchObject({ confirmed: true, rowCount: 1 });
    expect(result.plan.rows[0]).toMatchObject({ rowCode: 'ROW-ONE', wbsCode: 'WBS-CONFIRMED-EDIT' });
    expect(result.plan.lines).toHaveLength(3);
  });

  it('passes normalized filters into the business plan performance read model', async () => {
    const { service, performanceQueries } = createService();

    await service.getPerformancePreview({
      year: 2026,
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      region: 'domestic',
      search: 'LS',
    });

    expect(performanceQueries).toHaveLength(1);
    expect(performanceQueries[0]).toEqual({
      year: 2026,
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      region: 'domestic',
      search: 'LS',
    });
  });

  it('lists saved business plan ledgers with detail lines', async () => {
    const db = {
      $queryRaw: createAsyncMock([
        [{
          id: 11n,
          code: 'BP-2026-V001',
          planName: '2026 사업계획',
          baseYear: 2026,
          versionNo: 1,
          statusCode: 'confirmed',
          confirmed: true,
          confirmedAt: new Date('2026-07-07T00:00:00.000Z'),
          businessTypeFilter: null,
          industryLineFilter: null,
          regionFilter: 'all',
          searchFilter: null,
          pipelineAmountTotal: 700000000n,
          contractPlanAmountTotal: 200000000n,
          contractActualAmountTotal: 180000000n,
          planCandidateAmountTotal: 900000000n,
          actualGapAmountTotal: -720000000n,
          rowCount: 1,
          memo: 'demo',
          updatedAt: new Date('2026-07-07T01:00:00.000Z'),
        }],
        [{
          businessPlanId: 11n,
          id: 21n,
          lineCode: 'line-2026',
          targetYear: 2026,
          businessType: 'SI 구축',
          industryLine: '전력/제조',
          ownerName: '김민준',
          regionCode: 'domestic',
          pipelineAmount: 700000000n,
          contractPlanAmount: 200000000n,
          contractActualAmount: 180000000n,
          planCandidateAmount: 900000000n,
          actualGapAmount: -720000000n,
          sortOrder: 10,
        }],
      ]),
      $executeRaw: createValueAsyncMock(1),
      client: {},
    };
    const { service } = createService(db as unknown as DatabaseService);

    const result = await service.listPlans({ baseYear: 2026 });

    expect(result.summary.confirmedCount).toBe(1);
    expect(result.summary.confirmedPlanId).toBe('11');
    expect(result.items[0]).toMatchObject({
      id: '11',
      code: 'BP-2026-V001',
      status: 'confirmed',
      planCandidateAmountTotal: 900000000,
    });
    expect(result.items[0]?.lines[0]).toMatchObject({
      id: '21',
      targetYear: 2026,
      actualGapAmount: -720000000,
    });
  });

  it('creates a carry-forward draft from the previous confirmed business plan', async () => {
    const writer = {
      $queryRaw: createAsyncMock([
        [{ versionNo: 1 }],
        [{ id: 31n, code: 'BP-2027-V001' }],
      ]),
      $executeRaw: createValueAsyncMock(1),
    };
    const db = {
      client: {
        $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(writer),
      },
      $queryRaw: createAsyncMock([
        [{
          id: 11n,
          code: 'BP-2026-V001',
          planName: '2026 확정 사업계획',
          baseYear: 2026,
          versionNo: 1,
          statusCode: 'confirmed',
          confirmed: true,
          confirmedAt: new Date('2026-07-07T00:00:00.000Z'),
          businessTypeFilter: null,
          industryLineFilter: null,
          regionFilter: 'all',
          searchFilter: null,
          pipelineAmountTotal: 1000000000n,
          contractPlanAmountTotal: 800000000n,
          contractActualAmountTotal: 500000000n,
          planCandidateAmountTotal: 1800000000n,
          actualGapAmountTotal: -1300000000n,
          rowCount: 2,
          memo: 'confirmed',
          updatedAt: new Date('2026-07-07T01:00:00.000Z'),
        }],
        [
          {
            businessPlanId: 11n,
            id: 21n,
            lineCode: 'line-2027',
            targetYear: 2027,
            businessType: 'SI 구축',
            industryLine: '전력/제조',
            ownerName: '김민준',
            regionCode: 'domestic',
            pipelineAmount: 500000000n,
            contractPlanAmount: 400000000n,
            contractActualAmount: 200000000n,
            planCandidateAmount: 900000000n,
            actualGapAmount: -700000000n,
            sortOrder: 10,
          },
          {
            businessPlanId: 11n,
            id: 22n,
            lineCode: 'line-2028',
            targetYear: 2028,
            businessType: 'SI 구축',
            industryLine: '전력/제조',
            ownerName: '김민준',
            regionCode: 'domestic',
            pipelineAmount: 300000000n,
            contractPlanAmount: 300000000n,
            contractActualAmount: 0n,
            planCandidateAmount: 600000000n,
            actualGapAmount: -600000000n,
            sortOrder: 20,
          },
        ],
        [{
          id: 31n,
          code: 'BP-2027-V001',
          planName: '2027 CRM 사업계획 전년 이월',
          baseYear: 2027,
          versionNo: 1,
          statusCode: 'draft',
          confirmed: false,
          confirmedAt: null,
          businessTypeFilter: null,
          industryLineFilter: null,
          regionFilter: 'all',
          searchFilter: null,
          pipelineAmountTotal: 800000000n,
          contractPlanAmountTotal: 700000000n,
          contractActualAmountTotal: 200000000n,
          planCandidateAmountTotal: 1500000000n,
          actualGapAmountTotal: -1300000000n,
          rowCount: 3,
          memo: 'BP-2026-V001 확정 차수에서 이월하고 현재 preview 신규 후보를 보강했습니다.',
          updatedAt: new Date('2026-07-08T01:00:00.000Z'),
        }],
        [
          {
            businessPlanId: 31n,
            id: 41n,
            lineCode: 'line-2027',
            targetYear: 2027,
            businessType: 'SI 구축',
            industryLine: '전력/제조',
            ownerName: '김민준',
            regionCode: 'domestic',
            pipelineAmount: 500000000n,
            contractPlanAmount: 400000000n,
            contractActualAmount: 200000000n,
            planCandidateAmount: 900000000n,
            actualGapAmount: -700000000n,
            sortOrder: 10,
          },
          {
            businessPlanId: 31n,
            id: 42n,
            lineCode: 'line-2028',
            targetYear: 2028,
            businessType: 'SI 구축',
            industryLine: '전력/제조',
            ownerName: '김민준',
            regionCode: 'domestic',
            pipelineAmount: 300000000n,
            contractPlanAmount: 300000000n,
            contractActualAmount: 0n,
            planCandidateAmount: 600000000n,
            actualGapAmount: -600000000n,
            sortOrder: 20,
          },
          {
            businessPlanId: 31n,
            id: 43n,
            lineCode: 'line-2029',
            targetYear: 2029,
            businessType: 'SI 구축',
            industryLine: '전력/제조',
            ownerName: '김민준',
            regionCode: 'domestic',
            pipelineAmount: 0n,
            contractPlanAmount: 0n,
            contractActualAmount: 0n,
            planCandidateAmount: 0n,
            actualGapAmount: 0n,
            sortOrder: 30,
          },
        ],
      ]),
      $executeRaw: createValueAsyncMock(1),
    };
    const { service } = createService(db as unknown as DatabaseService);

    const result = await service.createCarryForwardSnapshot({ baseYear: 2027 }, 7n);

    expect(result).toMatchObject({
      id: '31',
      code: 'BP-2027-V001',
      planName: '2027 CRM 사업계획 전년 이월',
      status: 'draft',
      planCandidateAmountTotal: 1500000000,
    });
    expect(result.memo).toContain('BP-2026-V001 확정 차수');
    expect(result.lines.find((line) => line.targetYear === 2027)).toMatchObject({
      planCandidateAmount: 900000000,
      actualGapAmount: -700000000,
    });
    expect(result.lines.find((line) => line.targetYear === 2028)).toMatchObject({
      planCandidateAmount: 600000000,
      actualGapAmount: -600000000,
    });
    expect(writer.$executeRaw.calls).toHaveLength(3);
  });

  it('creates a draft business plan snapshot from the current preview', async () => {
    const writer = {
      $queryRaw: createAsyncMock([
        [{ versionNo: 2 }],
        [{ id: 12n, code: 'BP-2026-V002' }],
      ]),
      $executeRaw: createValueAsyncMock(1),
    };
    const transactionCalls: unknown[][] = [];
    const db = {
      client: {
        $transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
          transactionCalls.push([callback]);
          return callback(writer);
        },
      },
      $queryRaw: createAsyncMock([
        [{
          id: 12n,
          code: 'BP-2026-V002',
          planName: '2026 Snapshot',
          baseYear: 2026,
          versionNo: 2,
          statusCode: 'draft',
          confirmed: false,
          confirmedAt: null,
          businessTypeFilter: null,
          industryLineFilter: null,
          regionFilter: 'all',
          searchFilter: null,
          pipelineAmountTotal: 1000000000n,
          contractPlanAmountTotal: 320000000n,
          contractActualAmountTotal: 240000000n,
          planCandidateAmountTotal: 1320000000n,
          actualGapAmountTotal: -1080000000n,
          rowCount: 3,
          memo: 'snapshot',
          updatedAt: new Date('2026-07-07T02:00:00.000Z'),
        }],
        [],
      ]),
      $executeRaw: createValueAsyncMock(1),
    };
    const { service } = createService(db as unknown as DatabaseService);

    const result = await service.createPlanSnapshot({
      baseYear: 2026,
      planName: '2026 Snapshot',
      memo: 'snapshot',
    }, 7n);

    expect(result).toMatchObject({
      id: '12',
      code: 'BP-2026-V002',
      status: 'draft',
      version: 2,
    });
    expect(transactionCalls).toHaveLength(1);
    expect(writer.$executeRaw.calls).toHaveLength(3);
  });
});
