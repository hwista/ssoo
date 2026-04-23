import type { PermissionResolutionTrace } from '../common/access';
import type { DocumentPermissionGrant, DocumentVisibilityScope } from './document-metadata';

export type DmsDocumentAccessRequestRole = 'read';

export type DmsDocumentAccessRequestStatus = 'pending' | 'approved' | 'rejected';

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
