import type {
  CrmContract,
  CrmContractListResponse,
  CrmOpportunity,
  CrmOpportunityListResponse,
  CrmQuoteSellerProfile,
} from '@ssoo/types/crm';
import type { ContractService } from '../contract/contract.service.js';
import type { OpportunityService } from '../opportunity/opportunity.service.js';
import type { QuoteSettingsService } from '../quote-settings/quote-settings.service.js';
import { DashboardService } from './dashboard.service.js';

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
    status: 'won',
    priority: 'high',
    version: 1,
    versionCount: 1,
    isLatest: true,
    confirmed: true,
    contractCreated: false,
    expectedStartDate: '2026-08-01',
    expectedEndDate: '2026-12-31',
    quoteStatus: 'approved',
    revenueSubtotal: 820000000,
    specialDiscountType: 'amount',
    specialDiscountValue: 0,
    specialDiscountAmount: 0,
    revenueTotal: 820000000,
    costTotal: 560000000,
    marginTotal: 260000000,
    marginRate: 31.7,
    revenueLines: [{ id: 'r1', category: 'product', label: '매출', quantity: 1, unitPrice: 820000000, amount: 820000000 }],
    costLines: [{ id: 'c1', category: 'product', label: '원가', quantity: 1, unitPrice: 560000000, amount: 560000000 }],
    pmsHandoffStatus: 'planned',
    dmsLinkStatus: 'planned',
    adminBoundary: 'shared-admin',
    nextAction: '계약 전환 조건 검토',
    updatedAt: '2026-07-07T01:00:00.000Z',
    ...seed,
  };
}

function createContract(seed: Partial<CrmContract>): CrmContract {
  return {
    id: 'crm-ct-001',
    code: 'crm-ct-001',
    customerName: 'LS ITC',
    contractName: 'PMS/DMS readiness 검증 계약',
    ownerName: '이현우',
    businessType: '업무 시스템',
    industryLine: '설비/정비',
    region: 'domestic',
    status: 'active',
    confirmed: true,
    contractStartDate: '2026-09-01',
    contractEndDate: '2026-10-31',
    wbsCode: 'WBS-CRM-001',
    paymentTermCode: 'NET30',
    revenueSubtotal: 200000000,
    specialDiscountType: 'amount',
    specialDiscountValue: 0,
    specialDiscountAmount: 0,
    revenueTotal: 200000000,
    costTotal: 60000000,
    externalCostTotal: 60000000,
    marginTotal: 140000000,
    marginRate: 70,
    revenueLines: [],
    costLines: [],
    billingPlan: [
      { id: '1', billingYm: '2026/09', revenueAmount: 100000000, externalCostAmount: 30000000 },
      { id: '2', billingYm: '2026/10', revenueAmount: 100000000, externalCostAmount: 30000000 },
    ],
    pmsHandoffStatus: 'planned',
    dmsLinkStatus: 'planned',
    adminBoundary: 'shared-admin',
    nextAction: 'PMS 인계와 DMS 문서 패킷 확인',
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
      unimplementedIntegrations: ['견적 생성', 'DMS 연결'],
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
      unimplementedIntegrations: ['DMS 계약서 저장', 'PMS 프로젝트 생성'],
      activeFilters: { search: '', status: 'all', sort: 'updated-desc' },
    },
    items,
  };
}

function createService(params?: {
  opportunities?: CrmOpportunity[];
  confirmedOpportunities?: CrmOpportunity[];
  contracts?: CrmContract[];
  sellerProfile?: CrmQuoteSellerProfile;
}) {
  const opportunities = params?.opportunities ?? [createOpportunity({})];
  const contracts = params?.contracts ?? [createContract({})];
  const sellerProfile = params?.sellerProfile ?? {
    id: 'seller-1',
    profileCode: 'default',
    companyName: 'SSOO 주식회사',
    ceoName: '홍길동',
    businessRegistrationNo: '123-45-67890',
    address: '서울특별시 중구 세종대로 1',
    ciStatus: 'configured',
    updatedAt: '2026-07-07T00:00:00.000Z',
  };
  const opportunityService: Pick<OpportunityService, 'listResponse' | 'listSourceDashboardOpportunities'> = {
    listResponse: async () => createOpportunityResponse(opportunities),
    listSourceDashboardOpportunities: async () => ({
      latest: opportunities,
      confirmed: params?.confirmedOpportunities ?? opportunities.filter((item) => item.confirmed),
    }),
  };
  const contractService: Pick<ContractService, 'listResponse'> = {
    listResponse: async () => createContractResponse(contracts),
  };
  const quoteSettingsService: Pick<QuoteSettingsService, 'getSellerProfile' | 'toSellerInfoStatus'> = {
    getSellerProfile: async () => sellerProfile,
    toSellerInfoStatus: (profile) => {
      if (!profile || profile.ciStatus === 'not-configured') {
        return 'not-configured';
      }
      if (profile.ciStatus === 'dms-planned') {
        return 'dms-ci-planned';
      }
      return 'configured';
    },
  };

  return new DashboardService(
    opportunityService as OpportunityService,
    contractService as ContractService,
    quoteSettingsService as QuoteSettingsService,
  );
}

