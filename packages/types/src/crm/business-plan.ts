export type CrmBusinessPlanPreviewRegion = 'all' | 'domestic' | 'overseas' | 'unspecified';
export type CrmBusinessPlanPreviewSource = 'pipeline' | 'contract-plan' | 'contract-actual';
export type CrmBusinessPlanPerformanceSource = 'confirmed-plan' | 'pipeline' | 'contract' | 'confirmed-cost' | 'manual-actual' | 'mixed';
export type CrmBusinessPlanPerformanceMode = 'extended-actual' | 'source-compatible';
export type CrmBusinessPlanStatus = 'draft' | 'confirmed';
export type CrmBusinessPlanMonthlyPlanInputMode = 'distributed' | 'manual';

export interface CrmBusinessPlanPreviewQuery {
  ownerOrganizationId?: string;
  baseYear?: number;
  businessType?: string;
  industryLine?: string;
  region?: CrmBusinessPlanPreviewRegion;
  search?: string;
}

export interface CrmBusinessPlanPreviewYear {
  year: number;
  pipelineAmount: number;
  contractPlanAmount: number;
  contractActualAmount: number;
  planCandidateAmount: number;
  actualGapAmount: number;
  planExternalCostAmount?: number;
  monthlyPlanRevenueAmounts?: number[];
  monthlyPlanExternalCostAmounts?: number[];
}

export interface CrmBusinessPlanPreviewRow {
  key: string;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: CrmBusinessPlanPreviewRegion;
  pipelineAmount: number;
  contractPlanAmount: number;
  contractActualAmount: number;
  planCandidateAmount: number;
  actualGapAmount: number;
  businessName?: string;
  wbsCode?: string;
  years: CrmBusinessPlanPreviewYear[];
}

export interface CrmBusinessPlanPreviewSummary {
  baseYear: number;
  yearCount: number;
  rowCount: number;
  pipelineAmountTotal: number;
  contractPlanAmountTotal: number;
  contractActualAmountTotal: number;
  planCandidateAmountTotal: number;
  actualGapAmountTotal: number;
  activeFilters: Required<Omit<CrmBusinessPlanPreviewQuery, 'ownerOrganizationId'>> & Pick<CrmBusinessPlanPreviewQuery, 'ownerOrganizationId'>;
  businessTypeOptions: string[];
  industryLineOptions: string[];
  sourceTypes: CrmBusinessPlanPreviewSource[];
  boundaryNotice: string;
  unavailableActions: string[];
}

export interface CrmBusinessPlanPreviewResponse {
  summary: CrmBusinessPlanPreviewSummary;
  years: CrmBusinessPlanPreviewYear[];
  rows: CrmBusinessPlanPreviewRow[];
}

export interface CrmBusinessPlanLine {
  id: string;
  lineCode: string;
  rowCode: string;
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmBusinessPlanPreviewRegion, 'all'>;
  businessName: string;
  wbsCode?: string;
  pipelineAmount: number;
  contractPlanAmount: number;
  contractActualAmount: number;
  planCandidateAmount: number;
  planExternalCostAmount: number;
  planMarginAmount: number;
  monthlyPlanRevenueAmounts: number[];
  monthlyPlanExternalCostAmounts: number[];
  monthlyPlanInputMode: CrmBusinessPlanMonthlyPlanInputMode;
  monthlyPlanExternalCostInputMode: CrmBusinessPlanMonthlyPlanInputMode;
  actualGapAmount: number;
}

export interface CrmBusinessPlanRowYear {
  lineId: string;
  targetYear: number;
  revenueAmount: number;
  externalCostAmount: number;
  marginAmount: number;
  monthlyRevenueAmounts: number[];
  monthlyExternalCostAmounts: number[];
  monthlyRevenueInputMode: CrmBusinessPlanMonthlyPlanInputMode;
  monthlyExternalCostInputMode: CrmBusinessPlanMonthlyPlanInputMode;
}

export interface CrmBusinessPlanRow {
  rowCode: string;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmBusinessPlanPreviewRegion, 'all'>;
  businessName: string;
  wbsCode?: string;
  years: CrmBusinessPlanRowYear[];
}

export interface CrmBusinessPlan {
  ownerOrganizationId?: string;
  id: string;
  code: string;
  planName: string;
  baseYear: number;
  version: number;
  status: CrmBusinessPlanStatus;
  confirmed: boolean;
  confirmedAt?: string;
  filters: Required<Omit<CrmBusinessPlanPreviewQuery, 'ownerOrganizationId'>> & Pick<CrmBusinessPlanPreviewQuery, 'ownerOrganizationId'>;
  pipelineAmountTotal: number;
  contractPlanAmountTotal: number;
  contractActualAmountTotal: number;
  planCandidateAmountTotal: number;
  planExternalCostAmountTotal: number;
  planMarginAmountTotal: number;
  actualGapAmountTotal: number;
  rowCount: number;
  lines: CrmBusinessPlanLine[];
  rows: CrmBusinessPlanRow[];
  memo?: string;
  updatedAt: string;
}

export interface CrmBusinessPlanListQuery {
  ownerOrganizationId?: string;
  baseYear?: number;
  status?: CrmBusinessPlanStatus | 'all';
  search?: string;
}

export interface CrmBusinessPlanListSummary {
  baseYear?: number;
  rowCount: number;
  draftCount: number;
  confirmedCount: number;
  latestVersion?: number;
  confirmedPlanId?: string;
  activeFilters: Required<Omit<CrmBusinessPlanListQuery, 'ownerOrganizationId'>> & Pick<CrmBusinessPlanListQuery, 'ownerOrganizationId'>;
  boundaryNotice: string;
  unavailableActions: string[];
}

