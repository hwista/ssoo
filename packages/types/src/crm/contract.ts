import type {
  DmsCrmContractLifecycleGovernance,
} from '../dms/crm-contract-lifecycle.js';
import type { CrmDmsDocumentTemplateOption } from './document-template.js';
import type {
  CrmAdminBoundary,
  CrmIntegrationStatus,
  CrmOpportunityDiscountType,
  CrmOpportunityLineCategory,
  CrmOpportunityServiceType,
} from './opportunity.js';
import type {
  CrmQuotePreviewSellerInfoStatus,
  CrmQuoteSellerCiReferenceStatus,
  CrmQuoteSellerProfile,
} from './quote.js';

export type CrmContractStatus = 'review' | 'active' | 'completed' | 'terminated';
export type CrmContractSort = 'updated-desc' | 'revenue-desc' | 'margin-desc' | 'start-asc' | 'created-desc' | 'customer-asc';
export type CrmBillingSplitTarget = 'revenue' | 'external-cost' | 'both';
export type CrmContractPerformanceRegion = 'all' | 'domestic' | 'overseas' | 'unspecified';

export interface CrmContractListQuery {
  view?: 'source-list';
  search?: string;
  status?: CrmContractStatus | 'all';
  sort?: CrmContractSort;
}

export interface CrmContractPerformanceQuery {
  mode?: 'operations' | 'source-compatible';
  year?: number;
  businessType?: string;
  industryLine?: string;
  region?: CrmContractPerformanceRegion;
  search?: string;
}

