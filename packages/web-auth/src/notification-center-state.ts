import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CommonNotificationItem,
  CommonNotificationListResult,
  CommonNotificationMarkAllReadResult,
  CommonNotificationSourceApp,
  CommonNotificationStreamEvent,
  CommonNotificationUnreadCountResult,
} from '@ssoo/types/common';
import {
  createCommonNotificationApi,
  useCommonNotificationEventStream,
  type CommonNotificationApi,
  type CommonNotificationApiResult,
} from './notifications';
import { getCommonNotificationSourceLabel } from './notification-routing';

export interface UseCommonNotificationCenterOptions {
  sourceApp?: CommonNotificationSourceApp;
  preferredSourceApp?: CommonNotificationSourceApp;
  sourceFilterApps?: CommonNotificationSourceApp[];
  pageSize?: number;
  enabled?: boolean;
  api?: CommonNotificationApi;
  eventsPath?: string;
  onRefresh?: (event: CommonNotificationStreamEvent) => void;
  onNotification?: (
    notification: CommonNotificationItem,
    event: CommonNotificationStreamEvent,
  ) => void;
  onDomainEvent?: (event: CommonNotificationStreamEvent) => void;
  onError?: (error: Error) => void;
}

export interface CommonNotificationCenterSourceFilter {
  key: string;
  sourceApp?: CommonNotificationSourceApp;
  label: string;
  unreadCount: number;
  selected: boolean;
}

export interface CommonNotificationCenterState {
  unreadItems: CommonNotificationItem[];
  readItems: CommonNotificationItem[];
  unreadTotal: number;
  readTotal: number;
  unreadCount: number;
  selectedSourceApp?: CommonNotificationSourceApp;
  sourceFilters: CommonNotificationCenterSourceFilter[];
  hasLoaded: boolean;
  isFetching: boolean;
  unreadIsFetching: boolean;
  readIsFetching: boolean;
  isReadStateChanging: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  setSourceFilter: (sourceApp?: CommonNotificationSourceApp) => void;
  showMoreUnread: () => void;
  showMoreRead: () => void;
  markAsRead: (notification: CommonNotificationItem | string) => Promise<CommonNotificationItem | null>;
  markAsUnread: (notification: CommonNotificationItem | string) => Promise<CommonNotificationItem | null>;
  markAllUnreadAsRead: () => Promise<CommonNotificationMarkAllReadResult | null>;
  markByReferencePathAsRead: (path: string) => Promise<CommonNotificationMarkAllReadResult | null>;
}

interface NotificationListState {
  items: CommonNotificationItem[];
  total: number;
  isFetching: boolean;
}

const DEFAULT_NOTIFICATION_PAGE_SIZE = 20;
const ALL_SOURCE_FILTER_KEY = 'all';
const DEFAULT_NOTIFICATION_SOURCE_FILTER_APPS: CommonNotificationSourceApp[] = [
  'admin',
  'crm',
  'pms',
  'dms',
  'sns',
];

function createEmptyListState(): NotificationListState {
  return {
    items: [],
    total: 0,
    isFetching: false,
  };
}

function unwrapNotificationResult<T>(
  result: CommonNotificationApiResult<T>,
  fallbackMessage: string,
): T {
  if (!result.success || result.data === undefined) {
    throw new Error(result.error || result.message || fallbackMessage);
  }

  return result.data;
}

function getNotificationId(notification: CommonNotificationItem | string): string {
  return typeof notification === 'string' ? notification : notification.id;
}

function getUnreadCountKey(sourceApp?: CommonNotificationSourceApp): string {
  return sourceApp ?? ALL_SOURCE_FILTER_KEY;
}

function normalizeSourceFilterApps(
  sourceFilterApps: CommonNotificationSourceApp[] | undefined,
  preferredSourceApp: CommonNotificationSourceApp | undefined,
): CommonNotificationSourceApp[] {
  const configuredApps = sourceFilterApps ?? DEFAULT_NOTIFICATION_SOURCE_FILTER_APPS;
  const orderedApps: CommonNotificationSourceApp[] = [];
  const seenApps = new Set<CommonNotificationSourceApp>();
  const addApp = (app: CommonNotificationSourceApp | undefined) => {
    if (!app || app === 'system' || seenApps.has(app)) {
      return;
    }
    if (!configuredApps.includes(app)) {
      return;
    }
    seenApps.add(app);
    orderedApps.push(app);
  };

  addApp(preferredSourceApp);
  configuredApps.forEach(addApp);
  return orderedApps;
}

