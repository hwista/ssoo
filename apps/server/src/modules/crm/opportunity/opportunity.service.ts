import { Injectable, NotFoundException } from '@nestjs/common';
import type { CrmOpportunity, CrmOpportunityListQuery, CrmOpportunityListResponse, CrmOpportunitySort, CrmOpportunityStatus, CrmOpportunitySummary } from '@ssoo/types/crm';
import { CRM_OPPORTUNITIES } from './opportunity.fixture.js';

const DEFAULT_SORT: CrmOpportunitySort = 'updated-desc';
const CRM_BOUNDARY_NOTICE = 'CRM은 계약/청구/매출/원가 원장을 소유하고 PMS는 실행 수행과 읽기용 인계 스냅샷만 소비합니다.';
const UNIMPLEMENTED_INTEGRATIONS = ['견적 생성', '계약 전환', 'DMS 연결', 'PMS 인계'];
const STATUSES: CrmOpportunityStatus[] = ['draft', 'qualified', 'proposal', 'won', 'lost', 'hold'];
const SORTS: CrmOpportunitySort[] = ['updated-desc', 'revenue-desc', 'margin-desc'];

@Injectable()
export class OpportunityService {
  listOpportunities(query: CrmOpportunityListQuery = {}) {
    const normalized = this.normalizeQuery(query);
    const search = normalized.search.toLowerCase();

    return CRM_OPPORTUNITIES.filter((item) => {
      const matchesStatus = normalized.status === 'all' || item.status === normalized.status;
      const searchable = [item.customerName, item.opportunityName, item.ownerName, item.businessType, item.industryLine].join(' ').toLowerCase();
      const matchesSearch = search.length === 0 || searchable.includes(search);
      return matchesStatus && matchesSearch;
    }).sort((left, right) => {
      if (normalized.sort === 'revenue-desc') return right.revenueTotal - left.revenueTotal;
      if (normalized.sort === 'margin-desc') return right.marginRate - left.marginRate;
      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    });
  }

  getOpportunity(id: string) {
    const opportunity = CRM_OPPORTUNITIES.find((item) => item.id === id);
    if (!opportunity) {
      throw new NotFoundException('CRM opportunity not found');
    }
    return opportunity;
  }

  getSummary(items: CrmOpportunity[] = CRM_OPPORTUNITIES, query: CrmOpportunityListQuery = {}): CrmOpportunitySummary {
    const normalized = this.normalizeQuery(query);
    const totalRevenue = CRM_OPPORTUNITIES.reduce((sum, item) => sum + item.revenueTotal, 0);
    const totalCost = CRM_OPPORTUNITIES.reduce((sum, item) => sum + item.costTotal, 0);
    const totalMargin = totalRevenue - totalCost;

    return {
      totalCount: CRM_OPPORTUNITIES.length,
      filteredCount: items.length,
      qualifiedCount: CRM_OPPORTUNITIES.filter((item) => item.status === 'qualified').length,
      proposalCount: CRM_OPPORTUNITIES.filter((item) => item.status === 'proposal').length,
      wonCount: CRM_OPPORTUNITIES.filter((item) => item.status === 'won').length,
      totalRevenue,
      totalCost,
      totalMargin,
      grossMarginRate: totalRevenue > 0 ? Math.round((totalMargin / totalRevenue) * 1000) / 10 : 0,
      boundaryNotice: CRM_BOUNDARY_NOTICE,
      unimplementedIntegrations: UNIMPLEMENTED_INTEGRATIONS,
      activeFilters: normalized,
    };
  }

  listResponse(query: CrmOpportunityListQuery = {}): CrmOpportunityListResponse {
    const items = this.listOpportunities(query);
    return { summary: this.getSummary(items, query), items };
  }

  private normalizeQuery(query: CrmOpportunityListQuery): Required<CrmOpportunityListQuery> {
    const status = query.status && STATUSES.includes(query.status as CrmOpportunityStatus) ? query.status : 'all';
    const sort = query.sort && SORTS.includes(query.sort) ? query.sort : DEFAULT_SORT;
    return { search: query.search?.trim() ?? '', status, sort };
  }
}
