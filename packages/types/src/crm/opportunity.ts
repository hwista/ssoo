export type CrmOpportunityStatus = 'draft' | 'qualified' | 'proposal' | 'won' | 'lost' | 'hold';
export type CrmOpportunityPriority = 'high' | 'medium' | 'low';
export type CrmIntegrationStatus = 'planned' | 'not-implemented';
export type CrmAdminBoundary = 'shared-admin';
export type CrmOpportunitySort = 'updated-desc' | 'revenue-desc' | 'margin-desc';

export interface CrmOpportunityListQuery {
  search?: string;
  status?: CrmOpportunityStatus | 'all';
  sort?: CrmOpportunitySort;
}

export interface CrmOpportunityLine {
  id: string;
  category: 'product' | 'service' | 'internal-cost' | 'external-cost';
  label: string;
  amount: number;
}

export interface CrmOpportunity {
  id: string;
  customerName: string;
  opportunityName: string;
  ownerName: string;
  businessType: string;
  industryLine: string;
  region: 'domestic' | 'overseas';
  status: CrmOpportunityStatus;
  priority: CrmOpportunityPriority;
  version: number;
  confirmed: boolean;
  expectedStartDate: string;
  expectedEndDate: string;
  revenueTotal: number;
  costTotal: number;
  marginTotal: number;
  marginRate: number;
  revenueLines: CrmOpportunityLine[];
  costLines: CrmOpportunityLine[];
  pmsHandoffStatus: CrmIntegrationStatus;
  dmsLinkStatus: CrmIntegrationStatus;
  adminBoundary: CrmAdminBoundary;
  nextAction: string;
  updatedAt: string;
}

export interface CrmOpportunitySummary {
  totalCount: number;
  filteredCount: number;
  qualifiedCount: number;
  proposalCount: number;
  wonCount: number;
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  grossMarginRate: number;
  boundaryNotice: string;
  unimplementedIntegrations: string[];
  activeFilters: Required<CrmOpportunityListQuery>;
}

export interface CrmOpportunityListResponse {
  summary: CrmOpportunitySummary;
  items: CrmOpportunity[];
}