describe('DashboardService', () => {
  it('counts an older confirmed version while status and recent entries use the latest draft', async () => {
    const result = await createService({
      opportunities: [createOpportunity({ id: 'draft-v2', version: 2, confirmed: false, status: 'proposal' })],
      confirmedOpportunities: [createOpportunity({ id: 'confirmed-v1', isLatest: false })],
    }).getDashboard();
    expect(result.sourceCompatibility.confirmedSummary).toMatchObject({ totalGroupCount: 1, confirmedLatestCount: 1, revenueTotal: 820000000 });
    expect(result.sourceCompatibility.recentOpportunities[0].id).toBe('draft-v2');
    expect(result.sourceCompatibility.statusDistribution.find((item) => item.status === '진행중')?.count).toBe(1);
  });

  it('uses raw quantity and price for every revenue and cost category without DC or truncation', async () => {
    const result = await createService({ opportunities: [createOpportunity({
      revenueTotal: 35000, costTotal: 6000, specialDiscountAmount: 500,
      revenueLines: [
        { id: 'r1', category: 'product', label: '상품', quantity: 3, unitPrice: 12345, amount: 37000, truncUnit: 1000 },
        { id: 'r2', category: 'service', label: '용역', quantity: 0.5, unitPrice: 123, amount: 50, truncUnit: 10 },
      ],
      costLines: [
        { id: 'c1', category: 'product', label: '상품', quantity: 1, unitPrice: 1234, amount: 1000 },
        { id: 'c2', category: 'internal-cost', label: '내부', quantity: 1, unitPrice: 2345, amount: 2000 },
        { id: 'c3', category: 'external-cost', label: '외부', quantity: 1, unitPrice: 3456, amount: 3000 },
      ],
    })] }).getDashboard();
    expect(result.sourceCompatibility.confirmedSummary).toMatchObject({ revenueTotal: 37096.5, costTotal: 7035, marginTotal: 30061.5, marginRate: 81 });
    expect(result.opportunitySummary.totalRevenue).toBe(35000);
    expect(result.opportunitySummary.totalCost).toBe(6000);
  });

  it('takes five groups in reverse registration order without re-sorting their update timestamps', async () => {
    const opportunities = Array.from({ length: 7 }, (_, index) => createOpportunity({
      id: `group-${index + 1}`, updatedAt: `2026-09-${String(30 - index).padStart(2, '0')}T00:00:00Z`,
    }));
    const result = await createService({ opportunities }).getDashboard();
    expect(result.sourceCompatibility.recentOpportunities.map((item) => item.id)).toEqual(['group-7', 'group-6', 'group-5', 'group-4', 'group-3']);
  });

  it('returns zero totals without NaN for empty and zero-revenue data', async () => {
    const empty = await createService({ opportunities: [], contracts: [] }).getDashboard();
    expect(empty.sourceCompatibility.confirmedSummary).toEqual({ totalGroupCount: 0, confirmedLatestCount: 0, revenueTotal: 0, costTotal: 0, marginTotal: 0, marginRate: 0 });
    expect(empty.sourceCompatibility.recentOpportunities).toEqual([]);
    expect(empty.sourceCompatibility.statusDistribution.every((item) => item.percentage === 0)).toBe(true);
    const zero = await createService({ opportunities: [createOpportunity({ revenueLines: [] })] }).getDashboard();
    expect(zero.sourceCompatibility.confirmedSummary.marginRate).toBe(0);
    expect(zero.sourceCompatibility.confirmedSummary.marginTotal).toBe(-560000000);
  });

  it('combines opportunity, contract, PMS, and DMS readiness into a CRM home summary', async () => {
    const service = createService();

    const result = await service.getDashboard();

    expect(result.opportunitySummary.totalCount).toBe(1);
    expect(result.contractSummary.totalCount).toBe(1);
    expect(result.pipeline.find((stage) => stage.status === 'won')).toMatchObject({
      count: 1,
      revenueTotal: 820000000,
    });
    expect(result.queues).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'quote', readyCount: 1, blockedCount: 0 }),
      expect.objectContaining({ key: 'contract-conversion', readyCount: 1, blockedCount: 0 }),
      expect.objectContaining({ key: 'pms-handoff', readyCount: 1, blockedCount: 0 }),
      expect.objectContaining({ key: 'dms-document', readyCount: 1, blockedCount: 0 }),
    ]));
    expect(result.nextActions[0]).toMatchObject({
      kind: 'contract',
      title: 'PMS/DMS readiness 검증 계약',
    });
    expect(result.sourceCompatibility).toMatchObject({
      calculationBasis: 'latest-confirmed-version-raw-total',
      confirmedSummary: {
        totalGroupCount: 1,
        confirmedLatestCount: 1,
        revenueTotal: 820000000,
        costTotal: 560000000,
        marginTotal: 260000000,
        marginRate: 32,
      },
      recentOpportunities: [
        expect.objectContaining({ id: 'crm-opp-001', status: '계약완료', href: '/opportunities?selected=crm-opp-001' }),
      ],
    });
    expect(result.sourceCompatibility.statusDistribution).toEqual([
      { status: '진행중', count: 0, percentage: 0 },
      { status: '검토중', count: 0, percentage: 0 },
      { status: '계약완료', count: 1, percentage: 100 },
      { status: '실패', count: 0, percentage: 0 },
    ]);
    expect(result.unimplementedIntegrations).toEqual(['견적 생성', 'DMS 연결', 'DMS 계약서 저장', 'PMS 프로젝트 생성']);
  });

  it('keeps DMS document packets blocked when seller legal information is incomplete', async () => {
    const service = createService({
      sellerProfile: {
        id: 'seller-1',
        profileCode: 'default',
        companyName: 'SSOO 영업팀',
        ciStatus: 'dms-planned',
        updatedAt: '2026-07-07T00:00:00.000Z',
      },
    });

    const result = await service.getDashboard();
    const dmsQueue = result.queues.find((queue) => queue.key === 'dms-document');

    expect(result.sellerInfoStatus).toBe('dms-ci-planned');
    expect(dmsQueue).toMatchObject({
      readyCount: 0,
      blockedCount: 1,
      state: 'blocked',
    });
  });
});
