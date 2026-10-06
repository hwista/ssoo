import type { CrmDmsDocumentTemplateOption } from './document-template.js';

export type CrmOpportunityContractDocumentVariableKey =
  | '공급자_회사명'
  | '공급자_대표자'
  | '공급자_사업자번호'
  | '공급자_주소'
  | '공급자_전화'
  | '고객사명'
  | '건명'
  | '계약금액'
  | '계약금액_한글'
  | '외부원가'
  | '순이익'
  | '계약시작일'
  | '계약종료일'
  | '계약기간'
  | '사업구분'
  | '담당자명'
  | '담당자부서'
  | '담당자연락처'
  | '담당자이메일'
  | '수금조건'
  | '작성일'
  | '계약년도';

export type CrmOpportunityContractDocumentVariableSource =
  | 'opportunity'
  | 'seller-profile'
  | 'owner-profile'
  | 'system-date';

export interface CrmOpportunityContractDocumentVariable {
  key: CrmOpportunityContractDocumentVariableKey;
  label: string;
  value: string;
  required: boolean;
  source: CrmOpportunityContractDocumentVariableSource;
}

export type CrmOpportunityContractDocumentLifecycleStepKey =
  | 'markdown-draft'
  | 'template-review'
  | 'word-export';

export interface CrmOpportunityContractDocumentLifecycleStep {
  key: CrmOpportunityContractDocumentLifecycleStepKey;
  label: string;
  owner: 'crm' | 'dms';
  status: 'ready' | 'pending' | 'blocked' | 'completed';
  evidenceLabel: string;
  evidencePath?: string;
  note: string;
  blockingReasons?: string[];
}

export interface CrmOpportunityContractDocumentArtifact {
  kind: 'word-export';
  label: string;
  path: string;
  storageUri: string;
  checksum?: string;
  size?: number;
}

export interface CrmOpportunityContractDocumentHandoffSummary {
  id: string;
  status: 'draft-created' | 'execution-completed' | 'replaced';
  templateKey: string;
  draftPath: string;
  savedAt: string;
  savedBy?: string;
  memo?: string;
  artifact?: CrmOpportunityContractDocumentArtifact;
}

export interface CrmOpportunityContractDocumentPreview {
  opportunityId: string;
  opportunityCode: string;
  opportunityVersion: number;
  customerName: string;
  opportunityName: string;
  confirmed: boolean;
  latestVersion: boolean;
  documentTitle: string;
  templateKey: string;
  templateOptions: CrmDmsDocumentTemplateOption[];
  folderHint: string;
  fileNameHint: string;
  draftPathHint: string;
  readiness: 'ready' | 'blocked';
  blockedReasons: string[];
  variables: CrmOpportunityContractDocumentVariable[];
  lifecycle: CrmOpportunityContractDocumentLifecycleStep[];
  latestHandoff: CrmOpportunityContractDocumentHandoffSummary | null;
  boundaryNotice: string;
  nextAction: string;
}

export interface CrmOpportunityContractDocumentDraftRequest {
  templateKey?: string;
  memo?: string;
}

export interface CrmOpportunityContractDocumentDraftResult {
  preview: CrmOpportunityContractDocumentPreview;
  handoff: CrmOpportunityContractDocumentHandoffSummary;
}

export interface CrmOpportunityContractDocumentLifecycleExecutionRequest {
  memo?: string;
}

export interface CrmOpportunityContractDocumentLifecycleExecutionResult {
  preview: CrmOpportunityContractDocumentPreview;
  handoff: CrmOpportunityContractDocumentHandoffSummary;
  artifact: CrmOpportunityContractDocumentArtifact;
  boundaryNotice: string;
  nextAction: string;
}