export interface CrmContractLine {
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

export interface CrmContractBillingPlanLine {
  id: string;
  billingYm: string;
  revenueAmount: number;
  externalCostAmount: number;
}

export interface CrmContractBillingActualLine {
  id: string;
  billingYm: string;
  revenueAmount: number;
  externalCostAmount: number;
}

export interface CrmContractUpsertLine {
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

export interface CrmContractBillingPlanUpsertLine {
  billingYm: string;
  revenueAmount?: number;
  externalCostAmount?: number;
}

export interface CrmContractBillingActualUpsertLine {
  billingYm: string;
  revenueAmount?: number;
  externalCostAmount?: number;
}

export interface CrmContractUpsertRequest {
  /** Owning business organization; absent only for preserved legacy records. */
  ownerOrganizationId?: string;
  sourceOpportunityId?: string;
  sourceOpportunityCode?: string;
  customerName: string;
  contractName: string;
  ownerName: string;
  clientContactName?: string;
  ownerUserId?: string;
  businessType: string;
  industryLine: string;
  region: 'domestic' | 'overseas' | 'unspecified';
  status?: CrmContractStatus;
  contractStartDate: string;
  contractEndDate: string;
  wbsCode?: string;
  paymentTermCode?: string;
  specialDiscountType?: CrmOpportunityDiscountType;
  specialDiscountValue?: number;
  revenueLines: CrmContractUpsertLine[];
  costLines: CrmContractUpsertLine[];
  billingPlan?: CrmContractBillingPlanUpsertLine[];
  nextAction?: string;
}

export interface CrmContractBillingActualUpsertRequest {
  lines: CrmContractBillingActualUpsertLine[];
}

export interface CrmContract {
  /** Owning business organization; absent only for preserved legacy records. */
  ownerOrganizationId?: string;
  id: string;
  code: string;
  sourceOpportunityId?: string;
  sourceOpportunityCode?: string;
  customerName: string;
  contractName: string;
  ownerName: string;
  clientContactName?: string;
  ownerUserId?: string;
  businessType: string;
  industryLine: string;
  region: 'domestic' | 'overseas' | 'unspecified';
  status: CrmContractStatus;
  confirmed: boolean;
  contractStartDate: string;
  contractEndDate: string;
  wbsCode?: string;
  paymentTermCode?: string;
  revenueSubtotal: number;
  specialDiscountType: CrmOpportunityDiscountType;
  specialDiscountValue: number;
  specialDiscountAmount: number;
  revenueTotal: number;
  costTotal: number;
  externalCostTotal: number;
  marginTotal: number;
  marginRate: number;
  revenueLines: CrmContractLine[];
  costLines: CrmContractLine[];
  billingPlan: CrmContractBillingPlanLine[];
  pmsHandoffStatus: CrmIntegrationStatus;
  dmsLinkStatus: CrmIntegrationStatus;
  adminBoundary: CrmAdminBoundary;
  nextAction: string;
  createdAt?: string;
  updatedAt: string;
}

export type CrmContractPmsHandoffReadiness = 'ready' | 'blocked';

export interface CrmContractPmsHandoffFinancialSnapshot {
  revenueTotal: number;
  costTotal: number;
  externalCostTotal: number;
  marginTotal: number;
  marginRate: number;
  billingPlanCount: number;
  billingRevenueTotal: number;
  billingExternalCostTotal: number;
}

export interface CrmContractPmsHandoffPreview {
  ownerOrganizationId?: string;
  contractId: string;
  contractCode: string;
  sourceOpportunityId?: string;
  sourceOpportunityCode?: string;
  customerName: string;
  contractName: string;
  ownerName: string;
  clientContactName?: string;
  ownerUserId?: string;
  businessType: string;
  industryLine: string;
  region: 'domestic' | 'overseas' | 'unspecified';
  contractStartDate: string;
  contractEndDate: string;
  wbsCode?: string;
  confirmed: boolean;
  readiness: CrmContractPmsHandoffReadiness;
  blockedReasons: string[];
  handoffStatus: CrmIntegrationStatus;
  financials: CrmContractPmsHandoffFinancialSnapshot;
  revenueLines: CrmContractLine[];
  costLines: CrmContractLine[];
  billingPlan: CrmContractBillingPlanLine[];
  boundaryNotice: string;
  nextAction: string;
}

export type CrmContractDmsDocumentReadiness = 'ready' | 'blocked';
export type CrmContractDmsDocumentType = 'contract';
export type CrmContractDmsDocumentVariableSource =
  | 'contract'
  | 'billing-plan'
  | 'seller-profile'
  | 'dms-boundary';
export type CrmContractDmsDocumentAttachmentStatus = 'ready' | 'planned' | 'blocked';
export type CrmContractDmsDocumentHandoffStatus = 'draft-created' | 'execution-evidence-updated' | 'replaced';
export type CrmContractDmsDocumentLifecycleStepKey =
  | 'markdown-draft'
  | 'template-review'
  | 'attachment-confirmation'
  | 'word-export'
  | 'pdf-export'
  | 'approval';
export type CrmContractDmsDocumentExecutionStepKey = Exclude<
  CrmContractDmsDocumentLifecycleStepKey,
  'markdown-draft'
>;
export type CrmContractDmsDocumentLifecycleOwner = 'crm' | 'dms';
export type CrmContractDmsDocumentLifecycleStatus = 'ready' | 'pending' | 'blocked' | 'completed';

export interface CrmContractDmsDocumentVariable {
  key: string;
  label: string;
  value: string;
  required: boolean;
  source: CrmContractDmsDocumentVariableSource;
}

export interface CrmContractDmsDocumentAttachment {
  key: string;
  label: string;
  status: CrmContractDmsDocumentAttachmentStatus;
  evidenceLabel?: string;
  evidencePath?: string;
  referenceStatus?: CrmQuoteSellerCiReferenceStatus;
  referenceCheckedAt?: string;
  referenceReason?: string;
  note: string;
}

export interface CrmContractDmsDocumentLifecycleStep {
  key: CrmContractDmsDocumentLifecycleStepKey;
  label: string;
  owner: CrmContractDmsDocumentLifecycleOwner;
  status: CrmContractDmsDocumentLifecycleStatus;
  evidenceLabel: string;
  evidencePath?: string;
  note: string;
  blockingReasons?: string[];
}

export interface CrmContractDmsDocumentHandoffSummary {
  id: string;
  status: CrmContractDmsDocumentHandoffStatus;
  documentTitle: string;
  templateKey: string;
  draftPath: string;
  savedAt: string;
  savedBy?: string;
  memo?: string;
}

export interface CrmContractDmsDocumentPreview {
  contractId: string;
  contractCode: string;
  sourceOpportunityId?: string;
  sourceOpportunityCode?: string;
  customerName: string;
  contractName: string;
  ownerName: string;
  clientContactName?: string;
  ownerUserId?: string;
  contractStartDate: string;
  contractEndDate: string;
  wbsCode?: string;
  paymentTermCode?: string;
  revenueTotal: number;
  externalCostTotal: number;
  marginTotal: number;
  documentType: CrmContractDmsDocumentType;
  documentTitle: string;
  templateKey: string;
  templateOptions: CrmDmsDocumentTemplateOption[];
  folderHint: string;
  fileNameHint: string;
  draftPathHint: string;
  savedDraftPath?: string;
  readOnly: true;
  confirmed: boolean;
  readiness: CrmContractDmsDocumentReadiness;
  blockedReasons: string[];
  dmsLinkStatus: CrmIntegrationStatus;
  sellerName: string;
  sellerInfoStatus: CrmQuotePreviewSellerInfoStatus;
  sellerProfile?: CrmQuoteSellerProfile;
  variables: CrmContractDmsDocumentVariable[];
  attachments: CrmContractDmsDocumentAttachment[];
  lifecycle: CrmContractDmsDocumentLifecycleStep[];
  latestHandoff: CrmContractDmsDocumentHandoffSummary | null;
  boundaryNotice: string;
  unavailableActions: string[];
  nextAction: string;
}

export interface CrmContractDmsDocumentHandoff extends CrmContractDmsDocumentHandoffSummary {
  contractId: string;
  contractCode: string;
  documentType: CrmContractDmsDocumentType;
  folderHint: string;
  fileNameHint: string;
  documentSnapshot: Omit<CrmContractDmsDocumentPreview, 'latestHandoff'>;
  variablesSnapshot: CrmContractDmsDocumentVariable[];
  attachmentsSnapshot: CrmContractDmsDocumentAttachment[];
  lifecycleSnapshot: CrmContractDmsDocumentLifecycleStep[];
  boundaryNotice: string;
  nextAction: string;
}

export interface CrmContractDmsDocumentDraftRequest {
  templateKey?: string;
  memo?: string;
}

export interface CrmContractDmsDocumentDraft {
  contractId: string;
  contractCode: string;
  documentTitle: string;
  templateKey: string;
  savedPath: string;
  dmsLinkStatus: CrmIntegrationStatus;
  savedAt: string;
  boundaryNotice: string;
  nextAction: string;
  handoff: CrmContractDmsDocumentHandoff;
  preview: CrmContractDmsDocumentPreview;
}

export interface CrmContractDmsDocumentExecutionEvidenceStep {
  key: CrmContractDmsDocumentExecutionStepKey;
  evidencePath: string;
  evidenceLabel?: string;
  note?: string;
}

export interface CrmContractDmsDocumentExecutionEvidenceRequest {
  steps: CrmContractDmsDocumentExecutionEvidenceStep[];
  memo?: string;
}

export interface CrmContractDmsDocumentLifecycleExecutionRequest {
  memo?: string;
}

export interface CrmContractDmsDocumentExecutionEvidenceResult {
  contractId: string;
  contractCode: string;
  templateKey: string;
  appliedStepKeys: CrmContractDmsDocumentExecutionStepKey[];
  recordedAt: string;
  handoff: CrmContractDmsDocumentHandoff;
  preview: CrmContractDmsDocumentPreview;
  boundaryNotice: string;
  nextAction: string;
}

export interface CrmContractDmsDocumentLifecycleExecutionArtifact {
  kind: string;
  label: string;
  path: string;
  storageUri?: string;
  checksum?: string;
  size?: number;
}

export interface CrmContractDmsDocumentLifecycleExecutionResult extends CrmContractDmsDocumentExecutionEvidenceResult {
  dmsExecution: {
    executedAt: string;
    governance: DmsCrmContractLifecycleGovernance;
    artifacts: CrmContractDmsDocumentLifecycleExecutionArtifact[];
    evidenceSteps: CrmContractDmsDocumentExecutionEvidenceStep[];
    boundaryNotice: string;
    nextAction: string;
  };
}

export interface CrmContractSummary {
  totalCount: number;
  filteredCount: number;
  reviewCount: number;
  activeCount: number;
  completedCount: number;
  totalRevenue: number;
  totalCost: number;
  totalExternalCost: number;
  totalMargin: number;
  grossMarginRate: number;
  boundaryNotice: string;
  unimplementedIntegrations: string[];
  activeFilters: Required<Omit<CrmContractListQuery, 'view'>> & Pick<CrmContractListQuery, 'view'>;
}

export interface CrmContractListResponse {
  summary: CrmContractSummary;
  items: CrmContract[];
}

export interface CrmBillingSplitPreviewRequest {
  startDate: string;
  endDate: string;
  totalRevenue: number;
  totalExternalCost: number;
  target?: CrmBillingSplitTarget;
  periodMonths?: number;
  truncUnit?: number;
  includeLastMonth?: boolean;
}

export interface CrmBillingSplitPreviewLine {
  billingYm: string;
  revenueAmount: number;
  externalCostAmount: number;
  isRemainderRow: boolean;
}

export interface CrmBillingSplitPreviewResponse {
  target: CrmBillingSplitTarget;
  periodMonths: number;
  truncUnit: number;
  includeLastMonth: boolean;
  lines: CrmBillingSplitPreviewLine[];
  summary: {
    totalRevenue: number;
    splitRevenueTotal: number;
    revenueDelta: number;
    totalExternalCost: number;
    splitExternalCostTotal: number;
    externalCostDelta: number;
    boundaryNotice: string;
  };
}

export interface CrmContractBillingActualSummary {
  planRevenueTotal: number;
  planExternalCostTotal: number;
  actualRevenueTotal: number;
  actualExternalCostTotal: number;
  revenueDelta: number;
  externalCostDelta: number;
  revenueAchievementRate: number;
  externalCostAchievementRate: number;
  boundaryNotice: string;
}

export interface CrmContractBillingActualResponse {
  contractId: string;
  contractCode: string;
  confirmed: boolean;
  planLines: CrmContractBillingPlanLine[];
  actualLines: CrmContractBillingActualLine[];
  summary: CrmContractBillingActualSummary;
}

export interface CrmContractPerformanceMonth {
  month: number;
  planRevenueAmount: number;
  planExternalCostAmount: number;
  planMarginAmount: number;
  actualRevenueAmount: number;
  actualExternalCostAmount: number;
  actualMarginAmount: number;
  revenueDelta: number;
  externalCostDelta: number;
  marginDelta: number;
}

export interface CrmContractPerformanceRow {
  /** Selected year contains a billing-plan row, including zero amounts. */
  hasBillingPlanInYear?: boolean;
  contractId: string;
  contractCode: string;
  customerName: string;
  contractName: string;
  ownerName: string;
  businessType: string;
  industryLine: string;
  region: 'domestic' | 'overseas' | 'unspecified';
  wbsCode?: string;
  contractStartDate: string;
  contractEndDate: string;
  months: CrmContractPerformanceMonth[];
  total: CrmContractPerformanceMonth;
}

export interface CrmContractPerformanceSummary {
  year: number;
  contractCount: number;
  planRevenueTotal: number;
  planExternalCostTotal: number;
  planMarginTotal: number;
  actualRevenueTotal: number;
  actualExternalCostTotal: number;
  actualMarginTotal: number;
  revenueDelta: number;
  externalCostDelta: number;
  marginDelta: number;
  revenueAchievementRate: number;
  externalCostAchievementRate: number;
  activeFilters: Required<Omit<CrmContractPerformanceQuery, 'mode'>> & Pick<CrmContractPerformanceQuery, 'mode'>;
  businessTypeOptions: string[];
  industryLineOptions: string[];
  boundaryNotice: string;
}

export interface CrmContractPerformanceResponse {
  summary: CrmContractPerformanceSummary;
  items: CrmContractPerformanceRow[];
}
