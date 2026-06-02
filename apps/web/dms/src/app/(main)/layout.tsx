'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthLoadingScreen, useProtectedAppBootstrap } from '@ssoo/web-auth';
import type { CommonNotificationStreamEvent } from '@ssoo/types/common';
import {
  useMarkDocumentNotificationsReadMutation,
  useNotificationEventStream,
} from '@/features/notifications';
import { useLayoutViewportSync } from '@/hooks';
import { useDmsSocket, type DmsFileChangedEvent } from '@/hooks/useDmsSocket';
import { LOGIN_PATH } from '@/lib/constants/routes';
import { commentsApi } from '@/lib/api/comments';
import { toast } from '@/lib/toast';
import {
  DMS_DOCUMENT_COMMENT_CHANGED_DOMAIN_EVENT_TYPE,
  DMS_DOCUMENT_ACCESS_REFRESH_EVENT,
  isDmsDocumentCommentChangedDomainPayload,
  isDmsDocumentAccessRefreshEventDetail,
  type DmsDocumentAccessRefreshEventDetail,
} from '@/lib/notification-events';
import { normalizeDocumentPath } from '@/lib/utils/linkUtils';
import {
  useAccessStore,
  useAuthStore,
  useFileStore,
  useTabStore,
  useActiveEditorFilePath,
  useOpenEditorFilePaths,
  useEditorMultiStore,
  useGitStore,
} from '@/stores';

const FORCE_ACCESS_RELOAD_NOTIFICATION_TYPES = new Set([
  'dms.document-access-grant.updated',
  'dms.document-access-grant.revoked',
]);

const RELOAD_OPEN_DOCUMENT_NOTIFICATION_TYPES = new Set([
  'dms.document-access-request.approved',
  'dms.document-access-grant.created',
  'dms.document-access-grant.updated',
  'dms.document-access-grant.revoked',
]);

function hasOpenDocumentPath(normalizedPath: string): boolean {
  if (!normalizedPath) {
    return false;
  }

  return Object.values(useEditorMultiStore.getState().editors).some((editorState) => (
    editorState.contentType === 'document'
    && normalizeDocumentPath(editorState.currentFilePath ?? '') === normalizedPath
  ));
}

function getChangedDocumentPaths(event: DmsFileChangedEvent): string[] {
  const paths = new Set<string>();
  for (const path of [event.path, ...(event.paths ?? [])]) {
    const normalizedPath = normalizeDocumentPath(path ?? '');
    if (normalizedPath) {
      paths.add(normalizedPath);
    }
  }
  return Array.from(paths);
}

