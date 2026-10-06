import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { Injectable } from '@nestjs/common';
import type {
  CrmContract,
  CrmDashboardNextAction,
  CrmDashboardPipelineStage,
  CrmDashboardQueue,
  CrmDashboardQueueState,
  CrmDashboardResponse,
  CrmOpportunity,
  CrmSourceOpportunityStatus,
  CrmOpportunityStatus,
  CrmQuotePreviewSellerInfoStatus,
  CrmQuoteSellerProfile,
} from '@ssoo/types/crm';
import { ContractService } from '../contract/contract.service.js';
import { OpportunityService } from '../opportunity/opportunity.service.js';
import { QuoteSettingsService } from '../quote-settings/quote-settings.service.js';

const CRM_DASHBOARD_BOUNDARY_NOTICE = '계약/청구/매출/원가는 CRM 원장, PMS 수행과 DMS 문서 lifecycle은 경계로 분리합니다. DMS markdown 초안 저장은 계약 상세에서만 제한적으로 수행합니다.';

const OPPORTUNITY_STATUS_LABELS: Record<CrmOpportunityStatus, string> = {
  draft: '초안',
  qualified: '검증',
  proposal: '제안',
  won: '수주',
  lost: '실주',
  hold: '보류',
};

const SOURCE_STATUS_ORDER: CrmSourceOpportunityStatus[] = ['진행중', '검토중', '계약완료', '실패'];
const SOURCE_CALCULATION_NOTICE = '각 영업기회의 확정된 차수 중 최신 차수를 집계합니다. 원천 대시보드와 동일하게 DC·절사 전 수량×단가 합계를 사용합니다.';

@Injectable()
export class DashboardService {
  constructor(
    private readonly opportunityService: OpportunityService,
    private readonly contractService: ContractService,
    private readonly quoteSettingsService: QuoteSettingsService,
  ) {}

  async getDashboard(currentUser?: TokenPayload): Promise<CrmDashboardResponse> {
    const [opportunityResponse, contractResponse, sellerProfile, sourceOpportunities] = await Promise.all([
      this.opportunityService.listResponse({ sort: 'updated-desc' }, currentUser),
      this.contractService.listResponse({ sort: 'updated-desc' }, currentUser),
      this.quoteSettingsService.getSellerProfile(),
      this.opportunityService.listSourceDashboardOpportunities(currentUser),
    ]);
    const sellerInfoStatus = this.quoteSettingsService.toSellerInfoStatus(sellerProfile);
    const opportunities = opportunityResponse.items;
    const contracts = contractResponse.items;
    const queues = this.buildQueues(opportunities, contracts, sellerProfile, sellerInfoStatus);

    return {
      generatedAt: new Date().toISOString(),
      boundaryNotice: CRM_DASHBOARD_BOUNDARY_NOTICE,
      sellerInfoStatus,
      opportunitySummary: opportunityResponse.summary,
      contractSummary: contractResponse.summary,
      pipeline: this.buildPipeline(opportunities),
      queues,
      nextActions: this.buildNextActions(opportunities, contracts),
      sourceCompatibility: this.buildSourceCompatibility(sourceOpportunities.latest, sourceOpportunities.confirmed),
      unimplementedIntegrations: this.mergeUnique([
        ...opportunityResponse.summary.unimplementedIntegrations,
        ...contractResponse.summary.unimplementedIntegrations,
      ]),
    };
  }

