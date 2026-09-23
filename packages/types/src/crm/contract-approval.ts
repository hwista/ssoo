/** Actual internal decisions, separate from automatically generated role records. */
export type CrmContractApprovalStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';
export interface CrmContractApproval {
  id: string;
  contractCode: string;
  contractName: string;
  documentTitle: string;
  requesterId: string;
  requesterName: string;
  approverId: string;
  approverName: string;
  status: CrmContractApprovalStatus;
  reason: string | null;
  requestedAt: string;
  decidedAt: string | null;
  currentVersion: boolean;
  canDecide: boolean;
  canWithdraw: boolean;
}
export interface CrmContractApprovalSource {
  title: string;
  content: string;
  versionKey: string;
}
export interface CrmContractApprovalWorkspace {
  source: CrmContractApprovalSource | null;
  sourceMessage: string | null;
  canRequest: boolean;
  pending: CrmContractApproval | null;
  items: CrmContractApproval[];
  nextCursor: string | null;
}
export interface CrmContractApprovalCandidates {
  items: { id: string; name: string; loginId: string }[];
  nextCursor: string | null;
}
export interface CrmContractApprovalInbox {
  items: CrmContractApproval[];
  nextCursor: string | null;
}
export interface CrmContractApprovalRequest {
  approverId: string;
  versionKey: string;
  requestKey: string;
}
export interface CrmContractApprovalDecision {
  action: 'approve' | 'reject' | 'withdraw';
  reason?: string;
}
