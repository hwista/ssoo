export type CrmCostPlanPreviewRegion = 'all' | 'domestic' | 'overseas' | 'unspecified';
export type CrmCostPlanAmsReadiness = 'ready' | 'blocked' | 'planned';
export type CrmCostPlanAmsMappingStatus = 'mapped' | 'unmapped' | 'not-required';
export type CrmCostPlanInternalInputMode = 'candidate' | 'manual';
export type CrmCostPlanInternalInputStatus = 'candidate' | 'draft' | 'confirmed';
export type CrmCostPlanInternalSourceItemCode = 'labor' | 'other' | 'dept_adj' | 'svc' | 'dept_common';
export type CrmCostPlanAmsExternalInputStatus = 'candidate' | 'draft' | 'confirmed';
export type CrmCostPlanAccountingPaymentReadiness = 'ready' | 'blocked';
export type CrmCostPlanAccountingPaymentLineSource = 'internal-cost' | 'ams-external-cost';
export type CrmCostPlanAccountingPaymentHandoffStatus = 'snapshot-created' | 'execution-evidence-updated' | 'replaced';
export type CrmCostPlanAccountingPaymentExecutionStepKey =
  | 'accounting-voucher'
  | 'payment-request'
  | 'payment-execution'
  | 'external-system-sync';
export type CrmCostPlanAccountingPaymentExecutionMode = 'demo' | 'external-api';
export type CrmCostPlanPreviewSource =
  | 'opportunity-cost'
  | 'contract-cost'
  | 'contract-billing-actual'
  | 'internal-cost-input'
  | 'ams-vendor-mapping'
  | 'ams-external-cost-input'
  | 'ams-readiness';

export interface CrmCostPlanPreviewQuery {
  ownerOrganizationId?: string;
  year?: number;
  businessType?: string;
  industryLine?: string;
  region?: CrmCostPlanPreviewRegion;
  search?: string;
}

export interface CrmCostPlanPreviewMonth {
  month: number;
  pipelineInternalCostAmount: number;
  pipelineExternalCostAmount: number;
  contractInternalCostAmount: number;
  internalCostPlanInputAmount: number;
  internalCostActualInputAmount: number;
  internalCostGapAmount: number;
  contractExternalPlanAmount: number;
  contractExternalActualAmount: number;
  amsExternalCostPlanInputAmount: number;
  amsExternalCostActualInputAmount: number;
  amsExternalCostGapAmount: number;
  externalCostPlanCandidateAmount: number;
  externalCostGapAmount: number;
}

export interface CrmCostPlanPreviewRow {
  key: string;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: CrmCostPlanPreviewRegion;
  wbsCode?: string;
  pipelineInternalCostAmount: number;
  pipelineExternalCostAmount: number;
  contractInternalCostAmount: number;
  contractExternalPlanAmount: number;
  contractExternalActualAmount: number;
  internalCostCandidateAmount: number;
  internalCostPlanInputAmount: number;
  internalCostActualInputAmount: number;
  internalCostGapAmount: number;
  internalCostInputMode: CrmCostPlanInternalInputMode;
  internalCostInputStatus: CrmCostPlanInternalInputStatus;
  internalCostInputId?: string;
  internalCostConfirmedAt?: string;
  externalCostPlanCandidateAmount: number;
  externalCostGapAmount: number;
  amsExternalCostInputMode: CrmCostPlanInternalInputMode;
  amsExternalCostInputId?: string;
  amsExternalCostInputStatus: CrmCostPlanAmsExternalInputStatus;
  amsExternalCostConfirmedAt?: string;
  amsExternalCostPlanInputAmount: number;
  amsExternalCostActualInputAmount: number;
  amsExternalCostGapAmount: number;
  amsMappingStatus: CrmCostPlanAmsMappingStatus;
  amsMappingId?: string;
  amsVendorName?: string;
  amsVendorContractNo?: string;
  amsReadiness: CrmCostPlanAmsReadiness;
  amsReadyCount: number;
  amsBlockedCount: number;
  blockedReasons: string[];
  months: CrmCostPlanPreviewMonth[];
}

