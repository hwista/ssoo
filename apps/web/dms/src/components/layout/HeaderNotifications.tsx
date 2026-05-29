'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  FileText,
  Inbox,
  KeyRound,
  Loader2,
  Mail,
  MailOpen,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import type {
  CommonNotificationActionType,
  CommonNotificationItem,
  CommonNotificationJsonValue,
  CommonNotificationStreamEvent,
} from '@ssoo/types/common';
import { accessRequestKeys } from '@/features/access';
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useMarkNotificationUnreadMutation,
  useNotificationEventStream,
  useNotificationUnreadCountQuery,
  useNotificationsQuery,
} from '@/features/notifications';
import { useOpenDocumentTab } from '@/hooks';
import { aiSearchKeys } from '@/hooks/queries/useAiSearch';
import { fileTreeKeys } from '@/hooks/queries/useFileTree';
import { LAYOUT_SIZES } from '@/lib/constants/layout';
import { PopupBackdrop } from '@/components/ui/popup-backdrop';
import {
  DMS_ACCESS_REQUEST_FOCUS_EVENT,
  DMS_DOCUMENT_ACCESS_REFRESH_EVENT,
  DMS_LOCK_TAKEOVER_REQUEST_FOCUS_EVENT,
  DMS_LOCK_TAKEOVER_RESPONSE_NOTICE_EVENT,
  type DmsDocumentAccessRefreshEventDetail,
  type DmsLockTakeoverRequestFocusEventDetail,
  type DmsLockTakeoverResponseNoticeEventDetail,
} from '@/lib/notification-events';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { useGitStore, useSettingsShellStore } from '@/stores';

const NOTIFICATION_PAGE_SIZE = 20;
const NOTIFICATION_PANEL_ID = 'dms-header-notifications-panel';
const NOTIFICATION_PANEL_STYLE: CSSProperties = {
  top: LAYOUT_SIZES.header.height,
  right: LAYOUT_SIZES.rightPanel.inset,
  bottom: LAYOUT_SIZES.rightPanel.inset,
  width: `min(${LAYOUT_SIZES.rightPanel.overlayWidth}px, calc(100vw - ${LAYOUT_SIZES.rightPanel.inset * 2}px))`,
};
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

function NotificationCountBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  return (
    <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ls-red px-1 text-[10px] font-semibold leading-none text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function EmptyNotifications() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 py-8 text-center text-ssoo-primary/70">
      <Bell className="h-8 w-8 text-ssoo-primary/30" />
      <div>
        <p className="text-label-md text-ssoo-primary">확인할 알림이 없습니다.</p>
      </div>
    </div>
  );
}

interface NotificationActionButtonProps {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

function NotificationActionButton({
  children,
  onClick,
  disabled = false,
  variant = 'secondary',
}: NotificationActionButtonProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className={cn(
        'inline-flex h-7 items-center justify-center gap-1 rounded border px-2 text-caption transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' && 'border-ssoo-primary bg-ssoo-primary text-white hover:bg-ssoo-primary-hover',
        variant === 'secondary' && 'border-ssoo-content-border bg-white text-ssoo-primary hover:bg-ssoo-content-bg',
        variant === 'danger' && 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
      )}
    >
      {children}
    </button>
  );
}

interface NotificationIconButtonProps {
  title: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'secondary' | 'primary';
}

function NotificationIconButton({
  title,
  children,
  onClick,
  disabled = false,
  variant = 'secondary',
}: NotificationIconButtonProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border text-ssoo-primary transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary'
          ? 'border-ssoo-primary bg-ssoo-primary text-white hover:bg-ssoo-primary-hover'
          : 'border-ssoo-content-border bg-white hover:bg-ssoo-content-bg',
      )}
    >
      {children}
    </button>
  );
}

function getPayloadValue(
  item: CommonNotificationItem,
  key: string,
): CommonNotificationJsonValue | undefined {
  return item.action?.payload?.[key];
}

