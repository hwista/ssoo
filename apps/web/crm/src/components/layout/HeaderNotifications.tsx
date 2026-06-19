'use client';

import { useCallback } from 'react';
import type { CommonNotificationItem } from '@ssoo/types/common';
import {
  getCommonNotificationPath,
  getCommonNotificationSourceLabel,
  resolveCommonNotificationHref,
  useCommonNotificationCenter,
  type SsooNotificationAppUrls,
} from '@ssoo/web-auth';
import {
  SsooHeaderNotificationCenter,
  type SsooNotificationPanelCategory,
} from '@ssoo/web-shell';
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Loader2,
  Mail,
  MailOpen,
} from 'lucide-react';
import { useTabStore } from '@/stores/tab.store';

const NOTIFICATION_PAGE_SIZE = 20;
const NOTIFICATION_APP_URLS: SsooNotificationAppUrls = {
  admin: process.env.NEXT_PUBLIC_ADMIN_APP_URL,
  crm: process.env.NEXT_PUBLIC_CRM_APP_URL,
  pms: process.env.NEXT_PUBLIC_PMS_APP_URL,
  dms: process.env.NEXT_PUBLIC_DMS_APP_URL,
  sns: process.env.NEXT_PUBLIC_SNS_APP_URL,
};

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
  const openTab = useTabStore((state) => state.openTab);
  const notificationCenter = useCommonNotificationCenter({
    pageSize: NOTIFICATION_PAGE_SIZE,
    preferredSourceApp: 'crm',
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
    if (item.sourceApp !== 'crm') {
      const href = resolveCommonNotificationHref(item, {
        appUrls: NOTIFICATION_APP_URLS,
        path,
      });
      if (href) {
        window.location.assign(href);
      }
      return;
    }

    openTab({
      id: `notification-${item.id}`,
      title: item.title.trim() || '알림',
      path,
      closable: true,
      activate: true,
    });
  }, [markAsRead, openTab]);

  return (
    <SsooHeaderNotificationCenter
      buttonTitle="알림"
      buttonIconSlot={<Bell />}
      buttonBadge={notificationCenter.unreadCount}
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
      withBackdrop
      onPrimaryAction={(item) => void handleOpenReference(item)}
      onMarkRead={(item) => void markAsRead(item)}
      onMarkUnread={(item) => void markAsUnread(item)}
      onMarkAllUnreadRead={() => void markAllUnreadAsRead()}
      onShowMoreUnread={showMoreUnread}
      onShowMoreRead={showMoreRead}
    />
  );
}