export function useCommonNotificationCenter(
  options: UseCommonNotificationCenterOptions = {},
): CommonNotificationCenterState {
  const {
    sourceApp,
    preferredSourceApp,
    sourceFilterApps,
    pageSize = DEFAULT_NOTIFICATION_PAGE_SIZE,
    enabled = true,
    api,
    eventsPath,
    onRefresh,
    onNotification,
    onDomainEvent,
    onError,
  } = options;
  const availableSourceFilterApps = useMemo(
    () => normalizeSourceFilterApps(sourceFilterApps, preferredSourceApp),
    [preferredSourceApp, sourceFilterApps],
  );
  const notificationApi = useMemo(
    () => api ?? createCommonNotificationApi({ defaultSourceApp: sourceApp }),
    [api, sourceApp],
  );
  const requestSequenceRef = useRef(0);
  const lastErrorMessageRef = useRef<string | null>(null);
  const onErrorRef = useRef(onError);
  const onRefreshRef = useRef(onRefresh);
  const [selectedSourceApp, setSelectedSourceApp] = useState<CommonNotificationSourceApp | undefined>(undefined);
  const [unreadLimit, setUnreadLimit] = useState(pageSize);
  const [readLimit, setReadLimit] = useState(pageSize);
  const [unreadState, setUnreadState] = useState<NotificationListState>(() => createEmptyListState());
  const [readState, setReadState] = useState<NotificationListState>(() => createEmptyListState());
  const [sourceUnreadCounts, setSourceUnreadCounts] = useState<Record<string, number>>({});
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isReadStateChanging, setIsReadStateChanging] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const activeSourceApp = sourceApp ?? selectedSourceApp;

  useEffect(() => {
    setUnreadLimit(pageSize);
    setReadLimit(pageSize);
  }, [activeSourceApp, pageSize]);

  useEffect(() => {
    if (!selectedSourceApp) {
      return;
    }
    if (!availableSourceFilterApps.includes(selectedSourceApp)) {
      setSelectedSourceApp(undefined);
    }
  }, [availableSourceFilterApps, selectedSourceApp]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const handleError = useCallback((nextError: Error) => {
    setError(nextError);
    if (lastErrorMessageRef.current !== nextError.message) {
      lastErrorMessageRef.current = nextError.message;
      onErrorRef.current?.(nextError);
    }
  }, []);

  const setSourceFilter = useCallback((nextSourceApp?: CommonNotificationSourceApp) => {
    if (sourceApp) {
      return;
    }
    setSelectedSourceApp(nextSourceApp);
  }, [sourceApp]);

  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }

    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;
    setUnreadState((current) => ({ ...current, isFetching: true }));
    setReadState((current) => ({ ...current, isFetching: true }));

    try {
      const countSources = sourceApp ? [sourceApp] : [undefined, ...availableSourceFilterApps];
      const [unreadResult, readResult, countResults] = await Promise.all([
        notificationApi.list({
          sourceApp: activeSourceApp,
          page: 1,
          pageSize: unreadLimit,
          unreadOnly: true,
        }),
        notificationApi.list({
          sourceApp: activeSourceApp,
          page: 1,
          pageSize: readLimit,
          readOnly: true,
        }),
        Promise.all(countSources.map(async (countSourceApp) => {
          const countData = unwrapNotificationResult<CommonNotificationUnreadCountResult>(
            await notificationApi.unreadCount(countSourceApp),
            '알림 개수를 불러오지 못했습니다.',
          );
          return {
            key: getUnreadCountKey(countSourceApp),
            count: countData.count,
          };
        })),
      ]);

      if (requestSequenceRef.current !== requestId) {
        return;
      }

      const unreadData = unwrapNotificationResult<CommonNotificationListResult>(
        unreadResult,
        '새 알림 목록을 불러오지 못했습니다.',
      );
      const readData = unwrapNotificationResult<CommonNotificationListResult>(
        readResult,
        '읽은 알림 목록을 불러오지 못했습니다.',
      );
      const nextSourceUnreadCounts: Record<string, number> = {};
      countResults.forEach((entry) => {
        nextSourceUnreadCounts[entry.key] = entry.count;
      });

      setUnreadState({
        items: unreadData.items,
        total: unreadData.total,
        isFetching: false,
      });
      setReadState({
        items: readData.items,
        total: readData.total,
        isFetching: false,
      });
      setSourceUnreadCounts(nextSourceUnreadCounts);
      setError(null);
      lastErrorMessageRef.current = null;
      setHasLoaded(true);
    } catch (refreshError) {
      if (requestSequenceRef.current !== requestId) {
        return;
      }

      handleError(refreshError instanceof Error ? refreshError : new Error('알림 목록을 불러오지 못했습니다.'));
      setHasLoaded(true);
      setUnreadState((current) => ({ ...current, isFetching: false }));
      setReadState((current) => ({ ...current, isFetching: false }));
    }
  }, [
    activeSourceApp,
    availableSourceFilterApps,
    enabled,
    handleError,
    notificationApi,
    readLimit,
    sourceApp,
    unreadLimit,
  ]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleStreamRefresh = useCallback((event: CommonNotificationStreamEvent) => {
    void refresh();
    onRefreshRef.current?.(event);
  }, [refresh]);

  useCommonNotificationEventStream(sourceApp, {
    enabled,
    eventsPath,
    onRefresh: handleStreamRefresh,
    onNotification,
    onDomainEvent,
  });

  const withReadStateChange = useCallback(async <T,>(operation: () => Promise<T>): Promise<T | null> => {
    if (isReadStateChanging) {
      return null;
    }

    setIsReadStateChanging(true);
    try {
      const result = await operation();
      await refresh();
      return result;
    } catch (mutationError) {
      handleError(mutationError instanceof Error ? mutationError : new Error('알림 상태를 변경하지 못했습니다.'));
      return null;
    } finally {
      setIsReadStateChanging(false);
    }
  }, [handleError, isReadStateChanging, refresh]);

  const markAsRead = useCallback((notification: CommonNotificationItem | string) => (
    withReadStateChange(async () => unwrapNotificationResult<CommonNotificationItem>(
      await notificationApi.markAsRead(getNotificationId(notification)),
      '알림 읽음 처리에 실패했습니다.',
    ))
  ), [notificationApi, withReadStateChange]);

  const markAsUnread = useCallback((notification: CommonNotificationItem | string) => (
    withReadStateChange(async () => unwrapNotificationResult<CommonNotificationItem>(
      await notificationApi.markAsUnread(getNotificationId(notification)),
      '알림 안읽음 처리에 실패했습니다.',
    ))
  ), [notificationApi, withReadStateChange]);

  const markAllUnreadAsRead = useCallback(() => (
    withReadStateChange(async () => unwrapNotificationResult<CommonNotificationMarkAllReadResult>(
      await notificationApi.markAllAsRead(activeSourceApp),
      '알림 전체 읽음 처리에 실패했습니다.',
    ))
  ), [activeSourceApp, notificationApi, withReadStateChange]);

  const markByReferencePathAsRead = useCallback((path: string) => (
    withReadStateChange(async () => unwrapNotificationResult<CommonNotificationMarkAllReadResult>(
      await notificationApi.markByReferencePathAsRead(path, activeSourceApp),
      '참조 대상 알림 읽음 처리에 실패했습니다.',
    ))
  ), [activeSourceApp, notificationApi, withReadStateChange]);

  const showMoreUnread = useCallback(() => {
    setUnreadLimit((currentLimit) => currentLimit + pageSize);
  }, [pageSize]);

  const showMoreRead = useCallback(() => {
    setReadLimit((currentLimit) => currentLimit + pageSize);
  }, [pageSize]);

  const allUnreadCount = sourceUnreadCounts[getUnreadCountKey(sourceApp)] ?? unreadState.total;
  const sourceFilters = useMemo<CommonNotificationCenterSourceFilter[]>(() => {
    if (sourceApp) {
      return [];
    }

    return [
      {
        key: ALL_SOURCE_FILTER_KEY,
        label: '전체',
        unreadCount: sourceUnreadCounts[ALL_SOURCE_FILTER_KEY] ?? (activeSourceApp ? 0 : unreadState.total),
        selected: !activeSourceApp,
      },
      ...availableSourceFilterApps.map((filterSourceApp) => ({
        key: filterSourceApp,
        sourceApp: filterSourceApp,
        label: getCommonNotificationSourceLabel(filterSourceApp),
        unreadCount: sourceUnreadCounts[getUnreadCountKey(filterSourceApp)] ?? (
          activeSourceApp === filterSourceApp ? unreadState.total : 0
        ),
        selected: activeSourceApp === filterSourceApp,
      })),
    ];
  }, [activeSourceApp, availableSourceFilterApps, sourceApp, sourceUnreadCounts, unreadState.total]);

  return {
    unreadItems: unreadState.items,
    readItems: readState.items,
    unreadTotal: unreadState.total,
    readTotal: readState.total,
    unreadCount: allUnreadCount,
    selectedSourceApp: activeSourceApp,
    sourceFilters,
    hasLoaded,
    isFetching: unreadState.isFetching || readState.isFetching,
    unreadIsFetching: unreadState.isFetching,
    readIsFetching: readState.isFetching,
    isReadStateChanging,
    error,
    refresh,
    setSourceFilter,
    showMoreUnread,
    showMoreRead,
    markAsRead,
    markAsUnread,
    markAllUnreadAsRead,
    markByReferencePathAsRead,
  };
}
