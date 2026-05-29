'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collaborationApi,
  type DocumentCollaborationSnapshotClient,
  type SoftLockTakeoverRequestClient,
  type SoftLockTakeoverResponseClient,
  type SoftLockTakeoverResultClient,
} from '@/lib/api/collaborationApi';
import {
  DMS_COLLABORATION_CHANGED_EVENT,
  DMS_LOCK_TAKEOVER_REQUESTED_EVENT,
  DMS_LOCK_TAKEOVER_RESPONDED_EVENT,
  DMS_LOCK_TAKEOVER_RESPONSE_NOTICE_EVENT,
  isDmsCollaborationChangedEventDetail,
  isDmsLockTakeoverRequestedEventDetail,
  isDmsLockTakeoverRespondedEventDetail,
  isDmsLockTakeoverResponseNoticeEventDetail,
} from '@/lib/notification-events';

function createSessionId(): string {
  return `sess_${Math.random().toString(36).slice(2, 10)}`;
}

export function useDocumentCollaboration(path: string | null, mode: 'view' | 'edit') {
  const [snapshot, setSnapshot] = useState<DocumentCollaborationSnapshotClient | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [takeoverRequest, setTakeoverRequest] = useState<SoftLockTakeoverRequestClient | null>(null);
  const [takeoverResponse, setTakeoverResponse] = useState<SoftLockTakeoverResponseClient | null>(null);
  const [pendingTakeoverRequest, setPendingTakeoverRequest] = useState<SoftLockTakeoverRequestClient | null>(null);
  const [sessionId] = useState(() => createSessionId());
  const pendingTakeoverRequestId = pendingTakeoverRequest?.requestId ?? null;

  const refreshTakeoverPendingState = useCallback(async () => {
    if (!path) {
      setPendingTakeoverRequest(null);
      setTakeoverRequest(null);
      return null;
    }

    const response = await collaborationApi.getPendingTakeover(path);
    if (response.success && response.data) {
      setPendingTakeoverRequest(response.data.requesterRequest);
      setTakeoverRequest(response.data.ownerRequest);
      return response.data;
    }
    return null;
  }, [path]);

  const join = useCallback(async (nextMode: 'view' | 'edit' = mode) => {
    if (!path) return null;
    const response = await collaborationApi.heartbeat(path, nextMode, sessionId);
    if (response.success && response.data) {
      setSnapshot(response.data);
      setLastError(null);
      void refreshTakeoverPendingState();
      return response.data;
    }
    setLastError(response.error ?? '협업 상태를 갱신하지 못했습니다.');
    const snapshotResponse = await collaborationApi.getSnapshot(path);
    if (snapshotResponse.success && snapshotResponse.data) {
      setSnapshot(snapshotResponse.data);
      void refreshTakeoverPendingState();
    }
    return null;
  }, [mode, path, refreshTakeoverPendingState, sessionId]);

  const startEditing = useCallback(async () => join('edit'), [join]);

  const heartbeat = useCallback(async () => join(mode), [join, mode]);

  const takeover = useCallback(async (): Promise<SoftLockTakeoverResultClient | null> => {
    if (!path) return null;
    const response = await collaborationApi.takeover(path, sessionId);
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
  }, [path, sessionId]);

  const respondToTakeover = useCallback(async (requestId: string, approved: boolean) => {
    const response = await collaborationApi.respondToTakeover(requestId, approved);
    if (response.success && response.data) {
      setSnapshot(response.data.snapshot);
      setLastError(null);
      setPendingTakeoverRequest(null);
      return response.data;
    }
    setLastError(response.error ?? '편집 잠금 응답 처리에 실패했습니다.');
    return null;
  }, []);

  const refresh = useCallback(async () => {
    if (!path) return null;
    const response = await collaborationApi.refresh(path);
    if (response.success && response.data) {
      setSnapshot(response.data);
      setLastError(null);
      void refreshTakeoverPendingState();
      return response.data;
    }
    return null;
  }, [path, refreshTakeoverPendingState]);

  const retryPublish = useCallback(async () => {
    if (!path) return null;
    const response = await collaborationApi.retryPublish(path);
    if (response.success && response.data) {
      setSnapshot(response.data);
      setLastError(null);
      return response.data;
    }
    return null;
  }, [path]);

  const clearTakeoverRequest = useCallback(() => setTakeoverRequest(null), []);
  const clearTakeoverResponse = useCallback(() => setTakeoverResponse(null), []);
  const clearPendingTakeoverRequest = useCallback(() => setPendingTakeoverRequest(null), []);

  useEffect(() => {
    if (!path) {
      setSnapshot(null);
      setPendingTakeoverRequest(null);
      return;
    }
    let active = true;
    const joinDocument = async () => {
      const response = await collaborationApi.heartbeat(path, mode, sessionId);
      if (!active) return;
      if (response.success && response.data) {
        setSnapshot(response.data);
        setLastError(null);
        void refreshTakeoverPendingState();
        return;
      }
      setLastError(response.error ?? '협업 상태를 갱신하지 못했습니다.');
      const snapshotResponse = await collaborationApi.getSnapshot(path);
      if (active && snapshotResponse.success && snapshotResponse.data) {
        setSnapshot(snapshotResponse.data);
        void refreshTakeoverPendingState();
      }
    };
    void joinDocument();
    return () => {
      active = false;
    };
  }, [mode, path, refreshTakeoverPendingState, sessionId]);

  useEffect(() => {
    if (!path) return;
    return () => {
      void collaborationApi.leave(path, sessionId);
    };
  }, [path, sessionId]);

  useEffect(() => {
    if (!path || typeof window === 'undefined') {
      setTakeoverRequest(null);
      setTakeoverResponse(null);
      return;
    }

    const handleCollaborationChanged = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isDmsCollaborationChangedEventDetail(detail) || detail.path !== path) {
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
          path,
          status: 'rejected',
          snapshot: detail.snapshot,
          message: '현재 편집자가 편집을 계속합니다.',
        });
        setPendingTakeoverRequest(null);
      }
    };

    const handleTakeoverRequested = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isDmsLockTakeoverRequestedEventDetail(detail) || detail.path !== path) {
        return;
      }
      setTakeoverRequest(detail);
    };

    const handleTakeoverResponded = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isDmsLockTakeoverRespondedEventDetail(detail) || detail.path !== path) {
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
        || detail.path !== path
        || !pendingTakeoverRequest
        || detail.requestId !== pendingTakeoverRequest.requestId
      ) {
        return;
      }

      setPendingTakeoverRequest(null);
      void (async () => {
        const snapshotResponse = await collaborationApi.getSnapshot(path);
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
  }, [path, pendingTakeoverRequest, sessionId]);

  useEffect(() => {
    if (!pendingTakeoverRequest) {
      return;
    }

    const remainingMs = new Date(pendingTakeoverRequest.expiresAt).getTime() - Date.now();
    if (remainingMs <= 0) {
      setPendingTakeoverRequest(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPendingTakeoverRequest((current) => (
        current?.requestId === pendingTakeoverRequest.requestId ? null : current
      ));
    }, remainingMs);
    return () => window.clearTimeout(timeoutId);
  }, [pendingTakeoverRequest]);

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