/**
 * (main) 그룹 레이아웃
 * - 루트 셸 초기화
 * - 파일 트리 초기화
 *
 * Note: deviceType 자동 리사이즈는 layout.store.ts에서 처리 (PMS 패턴)
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUserId = useAuthStore((state) => state.user?.userId ?? null);
  const authIsLoading = useAuthStore((state) => state.isLoading);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const accessHasLoaded = useAccessStore((state) => state.hasLoaded);
  const accessIsLoading = useAccessStore((state) => state.isLoading);
  const hydrateAccess = useAccessStore((state) => state.hydrate);
  const resetAccess = useAccessStore((state) => state.reset);
  const { refreshFileTree } = useFileStore();
  const refreshPublishFailures = useGitStore((state) => state.refreshPublishFailures);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const activeDocumentPath = useActiveEditorFilePath(activeTabId);
  const openDocumentPaths = useOpenEditorFilePaths();
  const { mutate: markDocumentNotificationsRead } = useMarkDocumentNotificationsReadMutation();
  const markDocumentNotificationsForPathRead = useCallback((path: string | null | undefined) => {
    const normalizedPath = normalizeDocumentPath(path ?? '');
    if (!normalizedPath) {
      return;
    }

    markDocumentNotificationsRead(normalizedPath);
  }, [markDocumentNotificationsRead]);
  const reloadOpenDocumentTabsForAccessRefresh = useCallback((detail: DmsDocumentAccessRefreshEventDetail) => {
    if (!RELOAD_OPEN_DOCUMENT_NOTIFICATION_TYPES.has(detail.notificationType)) {
      return;
    }

    const normalizedPath = normalizeDocumentPath(detail.path);
    if (!normalizedPath) {
      return;
    }

    const editorStore = useEditorMultiStore.getState();
    const forceReload = FORCE_ACCESS_RELOAD_NOTIFICATION_TYPES.has(detail.notificationType);

    for (const [tabId, editorState] of Object.entries(editorStore.editors)) {
      if (
        editorState.contentType !== 'document'
        || normalizeDocumentPath(editorState.currentFilePath ?? '') !== normalizedPath
      ) {
        continue;
      }

      const shouldReload = forceReload || Boolean(editorState.lockedPreview) || !editorState.hasUnsavedChanges;
      if (!shouldReload) {
        continue;
      }

      void useEditorMultiStore.getState().loadFile(tabId, normalizedPath);
    }
  }, []);
  const refreshOpenDocumentComments = useCallback(async (path: string | null | undefined) => {
    const normalizedPath = normalizeDocumentPath(path ?? '');
    if (!normalizedPath) {
      return;
    }

    const response = await commentsApi.list(normalizedPath);
    if (!response.success || !response.data) {
      return;
    }

    const editorStore = useEditorMultiStore.getState();
    for (const [tabId, editorState] of Object.entries(editorStore.editors)) {
      if (
        editorState.contentType !== 'document'
        || normalizeDocumentPath(editorState.currentFilePath ?? '') !== normalizedPath
        || !editorState.documentMetadata
      ) {
        continue;
      }

      editorStore._updateTab(tabId, {
        documentMetadata: {
          ...editorState.documentMetadata,
          comments: response.data.comments,
        },
      });
    }
  }, []);
  const refreshOpenDocumentTabsForFileChange = useCallback((event: DmsFileChangedEvent) => {
    if (
      event.userId === currentUserId
      || (event.action !== 'update' && event.action !== 'metadata')
    ) {
      return;
    }

    const changedPaths = getChangedDocumentPaths(event);
    if (changedPaths.length === 0) {
      return;
    }

    const normalizedActivePath = normalizeDocumentPath(activeDocumentPath ?? '');
    const editorStore = useEditorMultiStore.getState();
    const reloadedActivePaths = new Set<string>();
    const blockedActivePaths = new Set<string>();

    for (const changedPath of changedPaths) {
      for (const [tabId, editorState] of Object.entries(editorStore.editors)) {
        if (
          editorState.contentType !== 'document'
          || normalizeDocumentPath(editorState.currentFilePath ?? '') !== changedPath
        ) {
          continue;
        }

        const isActiveDocument = normalizedActivePath === changedPath;
        const hasLocalWork = editorState.isEditing || editorState.hasUnsavedChanges || editorState.isSaving;

        if (event.action === 'metadata') {
          if (!editorState.pendingMetadataUpdate) {
            void editorStore.refreshFileMetadata(tabId, changedPath);
          }
          continue;
        }

        if (hasLocalWork) {
          if (isActiveDocument) {
            blockedActivePaths.add(changedPath);
          }
          continue;
        }

        void editorStore.loadFile(tabId, changedPath);
        if (isActiveDocument) {
          reloadedActivePaths.add(changedPath);
        }
      }
    }

    if (blockedActivePaths.size > 0) {
      const who = event.userName ?? '다른 사용자';
      toast.warning(`${who}가 이 문서를 수정했습니다.`, {
        description: '현재 편집 중인 내용이 있어 자동 갱신하지 않았습니다. 저장 전 최신 내용을 확인하세요.',
        duration: 7000,
      });
      return;
    }

    if (reloadedActivePaths.size > 0) {
      const who = event.userName ?? '다른 사용자';
      toast.info(`${who}가 이 문서를 수정했습니다.`, {
        description: '현재 문서를 최신 내용으로 갱신했습니다.',
        duration: 5000,
      });
      markDocumentNotificationsForPathRead(Array.from(reloadedActivePaths)[0]);
    }
  }, [activeDocumentPath, currentUserId, markDocumentNotificationsForPathRead]);
  const redirectToLogin = useCallback(() => {
    router.replace(LOGIN_PATH);
  }, [router]);
  const handleNotificationDomainEvent = useCallback((event: CommonNotificationStreamEvent) => {
    if (event.domainEvent?.type !== DMS_DOCUMENT_COMMENT_CHANGED_DOMAIN_EVENT_TYPE) {
      return;
    }

    const payload = event.domainEvent.payload;
    if (!isDmsDocumentCommentChangedDomainPayload(payload)) {
      return;
    }

    const normalizedPath = normalizeDocumentPath(payload.path);
    if (!hasOpenDocumentPath(normalizedPath)) {
      return;
    }

    void refreshOpenDocumentComments(normalizedPath);
    markDocumentNotificationsForPathRead(normalizedPath);
  }, [markDocumentNotificationsForPathRead, refreshOpenDocumentComments]);

  useLayoutViewportSync();

  // WebSocket 실시간 동기화
  useDmsSocket({
    activeDocumentPath: activeDocumentPath ?? undefined,
    documentPaths: openDocumentPaths,
    onFileChanged: refreshOpenDocumentTabsForFileChange,
    onPublishStatus: () => {
      void refreshPublishFailures();
    },
  });

  useNotificationEventStream('dms', {
    enabled: isAuthenticated,
    onDomainEvent: handleNotificationDomainEvent,
  });

  useEffect(() => {
    const handleDocumentAccessRefresh = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isDmsDocumentAccessRefreshEventDetail(detail)) {
        return;
      }

      const normalizedPath = normalizeDocumentPath(detail.path);
      if (hasOpenDocumentPath(normalizedPath)) {
        markDocumentNotificationsForPathRead(normalizedPath);
      }
      reloadOpenDocumentTabsForAccessRefresh(detail);
    };

    window.addEventListener(DMS_DOCUMENT_ACCESS_REFRESH_EVENT, handleDocumentAccessRefresh);
    return () => window.removeEventListener(DMS_DOCUMENT_ACCESS_REFRESH_EVENT, handleDocumentAccessRefresh);
  }, [markDocumentNotificationsForPathRead, reloadOpenDocumentTabsForAccessRefresh]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    markDocumentNotificationsForPathRead(activeDocumentPath);
  }, [activeDocumentPath, isAuthenticated, markDocumentNotificationsForPathRead]);

  const { showLoading, shouldRender } = useProtectedAppBootstrap({
    hasHydrated,
    isAuthenticated,
    authIsLoading,
    accessHasLoaded,
    accessIsLoading,
    checkAuth,
    hydrateAccess,
    resetAccess,
    onUnauthenticated: redirectToLogin,
  });

  useEffect(() => {
    if (!isAuthenticated || !currentUserId || !accessSnapshot?.features.canReadDocuments) {
      return;
    }

    void refreshFileTree();
  }, [accessSnapshot?.features.canReadDocuments, currentUserId, isAuthenticated, refreshFileTree]);

  if (showLoading) {
    return <AuthLoadingScreen />;
  }

  if (!shouldRender) {
    return null;
  }

  return children;
}