export interface CrmBusinessPlanListResponse {
  summary: CrmBusinessPlanListSummary;
  items: CrmBusinessPlan[];
}

export interface CrmBusinessPlanSnapshotRequest extends CrmBusinessPlanPreviewQuery {
  empty?: boolean;
  planName?: string;
  memo?: string;
}

export interface CrmBusinessPlanCarryForwardRequest extends CrmBusinessPlanSnapshotRequest {
  sourceBaseYear?: number;
}

export interface CrmBusinessPlanMonthlyPlanInputRequest {
  monthlyRevenueAmounts: number[];
  monthlyExternalCostAmounts?: number[];
  memo?: string;
}

export interface CrmBusinessPlanMonthlyPlanInputResult {
  plan: CrmBusinessPlan;
  line: CrmBusinessPlanLine;
  boundaryNotice: string;
}

export interface CrmBusinessPlanRowUpsertRequest {
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmBusinessPlanPreviewRegion, 'all'>;
  businessName: string;
  wbsCode?: string;
  monthlyRevenueAmounts: number[];
  monthlyExternalCostAmounts: number[];
  nextYearRevenueAmount: number;
  nextYearExternalCostAmount: number;
  followingYearRevenueAmount: number;
  followingYearExternalCostAmount: number;
  memo?: string;
}

export interface CrmBusinessPlanRowWbsUpdateRequest {
  wbsCode?: string;
}

export interface CrmBusinessPlanRowMutationResult {
  plan: CrmBusinessPlan;
  rowCode: string;
}

export interface CrmBusinessPlanDeleteResult {
  deletedPlanId: string;
  deletedPlanCode: string;
  baseYear: number;
  previousPlanId?: string;
  previousPlanCode?: string;
}

export interface CrmBusinessPlanPerformanceQuery {
  ownerOrganizationId?: string;
  year?: number;
  mode?: CrmBusinessPlanPerformanceMode;
  businessType?: string;
  industryLine?: string;
  region?: CrmBusinessPlanPreviewRegion;
  search?: string;
}

export interface CrmBusinessPlanPerformanceMonth {
  month: number;
  planRevenueAmount: number;
  planCostAmount: number;
  planMarginAmount: number;
  actualRevenueAmount: number;
  actualCostAmount: number;
  actualMarginAmount: number;
  revenueGapAmount: number;
  costGapAmount: number;
  marginGapAmount: number;
}

export interface CrmBusinessPlanPerformanceRow {
  key: string;
  label: string;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmBusinessPlanPreviewRegion, 'all'>;
  source: CrmBusinessPlanPerformanceSource;
  wbsCode?: string;
  months: CrmBusinessPlanPerformanceMonth[];
  total: CrmBusinessPlanPerformanceMonth;
}

export interface CrmBusinessPlanPerformanceSummary {
  year: number;
  mode: CrmBusinessPlanPerformanceMode;
  rowCount: number;
  planRevenueTotal: number;
  planCostTotal: number;
  planMarginTotal: number;
  actualRevenueTotal: number;
  actualCostTotal: number;
  actualMarginTotal: number;
  revenueGapTotal: number;
  costGapTotal: number;
  marginGapTotal: number;
  activeFilters: Required<Omit<CrmBusinessPlanPerformanceQuery, 'ownerOrganizationId'>> & Pick<CrmBusinessPlanPerformanceQuery, 'ownerOrganizationId'>;
  businessTypeOptions: string[];
  industryLineOptions: string[];
  planBasisLabel: string;
  actualBasisLabel: string;
  costBasisLabel: string;
  confirmedCostInputCount: number;
  confirmedInternalCostInputCount: number;
  confirmedAmsExternalCostInputCount: number;
  directActualInputCount: number;
  directActualRevenueTotal: number;
  directActualCostTotal: number;
  amsExternalCostAdjustedWbsCount: number;
  amsExternalCostAdjustedPlanAmountTotal: number;
  amsExternalCostAdjustedActualAmountTotal: number;
  confirmedPlanAvailable: boolean;
  confirmedPlanId?: string;
  confirmedPlanCode?: string;
  confirmedPlanName?: string;
  confirmedPlanVersion?: number;
  boundaryNotice: string;
  unavailableActions: string[];
}

export interface CrmBusinessPlanPerformanceResponse {
  summary: CrmBusinessPlanPerformanceSummary;
  months: CrmBusinessPlanPerformanceMonth[];
  rows: CrmBusinessPlanPerformanceRow[];
}

export interface CrmBusinessPlanPerformanceActualInput {
  ownerOrganizationId?: string;
  id: string;
  year: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmBusinessPlanPreviewRegion, 'all'>;
  wbsCode?: string;
  monthlyRevenueAmounts: number[];
  monthlyCostAmounts: number[];
  revenueAmountTotal: number;
  costAmountTotal: number;
  memo?: string;
  updatedAt: string;
}

export interface CrmBusinessPlanPerformanceActualInputRequest {
  ownerOrganizationId?: string;
  year: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmBusinessPlanPreviewRegion, 'all'>;
  wbsCode?: string;
  monthlyRevenueAmounts: number[];
  monthlyCostAmounts: number[];
  memo?: string;
}

export interface CrmBusinessPlanPerformanceActualInputResult {
  input: CrmBusinessPlanPerformanceActualInput;
  boundaryNotice: string;
}