function getPayloadString(item: CommonNotificationItem, key: string): string | undefined {
  const value = getPayloadValue(item, key);
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function getNotificationPath(item: CommonNotificationItem): string | undefined {
  return getPayloadString(item, 'path') ?? item.reference?.path;
}

function dispatchDocumentAccessRefresh(item: CommonNotificationItem): void {
  if (
    typeof window === 'undefined'
    || !DOCUMENT_ACCESS_REFRESH_NOTIFICATION_TYPES.has(item.notificationType)
  ) {
    return;
  }

  const path = getNotificationPath(item);
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
  return event.domainEvent?.type === DOCUMENT_ACCESS_CHANGED_DOMAIN_EVENT_TYPE;
}

function getNotificationRequestId(item: CommonNotificationItem): string | undefined {
  return getPayloadString(item, 'requestId') ?? (
    item.reference?.type === 'dms.document-access-request' ? item.reference.id : undefined
  );
}

function isSoftLockTakeoverRequestNotification(item: CommonNotificationItem): boolean {
  return item.notificationType === 'dms.document-soft-lock.takeover-requested';
}

function getSoftLockTakeoverResponseStatus(
  item: CommonNotificationItem,
): DmsLockTakeoverResponseNoticeEventDetail['status'] | null {
  const payloadStatus = getPayloadString(item, 'status');
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
  const path = getNotificationPath(item);
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
          requesterName: getPayloadString(item, 'requesterName'),
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
  const path = getNotificationPath(item);
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

function getCategory(item: CommonNotificationItem): {
  label: string;
  icon: ReactNode;
  tone: 'info' | 'success' | 'warning' | 'error';
} {
  if (item.notificationType.includes('publish')) {
    return {
      label: '동기화',
      icon: <AlertTriangle className="h-4 w-4" />,
      tone: item.severity === 'error' ? 'error' : 'warning',
    };
  }
  if (item.notificationType.includes('soft-lock')) {
    return {
      label: '잠금',
      icon: <KeyRound className="h-4 w-4" />,
      tone: item.severity === 'success' ? 'success' : item.severity === 'error' ? 'error' : 'warning',
    };
  }
  if (item.notificationType.includes('access-request')) {
    const isOwnerSideRequest = item.notificationType.endsWith('created')
      || item.notificationType.endsWith('cancelled');
    return {
      label: isOwnerSideRequest ? '권한' : '내 요청',
      icon: isOwnerSideRequest
        ? <ShieldCheck className="h-4 w-4" />
        : <Inbox className="h-4 w-4" />,
      tone: item.severity === 'success' ? 'success' : item.severity === 'warning' ? 'warning' : 'info',
    };
  }
  if (item.notificationType.includes('grant')) {
    return {
      label: '권한',
      icon: <ShieldCheck className="h-4 w-4" />,
      tone: item.severity === 'warning' ? 'warning' : 'success',
    };
  }
  if (item.notificationType.includes('document-comment')) {
    return {
      label: '댓글',
      icon: <MessageSquare className="h-4 w-4" />,
      tone: 'info',
    };
  }
  if (item.notificationType.includes('ownership')) {
    return {
      label: '소유권',
      icon: <CheckCircle2 className="h-4 w-4" />,
      tone: 'info',
    };
  }

  return {
    label: '알림',
    icon: <Bell className="h-4 w-4" />,
    tone: item.severity === 'error' ? 'error' : item.severity === 'warning' ? 'warning' : 'info',
  };
}

function getPrimaryActionLabel(actionType: CommonNotificationActionType | undefined, label?: string): string {
  if (label?.trim()) {
    return label;
  }

  if (actionType === 'focus-dms-access-request') return '요청 처리';
  if (actionType === 'retry-dms-publish') return '수동 publish';
  if (actionType === 'open-dms-settings-section') return '상태 보기';
  if (actionType === 'open-dms-document') return '문서 열기';
  return '확인';
}

interface NotificationCardProps {
  item: CommonNotificationItem;
  read: boolean;
  isRetryingPublish: boolean;
  isReadStateChanging: boolean;
  onPrimaryAction: (item: CommonNotificationItem) => void;
  onOpenDocument: (item: CommonNotificationItem) => void;
  onMarkRead: (item: CommonNotificationItem) => void;
  onMarkUnread: (item: CommonNotificationItem) => void;
}

function NotificationCard({
  item,
  read,
  isRetryingPublish,
  isReadStateChanging,
  onPrimaryAction,
  onOpenDocument,
  onMarkRead,
  onMarkUnread,
}: NotificationCardProps) {
  const category = getCategory(item);
  const path = getNotificationPath(item);
  const primaryActionType = item.action?.type;
  const showOpenDocument = Boolean(path && primaryActionType !== 'open-dms-document');
  const isPublishRetry = primaryActionType === 'retry-dms-publish';

  return (
    <article
      className={cn(
        'rounded-lg border px-3 py-2 transition-colors',
        read
          ? 'border-ssoo-content-border/70 bg-white/70 text-ssoo-primary/70'
          : 'border-ssoo-primary/15 bg-white text-ssoo-primary shadow-sm',
        'hover:bg-white',
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => onPrimaryAction(item)}
          className="flex min-w-0 flex-1 items-start gap-2 text-left"
        >
          <span
            className={cn(
              'mt-1 h-2 w-2 shrink-0 rounded-full',
              read ? 'border border-ssoo-primary/25 bg-transparent' : 'bg-ssoo-primary',
            )}
            aria-hidden="true"
          />
          <span className={cn(
            'mt-0.5 shrink-0',
            category.tone === 'error' && 'text-red-500',
            category.tone === 'warning' && 'text-amber-600',
            category.tone === 'success' && 'text-emerald-600',
            category.tone === 'info' && 'text-ssoo-primary/60',
          )}
          >
            {category.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="mb-1 inline-flex rounded-full bg-ssoo-content-bg px-1.5 py-0.5 text-[10px] font-medium text-ssoo-primary/70">
              {category.label}
            </span>
            <span className={cn('block truncate text-body-sm', read && 'text-ssoo-primary/70')}>
              {item.title}
            </span>
            {item.message ? (
              <span className={cn('mt-0.5 line-clamp-2 text-caption text-ssoo-primary/60', read && 'text-ssoo-primary/50')}>
                {item.message}
              </span>
            ) : null}
            {path ? (
              <span className="mt-0.5 block truncate text-caption text-ssoo-primary/45">
                {path}
              </span>
            ) : null}
          </span>
        </button>
        <NotificationIconButton
          title={read ? '안 읽음으로 표시' : '읽음 처리'}
          onClick={() => {
            if (read) {
              onMarkUnread(item);
            } else {
              onMarkRead(item);
            }
          }}
          disabled={isReadStateChanging}
          variant={read ? 'secondary' : 'primary'}
        >
          {read ? <Mail className="h-3.5 w-3.5" /> : <MailOpen className="h-3.5 w-3.5" />}
        </NotificationIconButton>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 pl-8">
        <NotificationActionButton
          variant={isPublishRetry ? 'danger' : 'primary'}
          onClick={() => onPrimaryAction(item)}
          disabled={isPublishRetry && isRetryingPublish}
        >
          {isPublishRetry ? (
            <RefreshCw className={cn('h-3 w-3', isRetryingPublish && 'animate-spin')} />
          ) : null}
          {getPrimaryActionLabel(primaryActionType, item.action?.label)}
        </NotificationActionButton>
        {showOpenDocument ? (
          <NotificationActionButton onClick={() => onOpenDocument(item)}>
            <FileText className="h-3 w-3" />
            문서 열기
          </NotificationActionButton>
        ) : null}
      </div>
    </article>
  );
}

interface NotificationGroupProps {
  title: string;
  items: CommonNotificationItem[];
  total: number;
  read: boolean;
  isFetching: boolean;
  isRetryingPublish: boolean;
  isReadStateChanging: boolean;
  headerAction?: ReactNode;
  onShowMore: () => void;
  onPrimaryAction: (item: CommonNotificationItem) => void;
  onOpenDocument: (item: CommonNotificationItem) => void;
  onMarkRead: (item: CommonNotificationItem) => void;
  onMarkUnread: (item: CommonNotificationItem) => void;
}

function NotificationGroup({
  title,
  items,
  total,
  read,
  isFetching,
  isRetryingPublish,
  isReadStateChanging,
  headerAction,
  onShowMore,
  onPrimaryAction,
  onOpenDocument,
  onMarkRead,
  onMarkUnread,
}: NotificationGroupProps) {
  if (items.length === 0 && total === 0) {
    return null;
  }

  const remainingCount = Math.max(total - items.length, 0);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <h3 className="text-caption font-semibold text-ssoo-primary/60">{title}</h3>
        <div className="flex items-center gap-1.5">
          {headerAction}
          <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold leading-none text-ssoo-primary/60">
            {total}
          </span>
        </div>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <NotificationCard
            key={item.id}
            item={item}
            read={read}
            isRetryingPublish={isRetryingPublish}
            isReadStateChanging={isReadStateChanging}
            onPrimaryAction={onPrimaryAction}
            onOpenDocument={onOpenDocument}
            onMarkRead={onMarkRead}
            onMarkUnread={onMarkUnread}
          />
        ))}
      </div>
      {remainingCount > 0 ? (
        <button
          type="button"
          onClick={onShowMore}
          disabled={isFetching}
          className="flex h-8 w-full items-center justify-center rounded border border-ssoo-content-border bg-white text-caption font-medium text-ssoo-primary transition-colors hover:bg-ssoo-content-bg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isFetching ? '불러오는 중' : `더 보기 ${remainingCount}`}
        </button>
      ) : null}
    </section>
  );
}

