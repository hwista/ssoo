'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collaborationApi,
  type DocumentCollaborationSnapshotClient,
  type SoftLockTakeoverRequestClient,
  type SoftLockTakeoverResponseClient,
  type SoftLockTakeoverResultClient,
} from '@/lib/api/collaborationApi';
import {
  DMS_COLLABORATION_CHANGED_EVENT,
  DMS_COLLABORATION_SUBSCRIBE_DOCUMENT_EVENT,
  DMS_COLLABORATION_UNSUBSCRIBE_DOCUMENT_EVENT,
  DMS_LOCK_TAKEOVER_REQUESTED_EVENT,
  DMS_LOCK_TAKEOVER_RESPONDED_EVENT,
  DMS_LOCK_TAKEOVER_RESPONSE_NOTICE_EVENT,
  isDmsCollaborationChangedEventDetail,
  isDmsLockTakeoverRequestedEventDetail,
  isDmsLockTakeoverRespondedEventDetail,
  isDmsLockTakeoverResponseNoticeEventDetail,
} from '@/lib/notification-events';
import { normalizeDocumentPath } from '@/lib/utils/linkUtils';

function createSessionId(): string {
  return `sess_${Math.random().toString(36).slice(2, 10)}`;
}

const COLLABORATION_SESSION_STORAGE_PREFIX = 'dms-collaboration-session-v1';
const COLLABORATION_SESSION_ID_PATTERN = /^sess_[a-z0-9]{8,}$/;

interface CollaborationSessionState {
  storageKey: string | null;
  sessionId: string;
}

interface UseDocumentCollaborationOptions {
  sessionScopeKey?: string | null;
}

function buildSessionStorageKey(documentPath: string, sessionScopeKey: string): string {
  return [
    COLLABORATION_SESSION_STORAGE_PREFIX,
    encodeURIComponent(sessionScopeKey),
    encodeURIComponent(documentPath),
  ].join(':');
}

function resolveSessionState(storageKey: string | null): CollaborationSessionState {
  if (!storageKey || typeof window === 'undefined') {
    return { storageKey, sessionId: createSessionId() };
  }

  try {
    const storedSessionId = window.sessionStorage.getItem(storageKey);
    if (storedSessionId && COLLABORATION_SESSION_ID_PATTERN.test(storedSessionId)) {
      return { storageKey, sessionId: storedSessionId };
    }

    const nextSessionId = createSessionId();
    window.sessionStorage.setItem(storageKey, nextSessionId);
    return { storageKey, sessionId: nextSessionId };
  } catch {
    return { storageKey, sessionId: createSessionId() };
  }
}

