import type {
  DocumentCollaborationSnapshotClient,
  SoftLockTakeoverRequestClient,
  SoftLockTakeoverResponseClient,
} from '@/lib/api/collaborationApi';

export const DMS_ACCESS_REQUEST_FOCUS_EVENT = 'dms:access-request-focus';
export const DMS_DOCUMENT_ACCESS_REFRESH_EVENT = 'dms:document-access-refresh';
export const DMS_DOCUMENT_COMMENT_CHANGED_DOMAIN_EVENT_TYPE = 'dms.document-comment.changed';
export const DMS_COLLABORATION_SUBSCRIBE_DOCUMENT_EVENT = 'dms:collaboration-subscribe-document';
export const DMS_COLLABORATION_UNSUBSCRIBE_DOCUMENT_EVENT = 'dms:collaboration-unsubscribe-document';
export const DMS_COLLABORATION_CHANGED_EVENT = 'dms:collaboration-changed';
export const DMS_LOCK_TAKEOVER_REQUESTED_EVENT = 'dms:lock-takeover-requested';
export const DMS_LOCK_TAKEOVER_RESPONDED_EVENT = 'dms:lock-takeover-responded';
export const DMS_LOCK_TAKEOVER_REQUEST_FOCUS_EVENT = 'dms:lock-takeover-request-focus';
export const DMS_LOCK_TAKEOVER_RESPONSE_NOTICE_EVENT = 'dms:lock-takeover-response-notice';

export interface DmsDocumentAccessRefreshEventDetail {
  path: string;
  notificationType: string;
  notificationId?: string;
}

export interface DmsDocumentCommentChangedDomainPayload {
  path: string;
  action?: string;
  documentId?: string;
  commentId?: string;
  actorUserId?: string;
  actorUserName?: string;
}

export interface DmsCollaborationChangedEventDetail {
  path: string;
  reason: 'join' | 'mode' | 'leave' | 'lock' | 'takeover' | 'publish' | 'refresh';
  snapshot: DocumentCollaborationSnapshotClient;
}
export interface DmsCollaborationDocumentSubscriptionEventDetail {
  path: string;
}

export type DmsLockTakeoverRequestedEventDetail = SoftLockTakeoverRequestClient;
export type DmsLockTakeoverRespondedEventDetail = SoftLockTakeoverResponseClient;
export interface DmsLockTakeoverResponseNoticeEventDetail {
  requestId: string;
  path: string;
  status: SoftLockTakeoverResponseClient['status'];
  message?: string;
}
export interface DmsLockTakeoverRequestFocusEventDetail {
  requestId: string;
  path: string;
  requesterName?: string;
}

export function isDmsDocumentAccessRefreshEventDetail(
  value: unknown,
): value is DmsDocumentAccessRefreshEventDetail {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const detail = value as Partial<DmsDocumentAccessRefreshEventDetail>;
  return typeof detail.path === 'string' && typeof detail.notificationType === 'string';
}

export function isDmsDocumentCommentChangedDomainPayload(
  value: unknown,
): value is DmsDocumentCommentChangedDomainPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Partial<DmsDocumentCommentChangedDomainPayload>;
  return typeof payload.path === 'string';
}

export function isDmsCollaborationChangedEventDetail(
  value: unknown,
): value is DmsCollaborationChangedEventDetail {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const detail = value as Partial<DmsCollaborationChangedEventDetail>;
  return typeof detail.path === 'string' && Boolean(detail.snapshot);
}

export function isDmsCollaborationDocumentSubscriptionEventDetail(
  value: unknown,
): value is DmsCollaborationDocumentSubscriptionEventDetail {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const detail = value as Partial<DmsCollaborationDocumentSubscriptionEventDetail>;
  return typeof detail.path === 'string';
}

export function isDmsLockTakeoverRequestedEventDetail(
  value: unknown,
): value is DmsLockTakeoverRequestedEventDetail {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const detail = value as Partial<DmsLockTakeoverRequestedEventDetail>;
  return typeof detail.requestId === 'string' && typeof detail.path === 'string' && Boolean(detail.requester);
}

export function isDmsLockTakeoverRespondedEventDetail(
  value: unknown,
): value is DmsLockTakeoverRespondedEventDetail {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const detail = value as Partial<DmsLockTakeoverRespondedEventDetail>;
  return typeof detail.requestId === 'string' && typeof detail.path === 'string' && typeof detail.status === 'string';
}

export function isDmsLockTakeoverRequestFocusEventDetail(
  value: unknown,
): value is DmsLockTakeoverRequestFocusEventDetail {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const detail = value as Partial<DmsLockTakeoverRequestFocusEventDetail>;
  return typeof detail.requestId === 'string' && typeof detail.path === 'string';
}

export function isDmsLockTakeoverResponseNoticeEventDetail(
  value: unknown,
): value is DmsLockTakeoverResponseNoticeEventDetail {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const detail = value as Partial<DmsLockTakeoverResponseNoticeEventDetail>;
  return (
    typeof detail.requestId === 'string'
    && typeof detail.path === 'string'
    && (
      detail.status === 'approved'
      || detail.status === 'rejected'
      || detail.status === 'expired'
    )
  );
}