export function HeaderNotifications() {
  const queryClient = useQueryClient();
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

  useNotificationEventStream('dms', {
    onNotification: handleNotification,
    onDomainEvent: handleDomainEvent,
  });

  const [unreadLimit, setUnreadLimit] = useState(NOTIFICATION_PAGE_SIZE);
  const [readLimit, setReadLimit] = useState(NOTIFICATION_PAGE_SIZE);
  const unreadNotificationsQuery = useNotificationsQuery({
    sourceApp: 'dms',
    page: 1,
    pageSize: unreadLimit,
    unreadOnly: true,
  });
  const readNotificationsQuery = useNotificationsQuery({
    sourceApp: 'dms',
    page: 1,
    pageSize: readLimit,
    readOnly: true,
  });
  const unreadCountQuery = useNotificationUnreadCountQuery();
  const markReadMutation = useMarkNotificationReadMutation();
  const markUnreadMutation = useMarkNotificationUnreadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openSettingsSection = useSettingsShellStore((state) => state.openSection);
  const openDocumentTab = useOpenDocumentTab();
  const { isRetryingPublish, retryPublish } = useGitStore();

  const unreadNotifications = unreadNotificationsQuery.data?.items ?? [];
  const readNotifications = readNotificationsQuery.data?.items ?? [];
  const unreadTotal = unreadNotificationsQuery.data?.total ?? unreadCountQuery.data?.count ?? unreadNotifications.length;
  const readTotal = readNotificationsQuery.data?.total ?? readNotifications.length;
  const unreadCount = unreadCountQuery.data?.count ?? unreadTotal;
  const isFetching = unreadNotificationsQuery.isFetching || readNotificationsQuery.isFetching || unreadCountQuery.isFetching;
  const isReadStateChanging = markReadMutation.isPending || markUnreadMutation.isPending || markAllReadMutation.isPending;
  const hasNotificationData = Boolean(unreadNotificationsQuery.data || readNotificationsQuery.data);
  const hasNotifications = unreadTotal + readTotal > 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const markAsRead = async (item: CommonNotificationItem) => {
    if (item.isRead || markReadMutation.isPending) {
      return;
    }

    try {
      await markReadMutation.mutateAsync(item.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '알림 읽음 처리에 실패했습니다.';
      toast.error(message);
    }
  };

  const markAsUnread = async (item: CommonNotificationItem) => {
    if (!item.isRead || markUnreadMutation.isPending) {
      return;
    }

    try {
      await markUnreadMutation.mutateAsync(item.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '알림 안읽음 처리에 실패했습니다.';
      toast.error(message);
    }
  };

  const markAllUnreadAsRead = async () => {
    if (unreadTotal <= 0 || markAllReadMutation.isPending) {
      return;
    }

    try {
      await markAllReadMutation.mutateAsync();
    } catch (error) {
      const message = error instanceof Error ? error.message : '알림 전체 읽음 처리에 실패했습니다.';
      toast.error(message);
    }
  };

  const openAccessRequest = (requestId?: string) => {
    openSettingsSection('system', 'documentAccess');
    setOpen(false);
    if (!requestId) {
      return;
    }
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(DMS_ACCESS_REQUEST_FOCUS_EVENT, {
        detail: { requestId },
      }));
    }, 120);
  };

  const handleOpenDocument = async (path: string) => {
    setOpen(false);
    await openDocumentTab({
      path,
      title: path.split('/').pop() || path,
    });
  };

  const handleRetryPublish = async (path: string) => {
    const ok = await retryPublish(path);
    if (ok) {
      toast.success('publish 재시도를 요청했습니다.');
    } else {
      toast.error('publish 재시도 요청에 실패했습니다.');
    }
  };

  const handleOpenDocumentFromNotification = async (item: CommonNotificationItem) => {
    await markAsRead(item);
    const path = getNotificationPath(item);
    if (path) {
      await handleOpenDocument(path);
      dispatchSoftLockTakeoverRequestFocus(item);
    }
  };

  const handlePrimaryAction = async (item: CommonNotificationItem) => {
    await markAsRead(item);
    const actionType = item.action?.type;
    const path = getNotificationPath(item);

    if (actionType === 'focus-dms-access-request') {
      openAccessRequest(getNotificationRequestId(item));
      return;
    }

    if (actionType === 'retry-dms-publish') {
      if (path) {
        await handleRetryPublish(path);
      }
      return;
    }

    if (actionType === 'open-dms-settings-section') {
      openAccessRequest(getNotificationRequestId(item));
      return;
    }

    if (actionType === 'open-dms-document' && path) {
      await handleOpenDocument(path);
      dispatchSoftLockTakeoverRequestFocus(item);
      return;
    }

    if (path) {
      await handleOpenDocument(path);
      dispatchSoftLockTakeoverRequestFocus(item);
      return;
    }

    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="relative flex h-control-h w-control-h items-center justify-center rounded-md transition-colors hover:bg-white/10"
        title="알림"
        aria-label={unreadCount > 0 ? `알림 ${unreadCount}개` : '알림'}
        aria-controls={NOTIFICATION_PANEL_ID}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((nextOpen) => !nextOpen)}
      >
        <Bell className="h-5 w-5 text-white" />
        <NotificationCountBadge count={unreadCount} />
      </button>

      {open ? (
        <>
          <PopupBackdrop className="z-[55]" />
          <div
            ref={panelRef}
            id={NOTIFICATION_PANEL_ID}
            role="dialog"
            aria-label="알림"
            style={NOTIFICATION_PANEL_STYLE}
            className={cn(
              'fixed z-[60] flex overflow-hidden rounded-l-lg border border-ssoo-content-border bg-ssoo-content-bg text-ssoo-primary shadow-2xl',
              'flex-col',
            )}
          >
            <div className="flex items-center justify-between gap-3 border-b border-ssoo-content-border bg-white px-4 py-3">
              <p className="text-label-strong text-ssoo-primary">알림</p>
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin text-ssoo-primary/60" /> : null}
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-2">
              {hasNotificationData && !isFetching && !hasNotifications ? <EmptyNotifications /> : null}
              <NotificationGroup
                title="새 알림"
                items={unreadNotifications}
                total={unreadTotal}
                read={false}
                isFetching={unreadNotificationsQuery.isFetching}
                isRetryingPublish={isRetryingPublish}
                isReadStateChanging={isReadStateChanging}
                headerAction={unreadTotal > 0 ? (
                  <NotificationActionButton
                    onClick={() => void markAllUnreadAsRead()}
                    disabled={markAllReadMutation.isPending}
                  >
                    <CheckCheck className="h-3 w-3" />
                    모두 읽음
                  </NotificationActionButton>
                ) : null}
                onShowMore={() => setUnreadLimit((currentLimit) => currentLimit + NOTIFICATION_PAGE_SIZE)}
                onPrimaryAction={(item) => void handlePrimaryAction(item)}
                onOpenDocument={(item) => void handleOpenDocumentFromNotification(item)}
                onMarkRead={(item) => void markAsRead(item)}
                onMarkUnread={(item) => void markAsUnread(item)}
              />
              <NotificationGroup
                title="읽은 알림"
                items={readNotifications}
                total={readTotal}
                read
                isFetching={readNotificationsQuery.isFetching}
                isRetryingPublish={isRetryingPublish}
                isReadStateChanging={isReadStateChanging}
                onShowMore={() => setReadLimit((currentLimit) => currentLimit + NOTIFICATION_PAGE_SIZE)}
                onPrimaryAction={(item) => void handlePrimaryAction(item)}
                onOpenDocument={(item) => void handleOpenDocumentFromNotification(item)}
                onMarkRead={(item) => void markAsRead(item)}
                onMarkUnread={(item) => void markAsUnread(item)}
              />
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
