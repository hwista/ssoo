import type { CrmContract } from './contract.js';

export type CrmOpportunityStatus = 'draft' | 'qualified' | 'proposal' | 'won' | 'lost' | 'hold';
export type CrmSourceOpportunityStatus = '진행중' | '검토중' | '계약완료' | '실패';
export type CrmOpportunityPriority = 'high' | 'medium' | 'low';
export type CrmIntegrationStatus = 'planned' | 'draft-created' | 'not-implemented';
export type CrmAdminBoundary = 'shared-admin';
export type CrmOpportunitySort = 'customer-asc' | 'updated-desc' | 'revenue-desc' | 'profit-desc' | 'margin-desc';
export type CrmOpportunityLineCategory = 'product' | 'service' | 'internal-cost' | 'external-cost';
export type CrmOpportunityServiceType = 'internal' | 'external';
export type CrmOpportunityDiscountType = 'amount' | 'rate';
export type CrmOpportunityHistoryEventType = 'create' | 'update' | 'delete';
export type CrmQuoteWorkflowStatus = 'draft' | 'review' | 'approved' | 'sent' | 'accepted' | 'rejected' | 'void';

export interface CrmOpportunityListQuery {
  /** Source list searches three display fields and sorts DC/truncation-free totals. */
  view?: 'source-list';
  search?: string;
  status?: CrmOpportunityStatus | 'all';
  sourceStatus?: CrmSourceOpportunityStatus | 'all';
  sort?: CrmOpportunitySort;
}

export interface CrmOpportunityOwnerLookupItem {
  userId: string;
  userName: string;
  displayName?: string | null;
  loginId?: string | null;
  email?: string | null;
  departmentCode?: string | null;
  positionCode?: string | null;
  primaryOrganizationId?: string | null;
  primaryOrganizationCode?: string | null;
  primaryOrganizationName?: string | null;
  primaryOrganizationScope?: string | null;
}

export interface CrmOpportunityOwnerLookupQuery {
  search?: string;
  limit?: number;
}

export interface CrmOpportunityLine {
  id: string;
  category: CrmOpportunityLineCategory;
  label: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
  marginRate?: number;
  truncUnit?: number;
  department?: string;
  memberName?: string;
  grade?: string;
  serviceType?: CrmOpportunityServiceType;
  revenueLinked?: boolean;
  linkedCostLineId?: string;
  revenueUnitPrice?: number;
}

export interface CrmOpportunityUpsertLine {
  id?: string;
  category: CrmOpportunityLineCategory;
  label: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
  marginRate?: number;
  truncUnit?: number;
  department?: string;
  memberName?: string;
  grade?: string;
  serviceType?: CrmOpportunityServiceType;
  revenueLinked?: boolean;
  linkedCostLineId?: string;
  revenueUnitPrice?: number;
}

export interface CrmOpportunityUpsertRequest {
  /** Owning business organization; absent only for preserved legacy records. */
  ownerOrganizationId?: string;
  customerName: string;
  opportunityName: string;
  ownerName: string;
  ownerUserId?: string;
  businessType: string;
  industryLine: string;
  region: 'domestic' | 'overseas' | 'unspecified';
  status: CrmOpportunityStatus;
  priority: CrmOpportunityPriority;
  clientContactName?: string;
  paymentTermCode?: string;
  specialDiscountType?: CrmOpportunityDiscountType;
  specialDiscountValue?: number;
  expectedStartDate?: string;
  expectedEndDate?: string;
  nextAction: string;
  revenueLines: CrmOpportunityUpsertLine[];
  costLines: CrmOpportunityUpsertLine[];
}

export interface CrmOpportunity {
  /** Owning business organization; absent only for preserved legacy records. */
  ownerOrganizationId?: string;
  id: string;
  groupId: string;
  customerName: string;
  opportunityName: string;
  ownerName: string;
  ownerUserId?: string;
  businessType: string;
  industryLine: string;
  region: 'domestic' | 'overseas' | 'unspecified';
  status: CrmOpportunityStatus;
  priority: CrmOpportunityPriority;
  version: number;
  versionCount: number;
  isLatest: boolean;
  confirmed: boolean;
  contractCreated: boolean;
  contractCreatedAt?: string;
  contractCode?: string;
  expectedStartDate: string;
  expectedEndDate: string;
  clientContactName?: string;
  paymentTermCode?: string;
  quoteStatus: CrmQuoteWorkflowStatus;
  quoteIssuedAt?: string;
  quoteValidUntil?: string;
  quoteMemo?: string;
  revenueSubtotal: number;
  specialDiscountType: CrmOpportunityDiscountType;
  specialDiscountValue: number;
  specialDiscountAmount: number;
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

export interface CrmOpportunityVersionSummary {
  /** Display totals before DC/truncation; ledger totals below remain unchanged. */
  sourceTotals?: Pick<CrmOpportunity, 'revenueTotal' | 'costTotal' | 'marginTotal' | 'marginRate'>;
  id: string;
  groupId: string;
  customerName: string;
  opportunityName: string;
  ownerName: string;
  version: number;
  isLatest: boolean;
  confirmed: boolean;
  contractCreated: boolean;
  contractCode?: string;
  ownerUserId?: string;
  status: CrmOpportunityStatus;
  quoteStatus: CrmQuoteWorkflowStatus;
  paymentTermCode?: string;
  expectedStartDate: string;
  expectedEndDate: string;
  revenueSubtotal: number;
  specialDiscountAmount: number;
  revenueTotal: number;
  costTotal: number;
  marginTotal: number;
  marginRate: number;
  updatedAt: string;
}

export interface CrmOpportunityVersionListResponse {
  opportunityId: string;
  groupId: string;
  versions: CrmOpportunityVersionSummary[];
}

export interface CrmOpportunityHistoryEntry {
  historySeq: string;
  eventType: CrmOpportunityHistoryEventType;
  eventAt: string;
  eventBy?: string;
  activity?: string;
  source?: string;
  status: CrmOpportunityStatus;
  confirmed: boolean;
  contractCreated: boolean;
  contractCode?: string;
  version: number;
  quoteStatus: CrmQuoteWorkflowStatus;
  paymentTermCode?: string;
  revenueSubtotal: number;
  specialDiscountAmount: number;
  revenueTotal: number;
  costTotal: number;
  marginTotal: number;
  marginRate: number;
}

export interface CrmOpportunityHistoryListResponse {
  opportunityId: string;
  groupId: string;
  items: CrmOpportunityHistoryEntry[];
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
  activeFilters: Required<Pick<CrmOpportunityListQuery, 'search' | 'status' | 'sort'>>
    & Pick<CrmOpportunityListQuery, 'sourceStatus'>;
}

export interface CrmOpportunityListResponse {
  summary: CrmOpportunitySummary;
  items: CrmOpportunity[];
}

export interface CrmOpportunityDeleteResult {
  deletedOpportunityId: string;
  groupId: string;
  deletedVersion: number;
  nextOpportunityId?: string;
}

export interface CrmOpportunityContractConversionRequest {
  contractStartDate?: string;
  contractEndDate?: string;
  wbsCode?: string;
  nextAction?: string;
}

export interface CrmOpportunityContractConversionResponse {
  opportunity: CrmOpportunity;
  contract: CrmContract;
}
