import type {
  CrmContract,
  CrmContractListResponse,
  CrmContractPerformanceResponse,
  CrmOpportunity,
  CrmOpportunityListResponse,
} from '@ssoo/types/crm';
import type { CrmAccessService } from '../access/access.service.js';
import type { DatabaseService } from '../../../database/database.service.js';
import type { ContractService } from '../contract/contract.service.js';
import type { OpportunityService } from '../opportunity/opportunity.service.js';
import type { AccountingPaymentExternalExecutorService } from './accounting-payment-external-executor.service.js';
import { CostPlanService } from './cost-plan.service.js';

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
    costLines: [
      { id: 'opp-cost-1', category: 'internal-cost', label: '내부 수행', amount: 100000000, serviceType: 'internal' },
      { id: 'opp-cost-2', category: 'external-cost', label: '외부 전문', amount: 40000000, serviceType: 'external' },
    ],
    pmsHandoffStatus: 'planned',
    dmsLinkStatus: 'planned',
    adminBoundary: 'shared-admin',
    nextAction: '원가 후보 검토',
    updatedAt: '2026-07-07T01:00:00.000Z',
    ...seed,
  };
}

function createContract(seed: Partial<CrmContract>): CrmContract {
  return {
    id: 'crm-ct-001',
    code: 'CT-2026-001',
    customerName: 'LS ITC',
    contractName: 'AMS 원가 검증 계약',
    ownerName: '김민준',
    businessType: 'SI 구축',
    industryLine: '전력/제조',
    region: 'domestic',
    status: 'active',
    confirmed: true,
    contractStartDate: '2026-01-01',
    contractEndDate: '2026-12-31',
    wbsCode: 'WBS-AMS-001',
    paymentTermCode: 'NET30',
    revenueSubtotal: 300000000,
    specialDiscountType: 'amount',
    specialDiscountValue: 0,
    specialDiscountAmount: 0,
    revenueTotal: 300000000,
    costTotal: 130000000,
    externalCostTotal: 80000000,
    marginTotal: 170000000,
    marginRate: 56.67,
    revenueLines: [],
    costLines: [
      { id: 'ct-cost-1', category: 'internal-cost', label: '내부 운영', amount: 50000000, serviceType: 'internal' },
      { id: 'ct-cost-2', category: 'external-cost', label: 'AMS 외부', amount: 80000000, serviceType: 'external' },
    ],
    billingPlan: [
      { id: 'bp-1', billingYm: '2026/01', revenueAmount: 300000000, externalCostAmount: 80000000 },
    ],
    pmsHandoffStatus: 'planned',
    dmsLinkStatus: 'planned',
    adminBoundary: 'shared-admin',
    nextAction: 'AMS 업체 매핑 정책 검토',
    updatedAt: '2026-07-07T02:00:00.000Z',
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

function createContractResponse(items: CrmContract[]): CrmContractListResponse {
  const totalRevenue = items.reduce((sum, item) => sum + item.revenueTotal, 0);
  const totalCost = items.reduce((sum, item) => sum + item.costTotal, 0);
  return {
    summary: {
      totalCount: items.length,
      filteredCount: items.length,
      reviewCount: items.filter((item) => item.status === 'review').length,
      activeCount: items.filter((item) => item.status === 'active').length,
      completedCount: items.filter((item) => item.status === 'completed').length,
      totalRevenue,
      totalCost,
      totalExternalCost: items.reduce((sum, item) => sum + item.externalCostTotal, 0),
      totalMargin: totalRevenue - totalCost,
      grossMarginRate: totalRevenue > 0 ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 10000) / 100 : 0,
      boundaryNotice: 'CRM contract boundary',
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
        contractName: 'AMS 원가 검증 계약',
        ownerName: '김민준',
        businessType: 'SI 구축',
        industryLine: '전력/제조',
        region: 'domestic',
        wbsCode: 'WBS-AMS-001',
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

function createInternalMonthlyRow(seed?: Partial<{
  id: bigint;
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  regionCode: string;
  wbsCode: string;
  monthlyPlanAmounts: number[];
  monthlyActualAmounts: number[];
  planAmountTotal: bigint;
  actualAmountTotal: bigint;
  gapAmountTotal: bigint;
  statusCode: string;
  confirmed: boolean;
  confirmedAt: Date | null;
  confirmedBy: bigint | null;
  memo: string | null;
  updatedAt: Date;
}>) {
  const monthlyPlanAmounts = seed?.monthlyPlanAmounts ?? Array.from({ length: 12 }, (_, index) => index === 0 ? 25000000 : 0);
  const monthlyActualAmounts = seed?.monthlyActualAmounts ?? Array.from({ length: 12 }, (_, index) => index === 0 ? 21000000 : 0);
  return {
    id: seed?.id ?? 11n,
    targetYear: seed?.targetYear ?? 2026,
    businessType: seed?.businessType ?? 'SI 구축',
    industryLine: seed?.industryLine ?? '전력/제조',
    ownerName: seed?.ownerName ?? '김민준',
    regionCode: seed?.regionCode ?? 'domestic',
    wbsCode: seed?.wbsCode ?? 'WBS-AMS-001',
    monthlyPlanAmounts,
    monthlyActualAmounts,
    planAmountTotal: seed?.planAmountTotal ?? BigInt(monthlyPlanAmounts.reduce((sum, amount) => sum + amount, 0)),
    actualAmountTotal: seed?.actualAmountTotal ?? BigInt(monthlyActualAmounts.reduce((sum, amount) => sum + amount, 0)),
    gapAmountTotal: seed?.gapAmountTotal ?? BigInt(monthlyActualAmounts.reduce((sum, amount) => sum + amount, 0) - monthlyPlanAmounts.reduce((sum, amount) => sum + amount, 0)),
    statusCode: seed?.statusCode ?? 'draft',
    confirmed: seed?.confirmed ?? false,
    confirmedAt: seed?.confirmedAt ?? null,
    confirmedBy: seed?.confirmedBy ?? null,
    memo: seed?.memo ?? '내부원가 월별 입력',
    updatedAt: seed?.updatedAt ?? new Date('2026-07-08T12:00:00.000Z'),
  };
}

function createAmsMappingRow(seed?: Partial<{
  id: bigint;
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  regionCode: string;
  wbsCode: string;
  vendorName: string;
  vendorContractNo: string | null;
  memo: string | null;
  updatedAt: Date;
}>) {
  return {
    id: seed?.id ?? 21n,
    targetYear: seed?.targetYear ?? 2026,
    businessType: seed?.businessType ?? 'SI 구축',
    industryLine: seed?.industryLine ?? '전력/제조',
    ownerName: seed?.ownerName ?? '김민준',
    regionCode: seed?.regionCode ?? 'domestic',
    wbsCode: seed?.wbsCode ?? 'WBS-AMS-001',
    vendorName: seed?.vendorName ?? 'AMS 파트너',
    vendorContractNo: seed?.vendorContractNo ?? 'PO-AMS-2026-001',
    memo: seed?.memo ?? 'AMS 업체 매핑',
    updatedAt: seed?.updatedAt ?? new Date('2026-07-08T13:00:00.000Z'),
  };
}

function createInternalSourceItemRow(seed?: Partial<{
  id: bigint;
  targetYear: number;
  itemCode: string;
  itemName: string;
  monthlyPlanAmounts: number[];
  monthlyActualAmounts: number[];
  planAmountTotal: bigint;
  actualAmountTotal: bigint;
  differenceAmountTotal: bigint;
  updatedAt: Date;
}>) {
  const monthlyPlanAmounts = seed?.monthlyPlanAmounts ?? [100, -20, ...Array.from({ length: 10 }, () => 0)];
  const monthlyActualAmounts = seed?.monthlyActualAmounts ?? [70, 10, ...Array.from({ length: 10 }, () => 0)];
  return {
    id: seed?.id ?? 51n,
    targetYear: seed?.targetYear ?? 2026,
    itemCode: seed?.itemCode ?? 'labor',
    itemName: seed?.itemName ?? '인건비',
    monthlyPlanAmounts,
    monthlyActualAmounts,
    planAmountTotal: seed?.planAmountTotal ?? BigInt(monthlyPlanAmounts.reduce((sum, amount) => sum + amount, 0)),
    actualAmountTotal: seed?.actualAmountTotal ?? BigInt(monthlyActualAmounts.reduce((sum, amount) => sum + amount, 0)),
    differenceAmountTotal: seed?.differenceAmountTotal ?? BigInt(monthlyPlanAmounts.reduce((sum, amount) => sum + amount, 0) - monthlyActualAmounts.reduce((sum, amount) => sum + amount, 0)),
    updatedAt: seed?.updatedAt ?? new Date('2026-08-12T01:00:00.000Z'),
  };
}

function createAmsExternalMonthlyRow(seed?: Partial<{
  id: bigint;
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  regionCode: string;
  wbsCode: string;
  vendorName: string;
  vendorContractNo: string | null;
  monthlyPlanAmounts: number[];
  monthlyActualAmounts: number[];
  planAmountTotal: bigint;
  actualAmountTotal: bigint;
  gapAmountTotal: bigint;
  statusCode: string;
  confirmed: boolean;
  confirmedAt: Date | null;
  confirmedBy: bigint | null;
  memo: string | null;
  updatedAt: Date;
}>) {
  const monthlyPlanAmounts = seed?.monthlyPlanAmounts ?? Array.from({ length: 12 }, (_, index) => index === 0 ? 78000000 : 0);
  const monthlyActualAmounts = seed?.monthlyActualAmounts ?? Array.from({ length: 12 }, (_, index) => index === 0 ? 73000000 : 0);
  return {
    id: seed?.id ?? 31n,
    targetYear: seed?.targetYear ?? 2026,
    businessType: seed?.businessType ?? 'SI 구축',
    industryLine: seed?.industryLine ?? '전력/제조',
    ownerName: seed?.ownerName ?? '김민준',
    regionCode: seed?.regionCode ?? 'domestic',
    wbsCode: seed?.wbsCode ?? 'WBS-AMS-001',
    vendorName: seed?.vendorName ?? 'AMS 파트너',
    vendorContractNo: seed?.vendorContractNo ?? 'PO-AMS-2026-001',
    monthlyPlanAmounts,
    monthlyActualAmounts,
    planAmountTotal: seed?.planAmountTotal ?? BigInt(monthlyPlanAmounts.reduce((sum, amount) => sum + amount, 0)),
    actualAmountTotal: seed?.actualAmountTotal ?? BigInt(monthlyActualAmounts.reduce((sum, amount) => sum + amount, 0)),
    gapAmountTotal: seed?.gapAmountTotal ?? BigInt(monthlyActualAmounts.reduce((sum, amount) => sum + amount, 0) - monthlyPlanAmounts.reduce((sum, amount) => sum + amount, 0)),
    statusCode: seed?.statusCode ?? 'draft',
    confirmed: seed?.confirmed ?? false,
    confirmedAt: seed?.confirmedAt ?? null,
    confirmedBy: seed?.confirmedBy ?? null,
    memo: seed?.memo ?? 'AMS 외부원가 월별 입력',
    updatedAt: seed?.updatedAt ?? new Date('2026-07-08T14:00:00.000Z'),
  };
}

function createAccountingPaymentHandoffRow(seed?: Partial<{
  id: bigint;
  targetYear: number;
  businessTypeFilter: string;
  industryLineFilter: string;
  regionFilter: 'all' | 'domestic' | 'overseas' | 'unspecified';
  searchFilter: string;
  statusCode: 'snapshot-created' | 'execution-evidence-updated' | 'replaced';
  lineCount: number;
  settlementAmountTotal: bigint;
  previewSnapshot: unknown;
  linesSnapshot: unknown;
  executionEvidenceSnapshot: unknown;
  executionEvidenceUpdatedAt: Date | null;
  memo: string | null;
  savedBy: bigint | null;
  savedAt: Date;
  updatedAt: Date;
}>) {
  return {
    id: seed?.id ?? 41n,
    targetYear: seed?.targetYear ?? 2026,
    businessTypeFilter: seed?.businessTypeFilter ?? '',
    industryLineFilter: seed?.industryLineFilter ?? '',
    regionFilter: seed?.regionFilter ?? 'all',
    searchFilter: seed?.searchFilter ?? '',
    statusCode: seed?.statusCode ?? 'snapshot-created',
    lineCount: seed?.lineCount ?? 2,
    settlementAmountTotal: seed?.settlementAmountTotal ?? 94000000n,
    previewSnapshot: seed?.previewSnapshot ?? {},
    linesSnapshot: seed?.linesSnapshot ?? [],
    executionEvidenceSnapshot: seed?.executionEvidenceSnapshot ?? [],
    executionEvidenceUpdatedAt: seed?.executionEvidenceUpdatedAt ?? null,
    memo: seed?.memo ?? '회계 지급 handoff snapshot',
    savedBy: seed?.savedBy ?? 1n,
    savedAt: seed?.savedAt ?? new Date('2026-07-09T13:30:00.000Z'),
    updatedAt: seed?.updatedAt ?? new Date('2026-07-09T13:30:00.000Z'),
  };
}

function getSqlText(args: unknown[]): string {
  const first = args[0];
  return Array.isArray(first) ? first.join(' ') : String(first ?? '');
}

function createService(params?: {
  contracts?: CrmContract[];
  internalMonthlyRows?: ReturnType<typeof createInternalMonthlyRow>[];
  internalSourceItemRows?: ReturnType<typeof createInternalSourceItemRow>[];
  amsVendorMappingRows?: ReturnType<typeof createAmsMappingRow>[];
  amsExternalMonthlyRows?: ReturnType<typeof createAmsExternalMonthlyRow>[];
  accountingPaymentHandoffRows?: ReturnType<typeof createAccountingPaymentHandoffRow>[];
  saveRow?: ReturnType<typeof createInternalMonthlyRow>;
  saveInternalSourceItemRows?: ReturnType<typeof createInternalSourceItemRow>[];
  saveAmsVendorMappingRow?: ReturnType<typeof createAmsMappingRow>;
  saveAmsExternalMonthlyRow?: ReturnType<typeof createAmsExternalMonthlyRow>;
  saveAccountingPaymentHandoffRow?: ReturnType<typeof createAccountingPaymentHandoffRow>;
  externalExecutor?: Pick<AccountingPaymentExternalExecutorService, 'isConfigured' | 'execute'>;
}) {
  const performanceQueries: unknown[] = [];
  const opportunities = [
    createOpportunity({}),
    createOpportunity({
      id: 'crm-opp-hold',
      opportunityName: '보류 원가',
      status: 'hold',
      costTotal: 90000000,
      costLines: [{ id: 'hold-cost', category: 'external-cost', label: '제외 원가', amount: 90000000, serviceType: 'external' }],
    }),
  ];
  const contracts = params?.contracts ?? [
    createContract({}),
    createContract({
      id: 'crm-ct-review',
      code: 'CT-2026-REVIEW',
      contractName: '미확정 AMS 후보',
      status: 'review',
      confirmed: false,
      wbsCode: undefined,
      costTotal: 50000000,
      externalCostTotal: 20000000,
      costLines: [
        { id: 'review-cost-1', category: 'internal-cost', label: '검토 내부', amount: 30000000, serviceType: 'internal' },
        { id: 'review-cost-2', category: 'external-cost', label: '검토 외부', amount: 20000000, serviceType: 'external' },
      ],
      billingPlan: [],
    }),
  ];
  const opportunityService: Pick<OpportunityService, 'listResponse'> = {
    listResponse: async () => createOpportunityResponse(opportunities),
  };
  const contractService: Pick<ContractService, 'listResponse' | 'getMonthlyPerformance'> = {
    listResponse: async () => createContractResponse(contracts),
    getMonthlyPerformance: async (query) => {
      performanceQueries.push(query ?? {});
      return createPerformanceResponse();
    },
  };
  const internalMonthlyRows = params?.internalMonthlyRows ?? [];
  const amsVendorMappingRows = params?.amsVendorMappingRows ?? [];
  const amsExternalMonthlyRows = params?.amsExternalMonthlyRows ?? [];
  const accountingPaymentHandoffRows = params?.accountingPaymentHandoffRows ?? [];
  const executeRawCalls: unknown[][] = [];
  const queryRawCalls: unknown[][] = [];
  const transactionCalls: unknown[][] = [];
  const writer = {
    $executeRaw: async (...args: unknown[]) => {
      executeRawCalls.push(args);
      return 1;
    },
    $queryRaw: async (...args: unknown[]) => {
      queryRawCalls.push(args);
      const sql = getSqlText(args);
      if (sql.includes('crm_cost_plan_accounting_handoff_m')) {
        return [params?.saveAccountingPaymentHandoffRow ?? createAccountingPaymentHandoffRow()];
      }
      if (sql.includes('crm_cost_plan_internal_item_monthly_d')) {
        return params?.saveInternalSourceItemRows ?? [createInternalSourceItemRow()];
      }
      if (sql.includes('crm_cost_plan_ams_external_monthly_d')) {
        return [params?.saveAmsExternalMonthlyRow ?? createAmsExternalMonthlyRow()];
      }
      if (sql.includes('crm_cost_plan_ams_vendor_wbs_r')) {
        return [params?.saveAmsVendorMappingRow ?? createAmsMappingRow()];
      }
      return [params?.saveRow ?? createInternalMonthlyRow()];
    },
  };
  const db = {
    client: {
      $queryRaw: async (...args: unknown[]) => {
        const sql = getSqlText(args);
        if (sql.includes('crm_cost_plan_accounting_handoff_m')) {
          return accountingPaymentHandoffRows;
        }
        if (sql.includes('crm_cost_plan_ams_external_monthly_d')) {
          return amsExternalMonthlyRows;
        }
        if (sql.includes('crm_cost_plan_ams_vendor_wbs_r')) {
          return amsVendorMappingRows;
        }
        if (sql.includes('crm_cost_plan_internal_monthly_d')) {
          return internalMonthlyRows;
        }
        if (sql.includes('crm_cost_plan_internal_item_monthly_d')) {
          return params?.internalSourceItemRows ?? [];
        }
        return [];
      },
      $executeRaw: async (...args: unknown[]) => {
        executeRawCalls.push(args);
        return 1;
      },
      $transaction: async (callback: (tx: typeof writer) => Promise<unknown>) => {
        transactionCalls.push([callback]);
        return callback(writer);
      },
    },
  } as unknown as DatabaseService;

  return {
    service: new CostPlanService(
      opportunityService as OpportunityService,
      contractService as ContractService,
      db,
      params?.externalExecutor as AccountingPaymentExternalExecutorService | undefined,
      undefined,
      {
        actorForUser: async (id: bigint = 11n) => ({ userId: id.toString(), loginId: 'unit-test' }),
        resolveReadOrganization: async (_actor: unknown, id?: string) => id ? BigInt(id) : null,
        resolveWriteOrganization: async (id: bigint = 11n) => ({ user: { userId: id.toString(), loginId: 'unit-test' }, organizationId: 13n }),
        assertOrganizationCapability: async () => undefined,
      } as unknown as CrmAccessService,
    ),
    performanceQueries,
    db,
    writer,
    executeRawCalls,
    queryRawCalls,
    transactionCalls,
  };
}

describe('CostPlanService', () => {
  it('offers only confirmed AMS WBS, deduplicated and sorted, independently of year overlap', async () => {
    const { service } = createService({ contracts: [
      createContract({ businessType: 'SI', wbsCode: 'SI-1' }),
      createContract({ businessType: 'SM', wbsCode: 'SM-1' }),
      createContract({ businessType: 'AMS', confirmed: false, wbsCode: 'DRAFT' }),
      createContract({ businessType: 'AMS', wbsCode: undefined }),
      createContract({ businessType: 'AMS', wbsCode: 'Z-1', contractName: 'first' }),
      createContract({ businessType: 'AMS', wbsCode: 'Z-1', contractName: 'duplicate' }),
      createContract({ businessType: 'AMS', wbsCode: 'A-1', contractStartDate: '2025-01-01', contractEndDate: '2025-12-31' }),
    ] });
    const result = await service.getPreview({ year: 2026 });
    expect(result.amsSourceWorkspace.eligibleWbs.map((item) => item.wbsCode)).toEqual(['A-1', 'Z-1']);
    expect(result.amsSourceWorkspace.eligibleWbs[1].contractName).toBe('first');
  });

  it('builds a read-only internal cost and AMS preview from CRM ledger data', async () => {
    const { service } = createService();

    const result = await service.getPreview({ year: 2026 });

    expect(result.summary.year).toBe(2026);
    expect(result.summary.pipelineInternalCostTotal).toBe(100000000);
    expect(result.summary.pipelineExternalCostTotal).toBe(40000000);
    expect(result.summary.contractInternalCostTotal).toBe(80000000);
    expect(result.summary.contractExternalPlanTotal).toBe(80000000);
    expect(result.summary.contractExternalActualTotal).toBe(70000000);
    expect(result.summary.internalCostCandidateTotal).toBe(180000000);
    expect(result.summary.externalCostPlanCandidateTotal).toBe(120000000);
    expect(result.summary.externalCostGapTotal).toBe(-50000000);
    expect(result.summary.amsExternalCostPlanInputTotal).toBe(0);
    expect(result.summary.amsExternalCostActualInputTotal).toBe(0);
    expect(result.summary.amsExternalCostGapTotal).toBe(0);
    expect(result.summary.amsExternalCostInputRowCount).toBe(0);
    expect(result.summary.amsExternalCostConfirmedRowCount).toBe(0);
    expect(result.summary.internalCostConfirmedRowCount).toBe(0);
    expect(result.summary.amsMappedCount).toBe(0);
    expect(result.summary.amsReadyCount).toBe(0);
    expect(result.summary.amsBlockedCount).toBe(2);
    expect(result.summary.sourceTypes).toContain('ams-vendor-mapping');
    expect(result.summary.sourceTypes).toContain('ams-external-cost-input');
    expect(result.summary.unavailableActions).not.toContain('내부원가 월별 저장');
    expect(result.summary.unavailableActions).not.toContain('내부원가 계획/실적 확정');
    expect(result.summary.unavailableActions).not.toContain('AMS 업체-WBS 매핑 저장');
    expect(result.summary.unavailableActions).not.toContain('AMS 외부원가 월별 저장');
    expect(result.summary.unavailableActions).not.toContain('AMS 외부원가 정산 확정');
    expect(result.summary.unavailableActions).toEqual([]);
    expect(result.rows.some((row) => row.blockedReasons.includes('AMS 업체 매핑 필요'))).toBe(true);
    expect(result.rows.every((row) => row.internalCostInputStatus === 'candidate')).toBe(true);
    expect(result.rows.every((row) => row.amsExternalCostInputStatus === 'candidate')).toBe(true);
  });

  it('passes normalized filters into the contract performance read model', async () => {
    const { service, performanceQueries } = createService();

    await service.getPreview({
      year: 2026,
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      region: 'domestic',
      search: 'AMS',
    });

    expect(performanceQueries).toEqual([{
      year: 2026,
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      region: 'domestic',
      search: 'AMS',
    }]);
  });

  it('merges stored internal monthly cost inputs into the cost plan preview', async () => {
    const { service } = createService({
      internalMonthlyRows: [createInternalMonthlyRow()],
    });

    const result = await service.getPreview({ year: 2026 });

    expect(result.summary.internalCostPlanInputTotal).toBe(25000000);
    expect(result.summary.internalCostActualInputTotal).toBe(21000000);
    expect(result.summary.internalCostGapTotal).toBe(-4000000);
    expect(result.summary.internalCostInputRowCount).toBe(1);
    expect(result.summary.internalCostConfirmedRowCount).toBe(0);
    expect(result.summary.sourceTypes).toContain('internal-cost-input');
    const row = result.rows.find((item) => item.internalCostInputId === '11');
    expect(row).toBeDefined();
    expect(row).toMatchObject({
      internalCostInputMode: 'manual',
      internalCostInputStatus: 'draft',
      internalCostPlanInputAmount: 25000000,
      internalCostActualInputAmount: 21000000,
      internalCostGapAmount: -4000000,
    });
    expect(row?.internalCostConfirmedAt).toBeUndefined();
  });

  it('counts confirmed internal monthly cost inputs in the preview', async () => {
    const confirmedAt = new Date('2026-07-08T15:00:00.000Z');
    const { service } = createService({
      internalMonthlyRows: [createInternalMonthlyRow({
        statusCode: 'confirmed',
        confirmed: true,
        confirmedAt,
        confirmedBy: 1n,
      })],
    });

    const result = await service.getPreview({ year: 2026 });

    expect(result.summary.internalCostInputRowCount).toBe(1);
    expect(result.summary.internalCostConfirmedRowCount).toBe(1);
    const row = result.rows.find((item) => item.internalCostInputId === '11');
    expect(row).toMatchObject({
      internalCostInputStatus: 'confirmed',
      internalCostConfirmedAt: '2026-07-08T15:00:00.000Z',
    });
  });

  it('merges stored AMS vendor-WBS mappings into readiness', async () => {
    const { service } = createService({
      amsVendorMappingRows: [createAmsMappingRow()],
    });

    const result = await service.getPreview({ year: 2026 });

    expect(result.summary.amsMappedCount).toBe(1);
    expect(result.summary.amsReadyCount).toBe(1);
    expect(result.summary.amsBlockedCount).toBe(1);
    const row = result.rows.find((item) => item.amsMappingId === '21');
    expect(row).toBeDefined();
    expect(row).toMatchObject({
      amsMappingStatus: 'mapped',
      amsVendorName: 'AMS 파트너',
      amsVendorContractNo: 'PO-AMS-2026-001',
      amsReadiness: 'ready',
    });
    expect(row?.blockedReasons).toEqual([]);
  });

  it('merges stored AMS external monthly cost inputs into the cost plan preview', async () => {
    const { service } = createService({
      amsVendorMappingRows: [createAmsMappingRow()],
      amsExternalMonthlyRows: [createAmsExternalMonthlyRow()],
    });

    const result = await service.getPreview({ year: 2026 });

    expect(result.summary.amsExternalCostPlanInputTotal).toBe(78000000);
    expect(result.summary.amsExternalCostActualInputTotal).toBe(73000000);
    expect(result.summary.amsExternalCostGapTotal).toBe(-5000000);
    expect(result.summary.amsExternalCostInputRowCount).toBe(1);
    expect(result.summary.amsExternalCostConfirmedRowCount).toBe(0);
    expect(result.summary.sourceTypes).toContain('ams-external-cost-input');
    const row = result.rows.find((item) => item.amsExternalCostInputId === '31');
    expect(row).toBeDefined();
    expect(row).toMatchObject({
      amsExternalCostInputMode: 'manual',
      amsExternalCostInputStatus: 'draft',
      amsExternalCostPlanInputAmount: 78000000,
      amsExternalCostActualInputAmount: 73000000,
      amsExternalCostGapAmount: -5000000,
      amsVendorName: 'AMS 파트너',
      amsVendorContractNo: 'PO-AMS-2026-001',
    });
    expect(row?.amsExternalCostConfirmedAt).toBeUndefined();
  });

  it('counts confirmed AMS external monthly cost inputs in the cost plan preview', async () => {
    const confirmedAt = new Date('2026-07-08T16:00:00.000Z');
    const { service } = createService({
      amsVendorMappingRows: [createAmsMappingRow()],
      amsExternalMonthlyRows: [createAmsExternalMonthlyRow({
        statusCode: 'confirmed',
        confirmed: true,
        confirmedAt,
        confirmedBy: 1n,
      })],
    });

    const result = await service.getPreview({ year: 2026 });

    expect(result.summary.amsExternalCostInputRowCount).toBe(1);
    expect(result.summary.amsExternalCostConfirmedRowCount).toBe(1);
    const row = result.rows.find((item) => item.amsExternalCostInputId === '31');
    expect(row).toMatchObject({
      amsExternalCostInputStatus: 'confirmed',
      amsExternalCostConfirmedAt: '2026-07-08T16:00:00.000Z',
    });
  });

  it('saves monthly internal cost inputs with a stable ledger activity', async () => {
    const savedRow = createInternalMonthlyRow({
      monthlyPlanAmounts: Array.from({ length: 12 }, (_, index) => index === 0 ? 10000000 : 0),
      monthlyActualAmounts: Array.from({ length: 12 }, (_, index) => index === 0 ? 7000000 : 0),
      planAmountTotal: 10000000n,
      actualAmountTotal: 7000000n,
      gapAmountTotal: -3000000n,
    });
    const { service, executeRawCalls, transactionCalls } = createService({ saveRow: savedRow });

    const result = await service.saveInternalMonthlyInput({
      targetYear: 2026,
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      ownerName: '김민준',
      region: 'domestic',
      wbsCode: 'WBS-AMS-001',
      monthlyPlanAmounts: savedRow.monthlyPlanAmounts,
      monthlyActualAmounts: savedRow.monthlyActualAmounts,
      memo: '내부원가 저장',
    }, 1n);

    expect(transactionCalls).toHaveLength(1);
    expect(executeRawCalls).toHaveLength(1);
    expect(String(executeRawCalls[0])).toContain('internal-monthly-input');
    expect(result.input).toMatchObject({
      id: '11',
      targetYear: 2026,
      planAmountTotal: 10000000,
      actualAmountTotal: 7000000,
      gapAmountTotal: -3000000,
      status: 'draft',
      confirmed: false,
    });
  });

  it('saves the exact five signed internal cost source items and calculates plan minus actual', async () => {
    const definitions = [
      ['labor', '인건비'],
      ['other', '기타'],
      ['dept_adj', '사업부간조정'],
      ['svc', '매출원가용역'],
      ['dept_common', '사업부공통'],
    ] as const;
    const savedRows = definitions.map(([itemCode, itemName], index) => createInternalSourceItemRow({
      id: BigInt(51 + index),
      itemCode,
      itemName,
      monthlyPlanAmounts: [100 + index, -20, ...Array.from({ length: 10 }, () => 0)],
      monthlyActualAmounts: [70, 10, ...Array.from({ length: 10 }, () => 0)],
    }));
    const { service, executeRawCalls } = createService({ saveInternalSourceItemRows: savedRows });

    const result = await service.saveInternalSourceGrid({
      targetYear: 2026,
      items: definitions.map(([itemCode], index) => ({
        itemCode,
        monthlyPlanAmounts: [100 + index, -20, ...Array.from({ length: 10 }, () => 0)],
        monthlyActualAmounts: [70, 10, ...Array.from({ length: 10 }, () => 0)],
      })),
    }, 1n);

    expect(executeRawCalls).toHaveLength(5);
    expect(executeRawCalls.every((call) => String(call[0]).includes('internal-source-grid-save'))).toBe(true);
    expect(result.grid.items).toHaveLength(5);
    expect(result.grid.items[0]).toMatchObject({
      itemCode: 'labor',
      monthlyPlanAmounts: [100, -20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      monthlyActualAmounts: [70, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      planAmountTotal: 80,
      actualAmountTotal: 80,
      differenceAmountTotal: 0,
    });
  });

  it('rejects duplicate internal cost source items before writing', async () => {
    const { service, executeRawCalls } = createService();
    const duplicate = Array.from({ length: 5 }, () => ({
      itemCode: 'labor' as const,
      monthlyPlanAmounts: Array.from({ length: 12 }, () => 0),
      monthlyActualAmounts: Array.from({ length: 12 }, () => 0),
    }));

    await expect(service.saveInternalSourceGrid({ targetYear: 2026, items: duplicate }, 1n))
      .rejects.toThrow('중복');
    expect(executeRawCalls).toHaveLength(0);
  });

  it('rejects monthly internal cost edits after confirmation', async () => {
    const { service, executeRawCalls } = createService({
      internalMonthlyRows: [createInternalMonthlyRow({
        statusCode: 'confirmed',
        confirmed: true,
        confirmedAt: new Date('2026-07-08T15:00:00.000Z'),
        confirmedBy: 1n,
      })],
    });

    await expect(service.saveInternalMonthlyInput({
      targetYear: 2026,
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      ownerName: '김민준',
      region: 'domestic',
      wbsCode: 'WBS-AMS-001',
      monthlyPlanAmounts: Array.from({ length: 12 }, () => 0),
      monthlyActualAmounts: Array.from({ length: 12 }, () => 0),
      memo: '확정 후 수정',
    }, 1n)).rejects.toThrow('확정된 내부원가 월별 입력');
    expect(executeRawCalls).toHaveLength(0);
  });

  it('confirms monthly internal cost inputs with a stable ledger activity', async () => {
    const { service, executeRawCalls } = createService({
      internalMonthlyRows: [createInternalMonthlyRow()],
    });

    const result = await service.confirmInternalMonthlyInput('11', 1n);

    expect(executeRawCalls).toHaveLength(1);
    expect(String(executeRawCalls[0])).toContain('internal-monthly-confirm');
    expect(result.input).toMatchObject({
      id: '11',
      status: 'confirmed',
      confirmed: true,
    });
    expect(result.input.confirmedAt).toBeDefined();
  });

  it('reopens confirmed monthly internal cost inputs with a stable ledger activity', async () => {
    const { service, executeRawCalls } = createService({
      internalMonthlyRows: [createInternalMonthlyRow({
        statusCode: 'confirmed',
        confirmed: true,
        confirmedAt: new Date('2026-07-08T15:00:00.000Z'),
        confirmedBy: 1n,
      })],
    });

    const result = await service.reopenInternalMonthlyInput('11', 1n);

    expect(executeRawCalls).toHaveLength(1);
    expect(String(executeRawCalls[0])).toContain('internal-monthly-reopen');
    expect(result.input).toMatchObject({
      id: '11',
      status: 'draft',
      confirmed: false,
    });
    expect(result.input.confirmedAt).toBeUndefined();
  });

  it('saves AMS vendor-WBS mappings with a stable ledger activity', async () => {
    const savedMapping = createAmsMappingRow({
      vendorName: '테스트 AMS 업체',
      vendorContractNo: 'PO-TEST-001',
    });
    const { service, executeRawCalls, transactionCalls } = createService({ saveAmsVendorMappingRow: savedMapping });

    const result = await service.saveAmsVendorWbsMapping({
      targetYear: 2026,
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      ownerName: '김민준',
      region: 'domestic',
      wbsCode: 'WBS-AMS-001',
      vendorName: '테스트 AMS 업체',
      vendorContractNo: 'PO-TEST-001',
      memo: 'AMS 매핑 저장',
    }, 1n);

    expect(transactionCalls).toHaveLength(1);
    expect(executeRawCalls).toHaveLength(1);
    expect(String(executeRawCalls[0])).toContain('ams-vendor-wbs-mapping');
    expect(result.mapping).toMatchObject({
      id: '21',
      targetYear: 2026,
      vendorName: '테스트 AMS 업체',
      vendorContractNo: 'PO-TEST-001',
      wbsCode: 'WBS-AMS-001',
    });
  });

  it('saves AMS external monthly cost inputs with a stable ledger activity', async () => {
    const savedInput = createAmsExternalMonthlyRow({
      monthlyPlanAmounts: Array.from({ length: 12 }, (_, index) => index === 0 ? 45000000 : 0),
      monthlyActualAmounts: Array.from({ length: 12 }, (_, index) => index === 0 ? 48000000 : 0),
      planAmountTotal: 45000000n,
      actualAmountTotal: 48000000n,
      gapAmountTotal: 3000000n,
    });
    const { service, executeRawCalls, transactionCalls } = createService({ saveAmsExternalMonthlyRow: savedInput });

    const result = await service.saveAmsExternalMonthlyInput({
      targetYear: 2026,
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      ownerName: '김민준',
      region: 'domestic',
      wbsCode: 'WBS-AMS-001',
      vendorName: 'AMS 파트너',
      vendorContractNo: 'PO-AMS-2026-001',
      monthlyPlanAmounts: savedInput.monthlyPlanAmounts,
      monthlyActualAmounts: savedInput.monthlyActualAmounts,
      memo: 'AMS 외부원가 저장',
    }, 1n);

    expect(transactionCalls).toHaveLength(1);
    expect(executeRawCalls).toHaveLength(1);
    expect(String(executeRawCalls[0])).toContain('ams-external-monthly-input');
    expect(result.input).toMatchObject({
      id: '31',
      targetYear: 2026,
      vendorName: 'AMS 파트너',
      vendorContractNo: 'PO-AMS-2026-001',
      planAmountTotal: 45000000,
      actualAmountTotal: 48000000,
      gapAmountTotal: 3000000,
      status: 'draft',
      confirmed: false,
    });
  });

  it('rejects AMS external monthly cost edits after settlement confirmation', async () => {
    const { service, executeRawCalls } = createService({
      amsExternalMonthlyRows: [createAmsExternalMonthlyRow({
        statusCode: 'confirmed',
        confirmed: true,
        confirmedAt: new Date('2026-07-08T16:00:00.000Z'),
        confirmedBy: 1n,
      })],
    });

    await expect(service.saveAmsExternalMonthlyInput({
      targetYear: 2026,
      businessType: 'SI 구축',
      industryLine: '전력/제조',
      ownerName: '김민준',
      region: 'domestic',
      wbsCode: 'WBS-AMS-001',
      vendorName: 'AMS 파트너',
      vendorContractNo: 'PO-AMS-2026-001',
      monthlyPlanAmounts: Array.from({ length: 12 }, () => 0),
      monthlyActualAmounts: Array.from({ length: 12 }, () => 0),
      memo: '정산 확정 후 수정',
    }, 1n)).rejects.toThrow('확정된 AMS 외부원가 월별 입력');
    expect(executeRawCalls).toHaveLength(0);
  });

  it('confirms AMS external monthly cost inputs with a stable ledger activity', async () => {
    const { service, executeRawCalls } = createService({
      amsExternalMonthlyRows: [createAmsExternalMonthlyRow()],
    });

    const result = await service.confirmAmsExternalMonthlyInput('31', 1n);

    expect(executeRawCalls).toHaveLength(1);
    expect(String(executeRawCalls[0])).toContain('ams-external-monthly-confirm');
    expect(result.input).toMatchObject({
      id: '31',
      status: 'confirmed',
      confirmed: true,
    });
    expect(result.input.confirmedAt).toBeDefined();
  });

  it('reopens confirmed AMS external monthly cost inputs with a stable ledger activity', async () => {
    const { service, executeRawCalls } = createService({
      amsExternalMonthlyRows: [createAmsExternalMonthlyRow({
        statusCode: 'confirmed',
        confirmed: true,
        confirmedAt: new Date('2026-07-08T16:00:00.000Z'),
        confirmedBy: 1n,
      })],
    });

    const result = await service.reopenAmsExternalMonthlyInput('31', 1n);

    expect(executeRawCalls).toHaveLength(1);
    expect(String(executeRawCalls[0])).toContain('ams-external-monthly-reopen');
    expect(result.input).toMatchObject({
      id: '31',
      status: 'draft',
      confirmed: false,
    });
    expect(result.input.confirmedAt).toBeUndefined();
  });

  it('builds accounting/payment handoff preview from confirmed internal and AMS cost inputs', async () => {
    const { service } = createService({
      internalMonthlyRows: [createInternalMonthlyRow({
        statusCode: 'confirmed',
        confirmed: true,
        confirmedAt: new Date('2026-07-08T15:00:00.000Z'),
        confirmedBy: 1n,
      })],
      amsVendorMappingRows: [createAmsMappingRow()],
      amsExternalMonthlyRows: [createAmsExternalMonthlyRow({
        statusCode: 'confirmed',
        confirmed: true,
        confirmedAt: new Date('2026-07-08T16:00:00.000Z'),
        confirmedBy: 1n,
      })],
      accountingPaymentHandoffRows: [createAccountingPaymentHandoffRow()],
    });

    const result = await service.getAccountingPaymentPreview({ year: 2026 });

    expect(result.readiness).toBe('ready');
    expect(result.lineCount).toBe(2);
    expect(result.internalLineCount).toBe(1);
    expect(result.amsExternalLineCount).toBe(1);
    expect(result.settlementAmountTotal).toBe(94000000);
    expect(result.latestHandoff).toMatchObject({
      id: '41',
      lineCount: 2,
      settlementAmountTotal: 94000000,
    });
    expect(result.unavailableActions).toEqual(['실제 외부 회계시스템 반영']);
    expect(result.lines.map((line) => line.source)).toEqual(['ams-external-cost', 'internal-cost']);
  });

  it('records accounting/payment handoff snapshots with a stable ledger activity', async () => {
    const { service, executeRawCalls, queryRawCalls, transactionCalls } = createService({
      internalMonthlyRows: [createInternalMonthlyRow({
        statusCode: 'confirmed',
        confirmed: true,
        confirmedAt: new Date('2026-07-08T15:00:00.000Z'),
        confirmedBy: 1n,
      })],
      amsVendorMappingRows: [createAmsMappingRow()],
      amsExternalMonthlyRows: [createAmsExternalMonthlyRow({
        statusCode: 'confirmed',
        confirmed: true,
        confirmedAt: new Date('2026-07-08T16:00:00.000Z'),
        confirmedBy: 1n,
      })],
    });

    const result = await service.createAccountingPaymentHandoff({
      year: 2026,
      region: 'all',
      memo: 'handoff snapshot',
    }, 1n);

    expect(transactionCalls).toHaveLength(1);
    expect(executeRawCalls).toHaveLength(1);
    expect(getSqlText(executeRawCalls[0])).toContain('accounting-payment-handoff-replaced');
    expect(queryRawCalls).toHaveLength(1);
    expect(getSqlText(queryRawCalls[0])).toContain('accounting-payment-handoff-create');
    expect(result.handoff).toMatchObject({
      id: '41',
      status: 'snapshot-created',
      lineCount: 2,
      settlementAmountTotal: 94000000,
    });
    expect(result.handoff.linesSnapshot).toHaveLength(2);
    expect(result.preview.latestHandoff).toMatchObject({ id: '41' });
  });

  it('records external accounting/payment execution evidence on the active handoff snapshot', async () => {
    const activeHandoff = createAccountingPaymentHandoffRow({
      id: 41n,
      previewSnapshot: {
        targetYear: 2026,
        readiness: 'ready',
        blockedReasons: [],
        lineCount: 2,
        internalLineCount: 1,
        amsExternalLineCount: 1,
        settlementAmountTotal: 94000000,
        lines: [],
        boundaryNotice: '회계 지급 snapshot',
        unavailableActions: ['회계 전표 발행', '지급 실행'],
        nextAction: '외부 회계·지급 시스템 반영 전 CRM handoff snapshot을 검토하세요.',
      },
      linesSnapshot: [
        { key: 'internal', source: 'internal-cost', sourceId: '11', targetYear: 2026, businessType: 'SI 구축', industryLine: '전력/제조', ownerName: '김민준', region: 'domestic', planAmountTotal: 25000000, actualAmountTotal: 21000000, gapAmountTotal: -4000000, settlementAmount: 21000000 },
        { key: 'ams', source: 'ams-external-cost', sourceId: '31', targetYear: 2026, businessType: 'SI 구축', industryLine: '전력/제조', ownerName: '김민준', region: 'domestic', wbsCode: 'WBS-AMS-001', vendorName: 'AMS 파트너', planAmountTotal: 78000000, actualAmountTotal: 73000000, gapAmountTotal: -5000000, settlementAmount: 73000000 },
      ],
      executionEvidenceSnapshot: [
        { key: 'accounting-voucher', evidencePath: 'external-accounting://voucher/old', evidenceLabel: '기존 전표' },
      ],
    });
    const savedHandoff = createAccountingPaymentHandoffRow({
      id: 42n,
      statusCode: 'execution-evidence-updated',
      previewSnapshot: activeHandoff.previewSnapshot,
      linesSnapshot: activeHandoff.linesSnapshot,
      executionEvidenceSnapshot: [
        {
          key: 'accounting-voucher',
          evidencePath: 'external-accounting://voucher/2026-001',
          evidenceLabel: '외부 전표 evidence',
          recordedAt: '2026-07-09T15:00:00.000Z',
        },
        {
          key: 'payment-execution',
          evidencePath: 'external-payment://runs/pay-2026-001',
          evidenceLabel: '외부 지급 evidence',
          recordedAt: '2026-07-09T15:00:00.000Z',
        },
      ],
      executionEvidenceUpdatedAt: new Date('2026-07-09T15:00:00.000Z'),
    });
    const { service, executeRawCalls, queryRawCalls, transactionCalls } = createService({
      internalMonthlyRows: [createInternalMonthlyRow({
        statusCode: 'confirmed',
        confirmed: true,
        confirmedAt: new Date('2026-07-08T15:00:00.000Z'),
        confirmedBy: 1n,
      })],
      amsVendorMappingRows: [createAmsMappingRow()],
      amsExternalMonthlyRows: [createAmsExternalMonthlyRow({
        statusCode: 'confirmed',
        confirmed: true,
        confirmedAt: new Date('2026-07-08T16:00:00.000Z'),
        confirmedBy: 1n,
      })],
      accountingPaymentHandoffRows: [activeHandoff],
      saveAccountingPaymentHandoffRow: savedHandoff,
    });

    const result = await service.recordAccountingPaymentExecutionEvidence('41', {
      steps: [
        {
          key: 'accounting-voucher',
          evidencePath: 'external-accounting://voucher/2026-001',
          evidenceLabel: '외부 전표 evidence',
        },
        {
          key: 'payment-execution',
          evidencePath: 'external-payment://runs/pay-2026-001',
          evidenceLabel: '외부 지급 evidence',
        },
      ],
      memo: '외부 회계 지급 evidence 수신',
    }, 1n);

    expect(transactionCalls).toHaveLength(1);
    expect(executeRawCalls).toHaveLength(1);
    expect(getSqlText(executeRawCalls[0])).toContain('accounting-payment-execution-evidence-replaced');
    expect(queryRawCalls).toHaveLength(1);
    expect(getSqlText(queryRawCalls[0])).toContain('accounting-payment-execution-evidence-record');
    expect(result.handoff).toMatchObject({
      id: '42',
      status: 'execution-evidence-updated',
      lineCount: 2,
      settlementAmountTotal: 94000000,
    });
    expect(result.appliedStepKeys).toEqual(['accounting-voucher', 'payment-execution']);
    expect(result.handoff.executionEvidence.map((step) => step.evidencePath)).toEqual([
      'external-accounting://voucher/2026-001',
      'external-payment://runs/pay-2026-001',
    ]);
    expect(result.preview.latestHandoff).toMatchObject({
      id: '42',
      status: 'execution-evidence-updated',
    });
  });

  it('executes accounting/payment handoff and records generated evidence steps', async () => {
    const activeHandoff = createAccountingPaymentHandoffRow({
      id: 41n,
      previewSnapshot: {
        targetYear: 2026,
        readiness: 'ready',
        blockedReasons: [],
        lineCount: 2,
        internalLineCount: 1,
        amsExternalLineCount: 1,
        settlementAmountTotal: 94000000,
        lines: [],
        boundaryNotice: '회계 지급 snapshot',
        unavailableActions: ['실제 외부 회계시스템 반영'],
        nextAction: '회계·지급 실행 evidence를 생성하세요.',
      },
      linesSnapshot: [
        { key: 'internal', source: 'internal-cost', sourceId: '11', targetYear: 2026, businessType: 'SI 구축', industryLine: '전력/제조', ownerName: '김민준', region: 'domestic', planAmountTotal: 25000000, actualAmountTotal: 21000000, gapAmountTotal: -4000000, settlementAmount: 21000000 },
        { key: 'ams', source: 'ams-external-cost', sourceId: '31', targetYear: 2026, businessType: 'SI 구축', industryLine: '전력/제조', ownerName: '김민준', region: 'domestic', wbsCode: 'WBS-AMS-001', vendorName: 'AMS 파트너', planAmountTotal: 78000000, actualAmountTotal: 73000000, gapAmountTotal: -5000000, settlementAmount: 73000000 },
      ],
    });
    const savedHandoff = createAccountingPaymentHandoffRow({
      id: 42n,
      statusCode: 'execution-evidence-updated',
      previewSnapshot: activeHandoff.previewSnapshot,
      linesSnapshot: activeHandoff.linesSnapshot,
      executionEvidenceSnapshot: [
        { key: 'accounting-voucher', evidencePath: 'crm-demo-accounting://handoffs/41/executions/demo/voucher', evidenceLabel: 'CRM demo accounting voucher' },
        { key: 'payment-request', evidencePath: 'crm-demo-accounting://handoffs/41/executions/demo/payment-request', evidenceLabel: 'CRM demo payment request' },
        { key: 'payment-execution', evidencePath: 'crm-demo-accounting://handoffs/41/executions/demo/payment-execution', evidenceLabel: 'CRM demo payment execution' },
        { key: 'external-system-sync', evidencePath: 'crm-demo-accounting://handoffs/41/executions/demo/external-sync', evidenceLabel: 'CRM demo external system sync' },
      ],
      executionEvidenceUpdatedAt: new Date('2026-07-09T15:00:00.000Z'),
    });
    const { service, executeRawCalls, queryRawCalls, transactionCalls } = createService({
      internalMonthlyRows: [createInternalMonthlyRow({
        statusCode: 'confirmed',
        confirmed: true,
        confirmedAt: new Date('2026-07-08T15:00:00.000Z'),
        confirmedBy: 1n,
      })],
      amsVendorMappingRows: [createAmsMappingRow()],
      amsExternalMonthlyRows: [createAmsExternalMonthlyRow({
        statusCode: 'confirmed',
        confirmed: true,
        confirmedAt: new Date('2026-07-08T16:00:00.000Z'),
        confirmedBy: 1n,
      })],
      accountingPaymentHandoffRows: [activeHandoff],
      saveAccountingPaymentHandoffRow: savedHandoff,
    });

    const result = await service.executeAccountingPayment('41', {
      memo: 'CRM demo 회계 지급 실행',
    }, 1n);

    expect(transactionCalls).toHaveLength(1);
    expect(executeRawCalls).toHaveLength(1);
    expect(getSqlText(executeRawCalls[0])).toContain('accounting-payment-execution-evidence-replaced');
    expect(queryRawCalls).toHaveLength(1);
    expect(getSqlText(queryRawCalls[0])).toContain('accounting-payment-execution-evidence-record');
    expect(result.appliedStepKeys).toEqual([
      'accounting-voucher',
      'payment-request',
      'payment-execution',
      'external-system-sync',
    ]);
    expect(result.externalExecution.providerMode).toBe('demo');
    expect(result.externalExecution.settlementAmountTotal).toBe(94000000);
    expect(result.externalExecution.artifacts).toHaveLength(4);
    expect(result.externalExecution.artifacts.map((artifact) => artifact.key)).toEqual([
      'accounting-voucher',
      'payment-request',
      'payment-execution',
      'external-system-sync',
    ]);
    expect(result.externalExecution.artifacts.every((artifact) => artifact.evidencePath.startsWith('crm-demo-accounting://handoffs/41/executions/'))).toBe(true);
    expect(result.handoff).toMatchObject({
      id: '42',
      status: 'execution-evidence-updated',
      lineCount: 2,
      settlementAmountTotal: 94000000,
    });
  });

  it('executes accounting/payment handoff through the configured external ERP API provider', async () => {
    const activeHandoff = createAccountingPaymentHandoffRow({
      id: 41n,
      previewSnapshot: {
        targetYear: 2026,
        readiness: 'ready',
        blockedReasons: [],
        lineCount: 2,
        internalLineCount: 1,
        amsExternalLineCount: 1,
        settlementAmountTotal: 94000000,
        lines: [],
        boundaryNotice: '회계 지급 snapshot',
        unavailableActions: ['실제 외부 회계시스템 반영'],
        nextAction: '회계·지급 실행 evidence를 생성하세요.',
      },
      linesSnapshot: [
        { key: 'internal', source: 'internal-cost', sourceId: '11', targetYear: 2026, businessType: 'SI 구축', industryLine: '전력/제조', ownerName: '김민준', region: 'domestic', planAmountTotal: 25000000, actualAmountTotal: 21000000, gapAmountTotal: -4000000, settlementAmount: 21000000 },
        { key: 'ams', source: 'ams-external-cost', sourceId: '31', targetYear: 2026, businessType: 'SI 구축', industryLine: '전력/제조', ownerName: '김민준', region: 'domestic', wbsCode: 'WBS-AMS-001', vendorName: 'AMS 파트너', planAmountTotal: 78000000, actualAmountTotal: 73000000, gapAmountTotal: -5000000, settlementAmount: 73000000 },
      ],
    });
    const savedHandoff = createAccountingPaymentHandoffRow({
      id: 42n,
      statusCode: 'execution-evidence-updated',
      previewSnapshot: activeHandoff.previewSnapshot,
      linesSnapshot: activeHandoff.linesSnapshot,
      executionEvidenceSnapshot: [
        { key: 'accounting-voucher', evidencePath: 'erp://voucher/VCH-2026-001', evidenceLabel: 'ERP voucher' },
        { key: 'payment-request', evidencePath: 'erp://payment-request/PAYREQ-2026-001', evidenceLabel: 'ERP payment request' },
        { key: 'payment-execution', evidencePath: 'erp://payment-execution/PAYEXE-2026-001', evidenceLabel: 'ERP payment execution' },
        { key: 'external-system-sync', evidencePath: 'erp://sync/SYNC-2026-001', evidenceLabel: 'ERP sync' },
      ],
      executionEvidenceUpdatedAt: new Date('2026-07-09T15:00:00.000Z'),
    });
    const externalRequests: unknown[] = [];
    const externalExecutor: Pick<AccountingPaymentExternalExecutorService, 'isConfigured' | 'execute'> = {
      isConfigured: () => true,
      execute: async (payload) => {
        externalRequests.push(payload);
        return {
          executionId: 'erp-run-2026-001',
          executedAt: '2026-07-09T16:00:00.000Z',
          settlementAmountTotal: payload.settlementAmountTotal,
          providerName: 'sample-erp',
          providerRequestId: 'req-erp-001',
          artifacts: [
            { key: 'accounting-voucher', label: 'ERP voucher', evidencePath: 'erp://voucher/VCH-2026-001', referenceNo: 'VCH-2026-001', amount: 94000000, executedAt: '2026-07-09T16:00:00.000Z' },
            { key: 'payment-request', label: 'ERP payment request', evidencePath: 'erp://payment-request/PAYREQ-2026-001', referenceNo: 'PAYREQ-2026-001', amount: 94000000, executedAt: '2026-07-09T16:00:00.000Z' },
            { key: 'payment-execution', label: 'ERP payment execution', evidencePath: 'erp://payment-execution/PAYEXE-2026-001', referenceNo: 'PAYEXE-2026-001', amount: 94000000, executedAt: '2026-07-09T16:00:00.000Z' },
            { key: 'external-system-sync', label: 'ERP sync', evidencePath: 'erp://sync/SYNC-2026-001', referenceNo: 'SYNC-2026-001', amount: 94000000, executedAt: '2026-07-09T16:00:00.000Z' },
          ],
        };
      },
    };
    const { service, executeRawCalls, queryRawCalls } = createService({
      internalMonthlyRows: [createInternalMonthlyRow({
        statusCode: 'confirmed',
        confirmed: true,
        confirmedAt: new Date('2026-07-08T15:00:00.000Z'),
        confirmedBy: 1n,
      })],
      amsVendorMappingRows: [createAmsMappingRow()],
      amsExternalMonthlyRows: [createAmsExternalMonthlyRow({
        statusCode: 'confirmed',
        confirmed: true,
        confirmedAt: new Date('2026-07-08T16:00:00.000Z'),
        confirmedBy: 1n,
      })],
      accountingPaymentHandoffRows: [activeHandoff],
      saveAccountingPaymentHandoffRow: savedHandoff,
      externalExecutor,
    });

    const result = await service.executeAccountingPayment('41', {
      mode: 'external-api',
      memo: '외부 ERP API 실행',
    }, 1n);

    expect(externalRequests).toHaveLength(1);
    expect(externalRequests[0]).toMatchObject({
      handoffId: '41',
      targetYear: 2026,
      lineCount: 2,
      settlementAmountTotal: 94000000,
      requestedBy: '1',
    });
    expect(executeRawCalls).toHaveLength(1);
    expect(getSqlText(executeRawCalls[0])).toContain('accounting-payment-execution-evidence-replaced');
    expect(queryRawCalls).toHaveLength(1);
    expect(getSqlText(queryRawCalls[0])).toContain('accounting-payment-execution-evidence-record');
    expect(result.externalExecution).toMatchObject({
      providerMode: 'external-api',
      providerName: 'sample-erp',
      providerRequestId: 'req-erp-001',
      executionId: 'erp-run-2026-001',
      settlementAmountTotal: 94000000,
    });
    expect(result.appliedStepKeys).toEqual([
      'accounting-voucher',
      'payment-request',
      'payment-execution',
      'external-system-sync',
    ]);
    expect(result.handoff.executionEvidence.map((step) => step.evidencePath)).toEqual([
      'erp://voucher/VCH-2026-001',
      'erp://payment-request/PAYREQ-2026-001',
      'erp://payment-execution/PAYEXE-2026-001',
      'erp://sync/SYNC-2026-001',
    ]);
  });

  it('rejects external accounting/payment execution when the provider is not configured', async () => {
    const activeHandoff = createAccountingPaymentHandoffRow({
      id: 41n,
      linesSnapshot: [
        { key: 'internal', source: 'internal-cost', sourceId: '11', targetYear: 2026, businessType: 'SI 구축', industryLine: '전력/제조', ownerName: '김민준', region: 'domestic', planAmountTotal: 25000000, actualAmountTotal: 21000000, gapAmountTotal: -4000000, settlementAmount: 21000000 },
      ],
    });
    const { service, executeRawCalls, queryRawCalls } = createService({
      accountingPaymentHandoffRows: [activeHandoff],
    });

    await expect(service.executeAccountingPayment('41', {
      mode: 'external-api',
      memo: '외부 ERP API 실행',
    }, 1n)).rejects.toThrow('CRM 외부 회계·지급 API provider가 설정되지 않았습니다.');
    expect(executeRawCalls).toHaveLength(0);
    expect(queryRawCalls).toHaveLength(0);
  });

  it('rejects accounting/payment handoff snapshots without confirmed costs', async () => {
    const { service, executeRawCalls, queryRawCalls } = createService({
      internalMonthlyRows: [createInternalMonthlyRow()],
      amsExternalMonthlyRows: [createAmsExternalMonthlyRow()],
    });

    await expect(service.createAccountingPaymentHandoff({
      year: 2026,
      region: 'all',
      memo: '확정 전 handoff',
    }, 1n)).rejects.toThrow('확정된 내부원가 또는 AMS 정산 확정 row');
    expect(executeRawCalls).toHaveLength(0);
    expect(queryRawCalls).toHaveLength(0);
  });
});
