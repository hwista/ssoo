import type {
  CrmContractSummary,
} from './contract.js';
import type {
  CrmOpportunity,
  CrmSourceOpportunityStatus,
  CrmOpportunityStatus,
  CrmOpportunitySummary,
} from './opportunity.js';
import type {
  CrmQuotePreviewSellerInfoStatus,
} from './quote.js';

export type CrmDashboardQueueKey =
  | 'quote'
  | 'contract-conversion'
  | 'pms-handoff'
  | 'dms-document';

export type CrmDashboardQueueState = 'ready' | 'blocked' | 'watch';

export type CrmDashboardNextActionKind = 'opportunity' | 'contract';

export interface CrmDashboardPipelineStage {
  status: CrmOpportunityStatus;
  label: string;
  count: number;
  revenueTotal: number;
  marginTotal: number;
}

export interface CrmDashboardQueue {
  key: CrmDashboardQueueKey;
  label: string;
  count: number;
  readyCount: number;
  blockedCount: number;
  amountTotal: number;
  href: string;
  state: CrmDashboardQueueState;
  description: string;
}

export interface CrmDashboardNextAction {
  id: string;
  kind: CrmDashboardNextActionKind;
  title: string;
  customerName: string;
  ownerName: string;
  statusLabel: string;
  nextAction: string;
  amount: number;
  href: string;
  updatedAt: string;
}

export interface CrmDashboardSourceConfirmedSummary {
  totalGroupCount: number;
  /** One latest confirmed version per group, including groups with a newer draft. */
  confirmedLatestCount: number;
  revenueTotal: number;
  costTotal: number;
  marginTotal: number;
  marginRate: number;
}

export interface CrmDashboardSourceStatusDistribution {
  status: CrmSourceOpportunityStatus;
  count: number;
  percentage: number;
}

export interface CrmDashboardSourceRecentOpportunity {
  id: CrmOpportunity['id'];
  customerName: string;
  opportunityName: string;
  ownerName: string;
  status: CrmSourceOpportunityStatus;
  updatedAt: string;
  href: string;
}

export interface CrmDashboardSourceCompatibility {
  calculationBasis: 'latest-confirmed-version-raw-total';
  calculationNotice: string;
  confirmedSummary: CrmDashboardSourceConfirmedSummary;
  statusDistribution: CrmDashboardSourceStatusDistribution[];
  recentOpportunities: CrmDashboardSourceRecentOpportunity[];
}

export interface CrmDashboardResponse {
  generatedAt: string;
  boundaryNotice: string;
  sellerInfoStatus: CrmQuotePreviewSellerInfoStatus;
  opportunitySummary: CrmOpportunitySummary;
  contractSummary: CrmContractSummary;
  pipeline: CrmDashboardPipelineStage[];
  queues: CrmDashboardQueue[];
  nextActions: CrmDashboardNextAction[];
  sourceCompatibility: CrmDashboardSourceCompatibility;
  unimplementedIntegrations: string[];
}