export interface CrmCostPlanPreviewSummary {
  year: number;
  rowCount: number;
  pipelineInternalCostTotal: number;
  pipelineExternalCostTotal: number;
  contractInternalCostTotal: number;
  contractExternalPlanTotal: number;
  contractExternalActualTotal: number;
  internalCostCandidateTotal: number;
  internalCostPlanInputTotal: number;
  internalCostActualInputTotal: number;
  internalCostGapTotal: number;
  internalCostInputRowCount: number;
  internalCostConfirmedRowCount: number;
  externalCostPlanCandidateTotal: number;
  externalCostGapTotal: number;
  amsExternalCostPlanInputTotal: number;
  amsExternalCostActualInputTotal: number;
  amsExternalCostGapTotal: number;
  amsExternalCostInputRowCount: number;
  amsExternalCostConfirmedRowCount: number;
  amsMappedCount: number;
  amsReadyCount: number;
  amsBlockedCount: number;
  activeFilters: Required<Omit<CrmCostPlanPreviewQuery, 'ownerOrganizationId'>> & Pick<CrmCostPlanPreviewQuery, 'ownerOrganizationId'>;
  businessTypeOptions: string[];
  industryLineOptions: string[];
  sourceTypes: CrmCostPlanPreviewSource[];
  boundaryNotice: string;
  unavailableActions: string[];
}

export interface CrmCostPlanPreviewResponse {
  summary: CrmCostPlanPreviewSummary;
  months: CrmCostPlanPreviewMonth[];
  rows: CrmCostPlanPreviewRow[];
  internalCostSourceGrid: CrmCostPlanInternalSourceGrid;
  amsSourceWorkspace: CrmCostPlanAmsSourceWorkspace;
}

export interface CrmCostPlanInternalSourceItem {
  id?: string;
  itemCode: CrmCostPlanInternalSourceItemCode;
  itemName: string;
  monthlyPlanAmounts: number[];
  monthlyActualAmounts: number[];
  planAmountTotal: number;
  actualAmountTotal: number;
  differenceAmountTotal: number;
  updatedAt?: string;
}

export interface CrmCostPlanInternalSourceGrid {
  targetYear: number;
  items: CrmCostPlanInternalSourceItem[];
  boundaryNotice: string;
}

export interface CrmCostPlanInternalSourceItemInput {
  itemCode: CrmCostPlanInternalSourceItemCode;
  monthlyPlanAmounts: number[];
  monthlyActualAmounts: number[];
}

export interface CrmCostPlanInternalSourceGridRequest {
  ownerOrganizationId?: string;
  targetYear: number;
  items: CrmCostPlanInternalSourceItemInput[];
}

export interface CrmCostPlanInternalSourceGridResult {
  grid: CrmCostPlanInternalSourceGrid;
  boundaryNotice: string;
}

export interface CrmCostPlanAmsSourceEligibleWbs {
  wbsCode: string;
  contractId: string;
  contractCode: string;
  customerName: string;
  contractName: string;
  label: string;
}

export interface CrmCostPlanAmsSourceVendorWbs {
  id: string;
  wbsCode: string;
  contractId?: string;
}

export interface CrmCostPlanAmsSourceVendor {
  id: string;
  targetYear: number;
  vendorName: string;
  wbs: CrmCostPlanAmsSourceVendorWbs[];
  updatedAt: string;
}

export interface CrmCostPlanAmsSourceExternalCostRow {
  id?: string;
  vendorId: string;
  vendorName: string;
  wbsCode: string;
  monthlyPlanAmounts: number[];
  monthlyActualAmounts: number[];
  planAmountTotal: number;
  actualAmountTotal: number;
  differenceAmountTotal: number;
  updatedAt?: string;
}

export interface CrmCostPlanAmsSourceWorkspace {
  targetYear: number;
  eligibleWbs: CrmCostPlanAmsSourceEligibleWbs[];
  vendors: CrmCostPlanAmsSourceVendor[];
  externalCostRows: CrmCostPlanAmsSourceExternalCostRow[];
  boundaryNotice: string;
}

