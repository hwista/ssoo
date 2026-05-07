import type { PermissionResolutionTrace } from '../common/access';
import type { DocumentPermissionGrant, DocumentVisibilityScope } from './document-metadata';

export type DmsDocumentAccessRequestRole = 'read';

export type DmsDocumentAccessRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'revoked';

export type DmsDocumentAccessRequestStatusFilter =
  | 'all'
  | DmsDocumentAccessRequestStatus;

export interface DmsFeatureAccess {
  canReadDocuments: boolean;
  canWriteDocuments: boolean;
  canManageTemplates: boolean;
  canUseAssistant: boolean;
  canUseSearch: boolean;
  canManageSettings: boolean;
  canManageStorage: boolean;
  canUseGit: boolean;
}

export interface DmsAccessSnapshot {
  isAuthenticated: boolean;
  features: DmsFeatureAccess;
  policy: PermissionResolutionTrace;
}

export interface DmsDocumentAccessRequestActor {
  userId: string;
  loginId: string;
  displayName?: string;
}

export interface DmsDocumentAccessRequestState {
  requestId: string;
  status: DmsDocumentAccessRequestStatus;
  requestedAt: string;
  requestMessage?: string;
  requestedExpiresAt?: string;
  respondedAt?: string;
  responseMessage?: string;
}

export interface DmsDocumentAccessRequestSummary
  extends DmsDocumentAccessRequestState {
  documentId: string;
  path: string;
  documentTitle: string;
  requestedRole: DmsDocumentAccessRequestRole;
  requester: DmsDocumentAccessRequestActor;
  responder?: DmsDocumentAccessRequestActor;
  grantId?: string;
  grantExpiresAt?: string;
  canRespond?: boolean;
}

export interface DmsManagedDocumentGrantSummary {
  total: number;
  read: number;
  write: number;
  manage: number;
  expired: number;
}

export interface DmsManagedDocumentRequestSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
  revoked: number;
}

export interface DmsManagedDocumentSummary {
  documentId: string;
  path: string;
  documentTitle: string;
  owner: DmsDocumentAccessRequestActor;
  visibilityScope: DocumentVisibilityScope | 'legacy';
  syncStatusCode: 'synced' | 'repair_needed';
  repairReason?: string;
  updatedAt?: string;
  grants: DocumentPermissionGrant[];
  grantSummary: DmsManagedDocumentGrantSummary;
  requestSummary: DmsManagedDocumentRequestSummary;
}

export interface CreateDmsDocumentAccessRequestPayload {
  path: string;
  requestMessage?: string;
  requestedExpiresAt?: string;
}

export interface DmsDocumentAccessRequestListQuery {
  status?: DmsDocumentAccessRequestStatusFilter;
  path?: string;
}

export interface ApproveDmsDocumentAccessRequestPayload {
  responseMessage?: string;
  grantExpiresAt?: string;
}

export interface RejectDmsDocumentAccessRequestPayload {
  responseMessage?: string;
}

export interface UpdateDocumentVisibilityPayload {
  visibilityScope: DocumentVisibilityScope;
}

export interface TransferDocumentOwnershipPayload {
  newOwnerLoginId: string;
}

export interface TransferDocumentOwnershipResult {
  documentId: string;
  previousOwnerUserId: string;
  newOwnerUserId: string;
  newOwnerLoginId: string;
}

export interface CreateDmsDocumentDirectGrantPayload {
  documentId: string;
  /** grant 대상 사용자 ID (BigInt 직렬화된 문자열) */
  principalUserId: string;
  /** 권한 만료 시각 (ISO 8601) — 미지정 시 무기한 */
  grantExpiresAt?: string;
  /** 부여 사유 또는 메모 */
  memo?: string;
}

export interface DmsDocumentDirectGrantResult {
  grantId: string;
  documentId: string;
  principalUserId: string;
  grantExpiresAt?: string;
}