export function useDocumentCollaboration(
  path: string | null,
  mode: 'view' | 'edit',
  options: UseDocumentCollaborationOptions = {},
) {
  const documentPath = useMemo(() => normalizeDocumentPath(path ?? ''), [path]);
  const normalizedSessionScopeKey = useMemo(() => {
    const scopeKey = options.sessionScopeKey?.trim();
    return scopeKey || 'default';
  }, [options.sessionScopeKey]);
  const sessionStorageKey = useMemo(() => (
    documentPath
      ? buildSessionStorageKey(documentPath, normalizedSessionScopeKey)
      : null
  ), [documentPath, normalizedSessionScopeKey]);
  const documentSubscriptionId = useMemo(() => (
    documentPath
      ? `${COLLABORATION_SESSION_STORAGE_PREFIX}:${normalizedSessionScopeKey}:${documentPath}`
      : null
  ), [documentPath, normalizedSessionScopeKey]);
  const [snapshot, setSnapshot] = useState<DocumentCollaborationSnapshotClient | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [takeoverRequest, setTakeoverRequest] = useState<SoftLockTakeoverRequestClient | null>(null);
  const [takeoverResponse, setTakeoverResponse] = useState<SoftLockTakeoverResponseClient | null>(null);
  const [pendingTakeoverRequest, setPendingTakeoverRequest] = useState<SoftLockTakeoverRequestClient | null>(null);
  const [sessionState, setSessionState] = useState<CollaborationSessionState>(() => resolveSessionState(sessionStorageKey));
  const isSessionReady = Boolean(documentPath && sessionState.storageKey === sessionStorageKey);
  const sessionId = sessionState.sessionId;
  const pendingTakeoverRequestId = pendingTakeoverRequest?.requestId ?? null;
  const modeRef = useRef(mode);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    setSessionState((current) => (
      current.storageKey === sessionStorageKey
        ? current
        : resolveSessionState(sessionStorageKey)
    ));
  }, [sessionStorageKey]);

  const resolveReadySessionId = useCallback(() => {
    if (!documentPath || !sessionStorageKey) {
      return null;
    }
    if (sessionState.storageKey === sessionStorageKey) {
      return sessionState.sessionId;
    }

    const nextSessionState = resolveSessionState(sessionStorageKey);
    setSessionState(nextSessionState);
    return nextSessionState.sessionId;
  }, [documentPath, sessionState.sessionId, sessionState.storageKey, sessionStorageKey]);

  const refreshTakeoverPendingState = useCallback(async () => {
    if (!documentPath) {
      setPendingTakeoverRequest(null);
      setTakeoverRequest(null);
      return null;
    }

    const response = await collaborationApi.getPendingTakeover(documentPath);
    if (response.success && response.data) {
      setPendingTakeoverRequest(response.data.requesterRequest);
      setTakeoverRequest(response.data.ownerRequest);
      return response.data;
    }
    return null;
  }, [documentPath]);

  const join = useCallback(async (nextMode: 'view' | 'edit' = mode) => {
    const readySessionId = resolveReadySessionId();
    if (!documentPath || !readySessionId) return null;
    const response = await collaborationApi.heartbeat(documentPath, nextMode, readySessionId);
    if (response.success && response.data) {
      setSnapshot(response.data);
      setLastError(null);
      void refreshTakeoverPendingState();
      return response.data;
    }
    setLastError(response.error ?? '협업 상태를 갱신하지 못했습니다.');
    const snapshotResponse = await collaborationApi.getSnapshot(documentPath);
    if (snapshotResponse.success && snapshotResponse.data) {
      setSnapshot(snapshotResponse.data);
      void refreshTakeoverPendingState();
    }
    return null;
  }, [documentPath, mode, refreshTakeoverPendingState, resolveReadySessionId]);

  const startEditing = useCallback(async () => join('edit'), [join]);

  const heartbeat = useCallback(async () => join(mode), [join, mode]);

  const renewLock = useCallback(async () => {
    const readySessionId = resolveReadySessionId();
    if (!documentPath || !readySessionId) return null;
    const response = await collaborationApi.renewLock(documentPath, readySessionId);
    if (response.success && response.data) {
      setSnapshot(response.data);
      setLastError(null);
      return response.data;
    }
    setLastError(response.error ?? '편집 잠금을 갱신하지 못했습니다.');
    const snapshotResponse = await collaborationApi.getSnapshot(documentPath);
    if (snapshotResponse.success && snapshotResponse.data) {
      setSnapshot(snapshotResponse.data);
    }
    return null;
  }, [documentPath, resolveReadySessionId]);

  const takeover = useCallback(async (): Promise<SoftLockTakeoverResultClient | null> => {
    const readySessionId = resolveReadySessionId();
    if (!documentPath || !readySessionId) return null;
    const response = await collaborationApi.takeover(documentPath, readySessionId);
    if (response.success && response.data) {
      setSnapshot(response.data.snapshot);
      setLastError(null);
      if (response.data.status === 'requested' && response.data.request) {
        setPendingTakeoverRequest(response.data.request);
      } else {
        setPendingTakeoverRequest(null);
      }
      return response.data;
    }
    setLastError(response.error ?? '편집 잠금 요청에 실패했습니다.');
    return null;
  }, [documentPath, resolveReadySessionId]);

  const respondToTakeover = useCallback(async (requestId: string, approved: boolean) => {
    const response = await collaborationApi.respondToTakeover(requestId, approved);
    if (response.success && response.data) {
      setSnapshot(response.data.snapshot);
      setLastError(null);
      setTakeoverRequest(null);
      setPendingTakeoverRequest(null);
      return response.data;
    }
    setLastError(response.error ?? '편집 잠금 응답 처리에 실패했습니다.');
    return null;
  }, []);

  const refresh = useCallback(async () => {
    if (!documentPath) return null;
    const response = await collaborationApi.refresh(documentPath);
    if (response.success && response.data) {
      setSnapshot(response.data);
      setLastError(null);
      void refreshTakeoverPendingState();
      return response.data;
    }
    return null;
  }, [documentPath, refreshTakeoverPendingState]);

  const retryPublish = useCallback(async () => {
    if (!documentPath) return null;
    const response = await collaborationApi.retryPublish(documentPath);
    if (response.success && response.data) {
      setSnapshot(response.data);
      setLastError(null);
      return response.data;
    }
    return null;
  }, [documentPath]);

  const clearTakeoverRequest = useCallback(() => setTakeoverRequest(null), []);
  const clearTakeoverResponse = useCallback(() => setTakeoverResponse(null), []);
  const clearPendingTakeoverRequest = useCallback(() => setPendingTakeoverRequest(null), []);

  useEffect(() => {
    if (!documentPath || typeof window === 'undefined') {
      return;
    }

    const dispatchSubscribe = () => {
      window.dispatchEvent(new CustomEvent(DMS_COLLABORATION_SUBSCRIBE_DOCUMENT_EVENT, {
        detail: { path: documentPath, subscriptionId: documentSubscriptionId ?? undefined },
      }));
    };

    dispatchSubscribe();
    const retryIds = [0, 250, 1_000].map((delayMs) => (
      window.setTimeout(dispatchSubscribe, delayMs)
    ));
    return () => {
      retryIds.forEach((retryId) => window.clearTimeout(retryId));
      window.dispatchEvent(new CustomEvent(DMS_COLLABORATION_UNSUBSCRIBE_DOCUMENT_EVENT, {
        detail: { path: documentPath, subscriptionId: documentSubscriptionId ?? undefined },
      }));
    };
  }, [documentPath, documentSubscriptionId]);

  useEffect(() => {
    if (!documentPath) {
      setSnapshot(null);
      setPendingTakeoverRequest(null);
      return;
    }
    if (!isSessionReady) {
      return;
    }
    let active = true;
    const joinDocument = async () => {
      const response = await collaborationApi.heartbeat(documentPath, mode, sessionId);
      if (!active) return;
      if (response.success && response.data) {
        setSnapshot(response.data);
        setLastError(null);
        void refreshTakeoverPendingState();
        return;
      }
      setLastError(response.error ?? '협업 상태를 갱신하지 못했습니다.');
      const snapshotResponse = await collaborationApi.getSnapshot(documentPath);
      if (active && snapshotResponse.success && snapshotResponse.data) {
        setSnapshot(snapshotResponse.data);
        void refreshTakeoverPendingState();
      }
    };
    void joinDocument();
    return () => {
      active = false;
    };
  }, [documentPath, isSessionReady, mode, refreshTakeoverPendingState, sessionId]);

  useEffect(() => {
    if (!documentPath || !isSessionReady) return;
    return () => {
      if (modeRef.current === 'edit') {
        return;
      }
      void collaborationApi.leave(documentPath, sessionId);
    };
  }, [documentPath, isSessionReady, sessionId]);

  useEffect(() => {
    if (!documentPath || !isSessionReady || mode !== 'edit' || typeof window === 'undefined') return;
    const intervalId = window.setInterval(() => {
      void renewLock();
    }, 10_000);
    return () => window.clearInterval(intervalId);
  }, [documentPath, isSessionReady, mode, renewLock]);

  useEffect(() => {
    if (!documentPath || typeof window === 'undefined') {
      setTakeoverRequest(null);
      setTakeoverResponse(null);
      return;
    }

    const handleCollaborationChanged = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (
        !isDmsCollaborationChangedEventDetail(detail)
        || normalizeDocumentPath(detail.path) !== documentPath
      ) {
        return;
      }
      setSnapshot(detail.snapshot);
      setLastError(null);
      if (
        pendingTakeoverRequest
        && detail.reason === 'lock'
        && detail.snapshot.softLock
        && detail.snapshot.softLock.sessionId !== sessionId
      ) {
        setTakeoverResponse({
          requestId: pendingTakeoverRequest.requestId,
          path: documentPath,
          status: 'rejected',
          snapshot: detail.snapshot,
          message: '현재 편집자가 편집을 계속합니다.',
        });
        setPendingTakeoverRequest(null);
      }
    };

    const handleTakeoverRequested = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (
        !isDmsLockTakeoverRequestedEventDetail(detail)
        || normalizeDocumentPath(detail.path) !== documentPath
      ) {
        return;
      }
      setTakeoverRequest(detail);
    };

    const handleTakeoverResponded = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (
        !isDmsLockTakeoverRespondedEventDetail(detail)
        || normalizeDocumentPath(detail.path) !== documentPath
      ) {
        return;
      }
      setSnapshot(detail.snapshot);
      setTakeoverResponse(detail);
      setPendingTakeoverRequest(null);
    };

    const handleTakeoverResponseNotice = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (
        !isDmsLockTakeoverResponseNoticeEventDetail(detail)
        || normalizeDocumentPath(detail.path) !== documentPath
        || !pendingTakeoverRequest
        || detail.requestId !== pendingTakeoverRequest.requestId
      ) {
        return;
      }

      setPendingTakeoverRequest(null);
      void (async () => {
        const snapshotResponse = await collaborationApi.getSnapshot(documentPath);
        if (!snapshotResponse.success || !snapshotResponse.data) {
          return;
        }
        setSnapshot(snapshotResponse.data);
        if (detail.status === 'approved') {
          setTakeoverResponse({
            requestId: detail.requestId,
            path: detail.path,
            status: detail.status,
            snapshot: snapshotResponse.data,
            message: detail.message,
          });
        }
      })();
    };

    window.addEventListener(DMS_COLLABORATION_CHANGED_EVENT, handleCollaborationChanged);
    window.addEventListener(DMS_LOCK_TAKEOVER_REQUESTED_EVENT, handleTakeoverRequested);
    window.addEventListener(DMS_LOCK_TAKEOVER_RESPONDED_EVENT, handleTakeoverResponded);
    window.addEventListener(DMS_LOCK_TAKEOVER_RESPONSE_NOTICE_EVENT, handleTakeoverResponseNotice);
    return () => {
      window.removeEventListener(DMS_COLLABORATION_CHANGED_EVENT, handleCollaborationChanged);
      window.removeEventListener(DMS_LOCK_TAKEOVER_REQUESTED_EVENT, handleTakeoverRequested);
      window.removeEventListener(DMS_LOCK_TAKEOVER_RESPONDED_EVENT, handleTakeoverResponded);
      window.removeEventListener(DMS_LOCK_TAKEOVER_RESPONSE_NOTICE_EVENT, handleTakeoverResponseNotice);
    };
  }, [documentPath, pendingTakeoverRequest, sessionId]);

  useEffect(() => {
    if (!pendingTakeoverRequest) {
      return;
    }
    if (!documentPath) {
      setPendingTakeoverRequest(null);
      return;
    }

    const clearExpiredRequestAndRefresh = () => {
      setPendingTakeoverRequest((current) => (
        current?.requestId === pendingTakeoverRequest.requestId ? null : current
      ));
      void (async () => {
        const snapshotResponse = await collaborationApi.getSnapshot(documentPath);
        if (snapshotResponse.success && snapshotResponse.data) {
          setSnapshot(snapshotResponse.data);
          setLastError(null);
        }
        void refreshTakeoverPendingState();
      })();
    };

    const remainingMs = new Date(pendingTakeoverRequest.expiresAt).getTime() - Date.now();
    if (remainingMs <= 0) {
      clearExpiredRequestAndRefresh();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      clearExpiredRequestAndRefresh();
    }, remainingMs);
    return () => window.clearTimeout(timeoutId);
  }, [documentPath, pendingTakeoverRequest, refreshTakeoverPendingState]);

  const activeEditors = useMemo(() => (snapshot?.members ?? []).filter((member) => member.mode === 'edit'), [snapshot]);

  return {
    snapshot,
    activeEditors,
    sessionId,
    lastError,
    takeoverRequest,
    takeoverResponse,
    pendingTakeoverRequestId,
    heartbeat,
    startEditing,
    takeover,
    respondToTakeover,
    refresh,
    retryPublish,
    clearTakeoverRequest,
    clearTakeoverResponse,
    clearPendingTakeoverRequest,
  };
}
