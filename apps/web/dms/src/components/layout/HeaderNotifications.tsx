'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Loader2,
  Mail,
  MailOpen,
} from 'lucide-react';
import type {
  CommonNotificationItem,
  CommonNotificationStreamEvent,
} from '@ssoo/types/common';
import {
  getCommonNotificationPath,
  getCommonNotificationPayloadString,
  getCommonNotificationSourceLabel,
  resolveCommonNotificationHref,
  useCommonNotificationCenter,
  type SsooNotificationAppUrls,
} from '@ssoo/web-auth';
import {
  SsooHeaderNotificationCenter,
  type SsooNotificationPanelCategory,
} from '@ssoo/web-shell';
import { accessRequestKeys } from '@/features/access';
import { useOpenDocumentTab } from '@/hooks';
import { aiSearchKeys } from '@/hooks/queries/useAiSearch';
import { fileTreeKeys } from '@/hooks/queries/useFileTree';
import {
  DMS_DOCUMENT_ACCESS_REFRESH_EVENT,
  DMS_LOCK_TAKEOVER_REQUEST_FOCUS_EVENT,
  DMS_LOCK_TAKEOVER_RESPONSE_NOTICE_EVENT,
  type DmsDocumentAccessRefreshEventDetail,
  type DmsLockTakeoverRequestFocusEventDetail,
  type DmsLockTakeoverResponseNoticeEventDetail,
} from '@/lib/notification-events';
import { toast } from '@/lib/toast';

const NOTIFICATION_PAGE_SIZE = 20;
const NOTIFICATION_PANEL_ID = 'dms-header-notifications-panel';
const NOTIFICATION_TOAST_DURATION_MS = 5000;
const DOCUMENT_ACCESS_REFRESH_NOTIFICATION_TYPES = new Set([
  'dms.document-access-request.created',
  'dms.document-access-request.cancelled',
  'dms.document-access-request.approved',
  'dms.document-access-request.rejected',
  'dms.document-access-grant.created',
  'dms.document-access-grant.updated',
  'dms.document-access-grant.revoked',
]);
const DOCUMENT_ACCESS_CHANGED_DOMAIN_EVENT_TYPE = 'dms.document-access.changed';
const NOTIFICATION_APP_URLS: SsooNotificationAppUrls = {
  admin: process.env.NEXT_PUBLIC_ADMIN_APP_URL,
  crm: process.env.NEXT_PUBLIC_CRM_APP_URL,
  pms: process.env.NEXT_PUBLIC_PMS_APP_URL,
  dms: process.env.NEXT_PUBLIC_DMS_APP_URL,
  sns: process.env.NEXT_PUBLIC_SNS_APP_URL,
};

function showNotificationToast(item: CommonNotificationItem): void {
  const title = item.title.trim() || '새 알림';
  const description = item.message?.trim() || undefined;
  const options = {
    description,
    duration: NOTIFICATION_TOAST_DURATION_MS,
  };

  if (item.severity === 'error') {
    toast.error(title, options);
    return;
  }
  if (item.severity === 'warning') {
    toast.warning(title, options);
    return;
  }
  if (item.severity === 'success') {
    toast.success(title, options);
    return;
  }

  toast.info(title, options);
}

function dispatchDocumentAccessRefresh(item: CommonNotificationItem): void {
  if (
    typeof window === 'undefined'
    || !DOCUMENT_ACCESS_REFRESH_NOTIFICATION_TYPES.has(item.notificationType)
  ) {
    return;
  }

  const path = getCommonNotificationPath(item);
  if (!path) {
    return;
  }

  window.dispatchEvent(new CustomEvent<DmsDocumentAccessRefreshEventDetail>(
    DMS_DOCUMENT_ACCESS_REFRESH_EVENT,
    {
      detail: {
        path,
        notificationType: item.notificationType,
        notificationId: item.id,
      },
    },
  ));
}

function isDocumentAccessChangedDomainEvent(event: CommonNotificationStreamEvent): boolean {
  return event.sourceApp === 'dms'
    && event.domainEvent?.type === DOCUMENT_ACCESS_CHANGED_DOMAIN_EVENT_TYPE;
}

function getNotificationRequestId(item: CommonNotificationItem): string | undefined {
  return getCommonNotificationPayloadString(item, 'requestId') ?? (
    item.reference?.type === 'dms.document-access-request' ? item.reference.id : undefined
  );
}

function isSoftLockTakeoverRequestNotification(item: CommonNotificationItem): boolean {
  return item.notificationType === 'dms.document-soft-lock.takeover-requested';
}

function getSoftLockTakeoverResponseStatus(
  item: CommonNotificationItem,
): DmsLockTakeoverResponseNoticeEventDetail['status'] | null {
  const payloadStatus = getCommonNotificationPayloadString(item, 'status');
  const status = payloadStatus ?? item.notificationType.replace('dms.document-soft-lock.takeover-', '');
  if (status === 'approved' || status === 'rejected' || status === 'expired') {
    return status;
  }
  return null;
}

function isSoftLockTakeoverResponseNotification(item: CommonNotificationItem): boolean {
  return item.notificationType.startsWith('dms.document-soft-lock.takeover-')
    && Boolean(getSoftLockTakeoverResponseStatus(item));
}

function dispatchSoftLockTakeoverRequestFocus(item: CommonNotificationItem): void {
  if (typeof window === 'undefined' || !isSoftLockTakeoverRequestNotification(item)) {
    return;
  }

  const requestId = getNotificationRequestId(item);
  const path = getCommonNotificationPath(item);
  if (!requestId || !path) {
    return;
  }

  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent<DmsLockTakeoverRequestFocusEventDetail>(
      DMS_LOCK_TAKEOVER_REQUEST_FOCUS_EVENT,
      {
        detail: {
          requestId,
          path,
          requesterName: getCommonNotificationPayloadString(item, 'requesterName'),
        },
      },
    ));
  }, 160);
}

