import type {
  ApproveDmsDocumentAccessRequestPayload,
  CreateDmsDocumentAccessRequestPayload,
  DmsAccessSnapshot,
  DmsDocumentAccessRequestListQuery,
  DmsDocumentAccessRequestSummary,
  DmsManagedDocumentSummary,
  RejectDmsDocumentAccessRequestPayload,
} from '@ssoo/types/dms';
import { get, post } from './core';

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
};