export interface CrmCostPlanAmsSourceVendorCreateRequest {
  ownerOrganizationId?: string;
  targetYear: number;
  vendorName: string;
}

export interface CrmCostPlanAmsSourceVendorWbsRequest {
  ownerOrganizationId?: string;
  targetYear: number;
  wbsCodes: string[];
}

export interface CrmCostPlanAmsSourceExternalCostRowInput {
  vendorId: string;
  wbsCode: string;
  monthlyPlanAmounts: number[];
  monthlyActualAmounts: number[];
}

export interface CrmCostPlanAmsSourceExternalCostRequest {
  ownerOrganizationId?: string;
  targetYear: number;
  rows: CrmCostPlanAmsSourceExternalCostRowInput[];
}

export interface CrmCostPlanAmsSourceWorkspaceResult {
  workspace: CrmCostPlanAmsSourceWorkspace;
  boundaryNotice: string;
}

export interface CrmCostPlanInternalMonthlyInput {
  ownerOrganizationId?: string;
  id: string;
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmCostPlanPreviewRegion, 'all'>;
  wbsCode?: string;
  monthlyPlanAmounts: number[];
  monthlyActualAmounts: number[];
  planAmountTotal: number;
  actualAmountTotal: number;
  gapAmountTotal: number;
  status: CrmCostPlanInternalInputStatus;
  confirmed: boolean;
  confirmedAt?: string;
  memo?: string;
  updatedAt: string;
}

export interface CrmCostPlanInternalMonthlyInputRequest {
  ownerOrganizationId?: string;
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmCostPlanPreviewRegion, 'all'>;
  wbsCode?: string;
  monthlyPlanAmounts: number[];
  monthlyActualAmounts: number[];
  memo?: string;
}

export interface CrmCostPlanInternalMonthlyInputResult {
  input: CrmCostPlanInternalMonthlyInput;
  boundaryNotice: string;
}

export interface CrmCostPlanInternalMonthlyWorkflowResult {
  input: CrmCostPlanInternalMonthlyInput;
  boundaryNotice: string;
}

export interface CrmCostPlanAmsVendorWbsMapping {
  ownerOrganizationId?: string;
  id: string;
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmCostPlanPreviewRegion, 'all'>;
  wbsCode: string;
  vendorName: string;
  vendorContractNo?: string;
  memo?: string;
  updatedAt: string;
}

export interface CrmCostPlanAmsVendorWbsMappingRequest {
  ownerOrganizationId?: string;
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmCostPlanPreviewRegion, 'all'>;
  wbsCode: string;
  vendorName: string;
  vendorContractNo?: string;
  memo?: string;
}

export interface CrmCostPlanAmsVendorWbsMappingResult {
  mapping: CrmCostPlanAmsVendorWbsMapping;
  boundaryNotice: string;
}

export interface CrmCostPlanAmsExternalMonthlyInput {
  ownerOrganizationId?: string;
  id: string;
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmCostPlanPreviewRegion, 'all'>;
  wbsCode: string;
  vendorName: string;
  vendorContractNo?: string;
  monthlyPlanAmounts: number[];
  monthlyActualAmounts: number[];
  planAmountTotal: number;
  actualAmountTotal: number;
  gapAmountTotal: number;
  status: CrmCostPlanAmsExternalInputStatus;
  confirmed: boolean;
  confirmedAt?: string;
  memo?: string;
  updatedAt: string;
}

export interface CrmCostPlanAmsExternalMonthlyInputRequest {
  ownerOrganizationId?: string;
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmCostPlanPreviewRegion, 'all'>;
  wbsCode: string;
  vendorName: string;
  vendorContractNo?: string;
  monthlyPlanAmounts: number[];
  monthlyActualAmounts: number[];
  memo?: string;
}

export interface CrmCostPlanAmsExternalMonthlyInputResult {
  input: CrmCostPlanAmsExternalMonthlyInput;
  boundaryNotice: string;
}

export interface CrmCostPlanAmsExternalMonthlyWorkflowResult {
  input: CrmCostPlanAmsExternalMonthlyInput;
  boundaryNotice: string;
}