  private buildSourceCompatibility(opportunities: CrmOpportunity[], confirmedLatest: CrmOpportunity[]): CrmDashboardResponse['sourceCompatibility'] {
    const rawTotal = (lines: CrmOpportunity['revenueLines']) => lines.reduce((sum, line) => sum + (line.quantity ?? 0) * (line.unitPrice ?? 0), 0);
    const revenueTotal = confirmedLatest.reduce((sum, item) => sum + rawTotal(item.revenueLines), 0);
    const costTotal = confirmedLatest.reduce((sum, item) => sum + rawTotal(item.costLines), 0);
    const marginTotal = revenueTotal - costTotal;

    return {
      calculationBasis: 'latest-confirmed-version-raw-total',
      calculationNotice: SOURCE_CALCULATION_NOTICE,
      confirmedSummary: {
        totalGroupCount: opportunities.length,
        confirmedLatestCount: confirmedLatest.length,
        revenueTotal,
        costTotal,
        marginTotal,
        marginRate: revenueTotal > 0 ? Math.round((marginTotal / revenueTotal) * 100) : 0,
      },
      statusDistribution: SOURCE_STATUS_ORDER.map((status) => {
        const count = opportunities.filter((item) => this.toSourceStatus(item.status) === status).length;
        return {
          status,
          count,
          percentage: opportunities.length > 0 ? Math.round((count / opportunities.length) * 100) : 0,
        };
      }),
      recentOpportunities: [...opportunities].reverse().slice(0, 5).map((item) => ({
        id: item.id,
        customerName: item.customerName,
        opportunityName: item.opportunityName,
        ownerName: item.ownerName,
        status: this.toSourceStatus(item.status),
        updatedAt: item.updatedAt,
        href: `/opportunities?selected=${encodeURIComponent(item.id)}`,
      })),
    };
  }

  private toSourceStatus(status: CrmOpportunityStatus): CrmSourceOpportunityStatus {
    if (status === 'proposal') return '진행중';
    if (status === 'won') return '계약완료';
    if (status === 'lost') return '실패';
    return '검토중';
  }

  private buildPipeline(opportunities: CrmOpportunity[]): CrmDashboardPipelineStage[] {
    return (Object.keys(OPPORTUNITY_STATUS_LABELS) as CrmOpportunityStatus[]).map((status) => {
      const items = opportunities.filter((item) => item.status === status);
      const revenueTotal = items.reduce((sum, item) => sum + item.revenueTotal, 0);
      const marginTotal = items.reduce((sum, item) => sum + item.marginTotal, 0);
      return {
        status,
        label: OPPORTUNITY_STATUS_LABELS[status],
        count: items.length,
        revenueTotal,
        marginTotal,
      };
    });
  }

  private buildQueues(
    opportunities: CrmOpportunity[],
    contracts: CrmContract[],
    sellerProfile: CrmQuoteSellerProfile,
    sellerInfoStatus: CrmQuotePreviewSellerInfoStatus,
  ): CrmDashboardQueue[] {
    const quoteCandidates = opportunities.filter((item) => item.revenueTotal > 0 && item.status !== 'lost' && item.status !== 'hold');
    const contractConversionCandidates = opportunities.filter((item) => item.confirmed && !item.contractCreated && item.status === 'won');
    const pmsReadyContracts = contracts.filter((item) => this.isPmsHandoffReady(item));
    const pmsBlockedContracts = contracts.filter((item) => item.confirmed && !this.isPmsHandoffReady(item));
    const dmsReadyContracts = contracts.filter((item) => this.isDmsDocumentPacketReady(item, sellerProfile, sellerInfoStatus));
    const dmsBlockedContracts = contracts.filter((item) => item.confirmed && !this.isDmsDocumentPacketReady(item, sellerProfile, sellerInfoStatus));

    return [
      {
        key: 'quote',
        label: '견적 후보',
        count: quoteCandidates.length,
        readyCount: quoteCandidates.length,
        blockedCount: opportunities.length - quoteCandidates.length,
        amountTotal: quoteCandidates.reduce((sum, item) => sum + item.revenueTotal, 0),
        href: '/opportunities',
        state: this.toQueueState(quoteCandidates.length, opportunities.length - quoteCandidates.length),
        description: '영업기회 원장 기반 읽기 전용 견적 후보',
      },
      {
        key: 'contract-conversion',
        label: '계약 전환',
        count: contractConversionCandidates.length,
        readyCount: contractConversionCandidates.length,
        blockedCount: opportunities.filter((item) => item.confirmed && item.contractCreated).length,
        amountTotal: contractConversionCandidates.reduce((sum, item) => sum + item.revenueTotal, 0),
        href: '/opportunities',
        state: this.toQueueState(contractConversionCandidates.length, 0),
        description: '최신 확정 영업기회 중 계약 원장 전환 대기',
      },
      {
        key: 'pms-handoff',
        label: 'PMS 인계',
        count: pmsReadyContracts.length + pmsBlockedContracts.length,
        readyCount: pmsReadyContracts.length,
        blockedCount: pmsBlockedContracts.length,
        amountTotal: pmsReadyContracts.reduce((sum, item) => sum + item.revenueTotal, 0),
        href: '/contracts',
        state: this.toQueueState(pmsReadyContracts.length, pmsBlockedContracts.length),
        description: '확정 계약의 실행 스냅샷 readiness',
      },
      {
        key: 'dms-document',
        label: 'DMS 문서 패킷',
        count: dmsReadyContracts.length + dmsBlockedContracts.length,
        readyCount: dmsReadyContracts.length,
        blockedCount: dmsBlockedContracts.length,
        amountTotal: dmsReadyContracts.reduce((sum, item) => sum + item.revenueTotal, 0),
        href: '/contracts',
        state: this.toQueueState(dmsReadyContracts.length, dmsBlockedContracts.length),
        description: '계약서 생성 전 입력 변수와 공급자 정보 readiness',
      },
    ];
  }

