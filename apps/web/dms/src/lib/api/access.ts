import type {
  ApproveDmsDocumentAccessRequestPayload,
  CreateDmsDocumentAccessRequestPayload,
  CreateDmsDocumentDirectGrantPayload,
  DmsAccessSnapshot,
  DmsDocumentAccessRequestListQuery,
  DmsDocumentAccessRequestSummary,
  DmsDocumentDirectGrantResult,
  DmsManagedDocumentSummary,
  RejectDmsDocumentAccessRequestPayload,
  TransferDocumentOwnershipPayload,
  TransferDocumentOwnershipResult,
  UpdateDmsDocumentGrantRolePayload,
  UpdateDmsDocumentGrantRoleResult,
  UpdateDocumentVisibilityPayload,
} from '@ssoo/types/dms';
import { del, get, patch, post } from './core';

function buildQueryString(query?: DmsDocumentAccessRequestListQuery) {
  if (!query) {
    return '';
  }

  const params = new URLSearchParams();
  if (query.status && query.status !== 'all') {
    params.set('status', query.status);
  }
  if (query.path?.trim()) {
    params.set('path', query.path.trim());
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

export const accessApi = {
  me: () => get<DmsAccessSnapshot>('/api/access'),
  createReadRequest: (payload: CreateDmsDocumentAccessRequestPayload) => (
    post<DmsDocumentAccessRequestSummary>('/api/access/requests', payload)
  ),
  listMyRequests: (query?: DmsDocumentAccessRequestListQuery) => (
    get<DmsDocumentAccessRequestSummary[]>(`/api/access/requests/me${buildQueryString(query)}`)
  ),
  listInboxRequests: (query?: DmsDocumentAccessRequestListQuery) => (
    get<DmsDocumentAccessRequestSummary[]>(`/api/access/requests/inbox${buildQueryString(query)}`)
  ),
  listManageableDocuments: () => (
    get<DmsManagedDocumentSummary[]>('/api/access/documents/manageable')
  ),
  approveRequest: (
    accessRequestId: string,
    payload: ApproveDmsDocumentAccessRequestPayload,
  ) => (
    post<DmsDocumentAccessRequestSummary>(
      `/api/access/requests/${encodeURIComponent(accessRequestId)}/approve`,
      payload,
    )
  ),
  rejectRequest: (
    accessRequestId: string,
    payload: RejectDmsDocumentAccessRequestPayload,
  ) => (
    post<DmsDocumentAccessRequestSummary>(
      `/api/access/requests/${encodeURIComponent(accessRequestId)}/reject`,
      payload,
    )
  ),
  cancelRequest: (
    accessRequestId: string,
  ) => (
    post<DmsDocumentAccessRequestSummary>(
      `/api/access/requests/${encodeURIComponent(accessRequestId)}/cancel`,
      {},
    )
  ),
  updateDocumentVisibility: (
    documentId: string,
    payload: UpdateDocumentVisibilityPayload,
  ) => (
    patch<{ documentId: string; visibilityScope: string }>(
      `/api/access/documents/${encodeURIComponent(documentId)}/visibility`,
      payload,
    )
  ),
  transferOwnership: (
    documentId: string,
    payload: TransferDocumentOwnershipPayload,
  ) => (
    patch<TransferDocumentOwnershipResult>(
      `/api/access/documents/${encodeURIComponent(documentId)}/owner`,
      payload,
    )
  ),
  revokeGrant: (
    documentId: string,
    grantId: string,
  ) => (
    del<{ grantId: string; documentId: string }>(
      `/api/access/documents/${encodeURIComponent(documentId)}/grants/${encodeURIComponent(grantId)}`,
    )
  ),
  updateGrantRole: (
    documentId: string,
    grantId: string,
    payload: UpdateDmsDocumentGrantRolePayload,
  ) => (
    patch<UpdateDmsDocumentGrantRoleResult>(
      `/api/access/documents/${encodeURIComponent(documentId)}/grants/${encodeURIComponent(grantId)}`,
      payload,
    )
  ),
  createDirectGrant: (
    payload: CreateDmsDocumentDirectGrantPayload,
  ) => (
    post<DmsDocumentDirectGrantResult>('/api/access/grants', payload)
  ),
};