export interface CrmCostPlanAccountingPaymentLine {
  key: string;
  source: CrmCostPlanAccountingPaymentLineSource;
  sourceId: string;
  targetYear: number;
  businessType: string;
  industryLine: string;
  ownerName: string;
  region: Exclude<CrmCostPlanPreviewRegion, 'all'>;
  wbsCode?: string;
  vendorName?: string;
  vendorContractNo?: string;
  planAmountTotal: number;
  actualAmountTotal: number;
  gapAmountTotal: number;
  settlementAmount: number;
  confirmedAt?: string;
  memo?: string;
}

export interface CrmCostPlanAccountingPaymentExecutionEvidenceStep {
  key: CrmCostPlanAccountingPaymentExecutionStepKey;
  evidencePath: string;
  evidenceLabel?: string;
  note?: string;
  recordedAt?: string;
}

export interface CrmCostPlanAccountingPaymentHandoffSummary {
  ownerOrganizationId?: string;
  id: string;
  status: CrmCostPlanAccountingPaymentHandoffStatus;
  targetYear: number;
  lineCount: number;
  settlementAmountTotal: number;
  savedAt: string;
  savedBy?: string;
  memo?: string;
  executionEvidence: CrmCostPlanAccountingPaymentExecutionEvidenceStep[];
  executionEvidenceUpdatedAt?: string;
}

export interface CrmCostPlanAccountingPaymentPreview {
  targetYear: number;
  readiness: CrmCostPlanAccountingPaymentReadiness;
  blockedReasons: string[];
  lineCount: number;
  internalLineCount: number;
  amsExternalLineCount: number;
  settlementAmountTotal: number;
  lines: CrmCostPlanAccountingPaymentLine[];
  latestHandoff: CrmCostPlanAccountingPaymentHandoffSummary | null;
  boundaryNotice: string;
  unavailableActions: string[];
  nextAction: string;
}

export interface CrmCostPlanAccountingPaymentHandoff extends CrmCostPlanAccountingPaymentHandoffSummary {
  previewSnapshot: Omit<CrmCostPlanAccountingPaymentPreview, 'latestHandoff'>;
  linesSnapshot: CrmCostPlanAccountingPaymentLine[];
  boundaryNotice: string;
  nextAction: string;
}

export interface CrmCostPlanAccountingPaymentHandoffRequest extends CrmCostPlanPreviewQuery {
  memo?: string;
}

export interface CrmCostPlanAccountingPaymentHandoffResult {
  handoff: CrmCostPlanAccountingPaymentHandoff;
  preview: CrmCostPlanAccountingPaymentPreview;
  boundaryNotice: string;
  nextAction: string;
}

export interface CrmCostPlanAccountingPaymentExecutionEvidenceRequest {
  steps: CrmCostPlanAccountingPaymentExecutionEvidenceStep[];
  memo?: string;
}

export interface CrmCostPlanAccountingPaymentExecutionEvidenceResult {
  handoffId: string;
  appliedStepKeys: CrmCostPlanAccountingPaymentExecutionStepKey[];
  recordedAt: string;
  handoff: CrmCostPlanAccountingPaymentHandoff;
  preview: CrmCostPlanAccountingPaymentPreview;
  boundaryNotice: string;
  nextAction: string;
}

export interface CrmCostPlanAccountingPaymentExecutionRequest {
  mode?: CrmCostPlanAccountingPaymentExecutionMode;
  memo?: string;
}

export interface CrmCostPlanAccountingPaymentExecutionArtifact {
  key: CrmCostPlanAccountingPaymentExecutionStepKey;
  label: string;
  evidencePath: string;
  referenceNo: string;
  amount: number;
  executedAt: string;
}

export interface CrmCostPlanAccountingPaymentExecutionResult extends CrmCostPlanAccountingPaymentExecutionEvidenceResult {
  externalExecution: {
    providerMode: CrmCostPlanAccountingPaymentExecutionMode;
    providerName?: string;
    providerRequestId?: string;
    executedAt: string;
    executionId: string;
    settlementAmountTotal: number;
    artifacts: CrmCostPlanAccountingPaymentExecutionArtifact[];
    boundaryNotice: string;
    nextAction: string;
  };
}