  private buildNextActions(
    opportunities: CrmOpportunity[],
    contracts: CrmContract[],
  ): CrmDashboardNextAction[] {
    const opportunityActions = opportunities
      .filter((item) => item.status !== 'lost' && item.status !== 'hold')
      .map((item): CrmDashboardNextAction => ({
        id: item.id,
        kind: 'opportunity',
        title: item.opportunityName,
        customerName: item.customerName,
        ownerName: item.ownerName,
        statusLabel: OPPORTUNITY_STATUS_LABELS[item.status],
        nextAction: item.nextAction,
        amount: item.revenueTotal,
        href: `/opportunities?selected=${encodeURIComponent(item.id)}`,
        updatedAt: item.updatedAt,
      }));
    const contractActions = contracts.map((item): CrmDashboardNextAction => ({
      id: item.id,
      kind: 'contract',
      title: item.contractName,
      customerName: item.customerName,
      ownerName: item.ownerName,
      statusLabel: item.confirmed ? '확정 계약' : '검토 계약',
      nextAction: item.nextAction,
      amount: item.revenueTotal,
      href: `/contracts?selected=${encodeURIComponent(item.id)}`,
      updatedAt: item.updatedAt,
    }));

    return [...opportunityActions, ...contractActions]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 6);
  }

  private isPmsHandoffReady(contract: CrmContract): boolean {
    const billingRevenueTotal = contract.billingPlan.reduce((sum, line) => sum + line.revenueAmount, 0);
    const billingExternalCostTotal = contract.billingPlan.reduce((sum, line) => sum + line.externalCostAmount, 0);
    return contract.confirmed
      && Boolean(contract.wbsCode?.trim())
      && contract.billingPlan.length > 0
      && billingRevenueTotal === contract.revenueTotal
      && billingExternalCostTotal === contract.externalCostTotal;
  }

  private isDmsDocumentPacketReady(
    contract: CrmContract,
    sellerProfile: CrmQuoteSellerProfile,
    sellerInfoStatus: CrmQuotePreviewSellerInfoStatus,
  ): boolean {
    return contract.confirmed
      && Boolean(contract.wbsCode?.trim())
      && contract.revenueTotal > 0
      && contract.billingPlan.length > 0
      && contract.dmsLinkStatus !== 'not-implemented'
      && sellerInfoStatus !== 'not-configured'
      && Boolean(sellerProfile.businessRegistrationNo?.trim())
      && Boolean(sellerProfile.ceoName?.trim())
      && Boolean(sellerProfile.address?.trim());
  }

  private toQueueState(readyCount: number, blockedCount: number): CrmDashboardQueueState {
    if (readyCount > 0 && blockedCount === 0) {
      return 'ready';
    }
    if (readyCount > 0) {
      return 'watch';
    }
    return 'blocked';
  }

  private mergeUnique(values: string[]): string[] {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }
}