function dispatchSoftLockTakeoverResponseNotice(item: CommonNotificationItem): void {
  if (typeof window === 'undefined' || !isSoftLockTakeoverResponseNotification(item)) {
    return;
  }

  const requestId = getNotificationRequestId(item);
  const path = getCommonNotificationPath(item);
  const status = getSoftLockTakeoverResponseStatus(item);
  if (!requestId || !path || !status) {
    return;
  }

  window.dispatchEvent(new CustomEvent<DmsLockTakeoverResponseNoticeEventDetail>(
    DMS_LOCK_TAKEOVER_RESPONSE_NOTICE_EVENT,
    {
      detail: {
        requestId,
        path,
        status,
        message: item.message?.trim() || undefined,
      },
    },
  ));
}

function getCategory(item: CommonNotificationItem): SsooNotificationPanelCategory {
  return {
    label: getCommonNotificationSourceLabel(item.sourceApp),
    iconSlot: <Bell />,
    tone: item.severity === 'error' ? 'error' : item.severity === 'warning' ? 'warning' : 'info',
  };
}

function getPrimaryActionLabel(item: CommonNotificationItem): string {
  return item.sourceApp === 'system' ? '확인' : '열기';
}

export function HeaderNotifications() {
  const queryClient = useQueryClient();
  const openDocumentTab = useOpenDocumentTab();
  const handleNotification = useCallback((item: CommonNotificationItem) => {
    showNotificationToast(item);
    dispatchDocumentAccessRefresh(item);
    dispatchSoftLockTakeoverRequestFocus(item);
    dispatchSoftLockTakeoverResponseNotice(item);
  }, []);
  const handleDomainEvent = useCallback((event: CommonNotificationStreamEvent) => {
    if (!isDocumentAccessChangedDomainEvent(event)) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: aiSearchKeys.results() });
    void queryClient.invalidateQueries({ queryKey: fileTreeKeys.tree() });
    void queryClient.invalidateQueries({ queryKey: accessRequestKeys.all });
    void queryClient.invalidateQueries({ queryKey: accessRequestKeys.managedDocuments });
  }, [queryClient]);
  const notificationCenter = useCommonNotificationCenter({
    pageSize: NOTIFICATION_PAGE_SIZE,
    preferredSourceApp: 'dms',
    onNotification: handleNotification,
    onDomainEvent: handleDomainEvent,
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const {
    markAsRead,
    markAsUnread,
    markAllUnreadAsRead,
    showMoreUnread,
    showMoreRead,
  } = notificationCenter;
  const notificationFilters = notificationCenter.sourceFilters.map((filter) => ({
    key: filter.key,
    label: filter.label,
    badge: filter.unreadCount,
    selected: filter.selected,
    onSelect: () => notificationCenter.setSourceFilter(filter.sourceApp),
  }));

  const handleOpenReference = useCallback(async (item: CommonNotificationItem) => {
    await markAsRead(item);
    if (item.sourceApp === 'system') {
      return;
    }

    const path = getCommonNotificationPath(item) ?? '/';
    if (item.sourceApp !== 'dms') {
      const href = resolveCommonNotificationHref(item, {
        appUrls: NOTIFICATION_APP_URLS,
        path,
      });
      if (href) {
        window.location.assign(href);
      }
      return;
    }

    if (path === '/') {
      const href = resolveCommonNotificationHref(item, {
        appUrls: NOTIFICATION_APP_URLS,
        path,
      });
      if (href) {
        window.location.assign(href);
      }
      return;
    }

    await openDocumentTab({
      path,
      title: path.split('/').pop() || path,
    });
    dispatchSoftLockTakeoverRequestFocus(item);
  }, [markAsRead, openDocumentTab]);

  return (
    <SsooHeaderNotificationCenter
      id={NOTIFICATION_PANEL_ID}
      buttonTitle="알림"
      buttonIconSlot={<Bell />}
      buttonBadge={notificationCenter.unreadCount}
      withBackdrop
      hasLoaded={notificationCenter.hasLoaded}
      isFetching={notificationCenter.isFetching}
      unreadItems={notificationCenter.unreadItems}
      readItems={notificationCenter.readItems}
      unreadTotal={notificationCenter.unreadTotal}
      readTotal={notificationCenter.readTotal}
      filters={notificationFilters}
      unreadIsFetching={notificationCenter.unreadIsFetching}
      readIsFetching={notificationCenter.readIsFetching}
      isReadStateChanging={notificationCenter.isReadStateChanging}
      loadingSlot={<Loader2 />}
      emptyIconSlot={<Bell />}
      emptyDescription="나에게 온 알림이 이곳에 표시됩니다."
      markReadIconSlot={<MailOpen />}
      markUnreadIconSlot={<Mail />}
      markAllUnreadIconSlot={<CheckCheck />}
      getCategory={getCategory}
      getReferenceLabel={() => null}
      getPrimaryActionLabel={getPrimaryActionLabel}
      getPrimaryActionIconSlot={(item) => (item.sourceApp === 'system' ? null : <ExternalLink />)}
      onPrimaryAction={(item) => void handleOpenReference(item)}
      onMarkRead={(item) => void markAsRead(item)}
      onMarkUnread={(item) => void markAsUnread(item)}
      onMarkAllUnreadRead={() => void markAllUnreadAsRead()}
      onShowMoreUnread={showMoreUnread}
      onShowMoreRead={showMoreRead}
    />
  );
}
