export type CrmReportsPreviewRegion = 'all' | 'domestic' | 'overseas' | 'unspecified';
export type CrmReportsBreakdownKind = 'business-type' | 'owner' | 'wbs';
export type CrmReportsAttentionKind = 'opportunity' | 'contract';
export type CrmReportsConfirmationStatus = 'confirmed' | 'reopened';

export interface CrmReportsPreviewQuery {
  ownerOrganizationId?: string;
  year?: number;
  businessType?: string;
  industryLine?: string;
  region?: CrmReportsPreviewRegion;
  search?: string;
}

export interface CrmReportsConfirmRequest extends CrmReportsPreviewQuery {
  memo?: string;
}

export interface CrmReportsMonthlyTrend {
  month: number;
  planRevenueAmount: number;
  planExternalCostAmount: number;
  planMarginAmount: number;
  actualRevenueAmount: number;
  actualExternalCostAmount: number;
  actualMarginAmount: number;
  revenueDelta: number;
  marginDelta: number;
  revenueAchievementRate: number;
}

export interface CrmReportsBreakdown {
  id: string;
  kind: CrmReportsBreakdownKind;
  label: string;
  opportunityCount: number;
  contractCount: number;
  pipelineRevenueTotal: number;
  pipelineMarginTotal: number;
  planRevenueTotal: number;
  planMarginTotal: number;
  actualRevenueTotal: number;
  actualMarginTotal: number;
  revenueDelta: number;
  marginDelta: number;
  revenueAchievementRate: number;
  marginAchievementRate: number;
  href: string;
}

export interface CrmReportsAttentionItem {
  id: string;
  kind: CrmReportsAttentionKind;
  title: string;
  customerName: string;
  ownerName: string;
  statusLabel: string;
  reason: string;
  amount: number;
  href: string;
  updatedAt: string;
}

export interface CrmReportsPreviewSummary {
  year: number;
  opportunityCount: number;
  contractCount: number;
  pipelineRevenueTotal: number;
  pipelineMarginTotal: number;
  planRevenueTotal: number;
  planMarginTotal: number;
  actualRevenueTotal: number;
  actualMarginTotal: number;
  revenueDelta: number;
  marginDelta: number;
  revenueAchievementRate: number;
  marginAchievementRate: number;
  activeFilters: Required<Omit<CrmReportsPreviewQuery, 'ownerOrganizationId'>> & Pick<CrmReportsPreviewQuery, 'ownerOrganizationId'>;
  businessTypeOptions: string[];
  industryLineOptions: string[];
  boundaryNotice: string;
  unavailableActions: string[];
  latestConfirmation: CrmReportsConfirmationSummary | null;
}

export interface CrmReportsPreviewResponse {
  summary: CrmReportsPreviewSummary;
  monthlyTrend: CrmReportsMonthlyTrend[];
  breakdowns: CrmReportsBreakdown[];
  attentionItems: CrmReportsAttentionItem[];
}

export interface CrmReportsConfirmationSummary {
  ownerOrganizationId?: string;
  id: string;
  year: number;
  status: CrmReportsConfirmationStatus;
  query: Required<Omit<CrmReportsPreviewQuery, 'ownerOrganizationId'>> & Pick<CrmReportsPreviewQuery, 'ownerOrganizationId'>;
  opportunityCount: number;
  contractCount: number;
  breakdownCount: number;
  attentionItemCount: number;
  pipelineRevenueTotal: number;
  planRevenueTotal: number;
  actualRevenueTotal: number;
  revenueDelta: number;
  marginDelta: number;
  memo?: string;
  confirmedAt: string;
  reopenedAt?: string;
  updatedAt: string;
}

export interface CrmReportsConfirmation extends CrmReportsConfirmationSummary {
  summarySnapshot: Omit<CrmReportsPreviewSummary, 'latestConfirmation'>;
  monthlyTrendSnapshot: CrmReportsMonthlyTrend[];
  breakdownsSnapshot: CrmReportsBreakdown[];
  attentionItemsSnapshot: CrmReportsAttentionItem[];
}

export interface CrmReportsConfirmationResult {
  confirmation: CrmReportsConfirmation;
  boundaryNotice: string;
}
