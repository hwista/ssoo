'use client';

import { useEffect, useMemo, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { getSharedAccessToken } from '@ssoo/web-auth';
import { useAuthStore } from '@/stores';
import { fileTreeKeys } from '@/hooks/queries/useFileTree';
import { normalizeDocumentPath } from '@/lib/utils/linkUtils';
import {
  DMS_COLLABORATION_CHANGED_EVENT,
  DMS_COLLABORATION_SUBSCRIBE_DOCUMENT_EVENT,
  DMS_COLLABORATION_UNSUBSCRIBE_DOCUMENT_EVENT,
  DMS_LOCK_TAKEOVER_REQUESTED_EVENT,
  DMS_LOCK_TAKEOVER_RESPONDED_EVENT,
  isDmsCollaborationDocumentSubscriptionEventDetail,
} from '@/lib/notification-events';
import {
  collaborationApi,
  type DocumentCollaborationSnapshotClient,
  type SoftLockTakeoverRequestClient,
  type SoftLockTakeoverResponseClient,
} from '@/lib/api/collaborationApi';

// ============================================================================
// Types
// ============================================================================

export interface DmsFileChangedEvent {
  action: 'create' | 'update' | 'rename' | 'delete' | 'metadata';
  path: string;
  paths: string[];
  userId: string;
  userName?: string;
  revisionSeq?: number;
}

interface DmsTreeChangedEvent {
  action: 'create' | 'rename' | 'delete' | 'sync';
}

interface DmsPublishStatusEvent {
  path: string;
  status: string;
  commitHash?: string;
  error?: string;
}

interface DmsCollaborationChangedSocketEvent {
  path: string;
  reason: 'join' | 'mode' | 'leave' | 'lock' | 'takeover' | 'publish' | 'refresh';
  snapshot: DocumentCollaborationSnapshotClient;
}

interface UseDmsSocketOptions {
  /** 현재 보고 있는 문서 경로 */
  activeDocumentPath?: string;
  /** 열린 문서 탭들의 경로. 협업 이벤트는 열린 문서 전체에 대해 즉시 수신한다. */
  documentPaths?: string[];
  /** 파일 변경 시 추가 콜백 */
  onFileChanged?: (event: DmsFileChangedEvent) => void;
  /** 트리 변경 시 추가 콜백 */
  onTreeChanged?: (event: DmsTreeChangedEvent) => void;
  /** publish 상태 변경 시 추가 콜백 */
  onPublishStatus?: (event: DmsPublishStatusEvent) => void;
}

// ============================================================================
// WebSocket URL resolution
// ============================================================================

function getWsUrl(): string {
  if (typeof window === 'undefined') return '';

  // NEXT_PUBLIC_WS_URL이 설정되어 있으면 사용
  const envUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (envUrl) return envUrl;

  // 같은 호스트의 port 4000 (NestJS 서버)
  const { hostname, protocol } = window.location;
  const wsProtocol = protocol === 'https:' ? 'https:' : 'http:';
  return `${wsProtocol}//${hostname}:4000`;
}

// ============================================================================
// Hook
// ============================================================================

export function useDmsSocket(options: UseDmsSocketOptions = {}) {
  const { activeDocumentPath, documentPaths, onFileChanged, onTreeChanged, onPublishStatus } = options;
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const onFileChangedRef = useRef(onFileChanged);
  const onTreeChangedRef = useRef(onTreeChanged);
  const onPublishStatusRef = useRef(onPublishStatus);

  // Socket lifecycle 은 인증 단위로만 유지하되, 이벤트 콜백은 최신 closure 를 참조한다.
  useEffect(() => {
    onFileChangedRef.current = onFileChanged;
  }, [onFileChanged]);
  useEffect(() => {
    onTreeChangedRef.current = onTreeChanged;
  }, [onTreeChanged]);
  useEffect(() => {
    onPublishStatusRef.current = onPublishStatus;
  }, [onPublishStatus]);
  const subscribedDocumentPaths = useMemo(() => {
    const paths = new Set<string>();
    for (const path of documentPaths ?? []) {
      const normalized = normalizeDocumentPath(path);
      if (normalized) paths.add(normalized);
    }
    const normalizedActivePath = normalizeDocumentPath(activeDocumentPath ?? '');
    if (normalizedActivePath) paths.add(normalizedActivePath);
    return Array.from(paths).sort();
  }, [activeDocumentPath, documentPaths]);
  const subscribedDocumentPathKey = subscribedDocumentPaths.join('\n');
  const prevDocPaths = useRef<Set<string>>(new Set());
  const subscribedDocumentPathsRef = useRef(subscribedDocumentPaths);
  const directDocumentSubscriptionCountsRef = useRef<Map<string, number>>(new Map());
  subscribedDocumentPathsRef.current = subscribedDocumentPaths;

  // Invalidate file tree query
  const invalidateFileTree = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: fileTreeKeys.tree() });
  }, [queryClient]);

  const dispatchCollaborationSnapshot = useCallback(async (documentPath: string) => {
    const normalizedPath = normalizeDocumentPath(documentPath);
    if (!normalizedPath) return;

    const response = await collaborationApi.getSnapshot(normalizedPath);
    if (!response.success || !response.data) return;

    if (
      !subscribedDocumentPathsRef.current.includes(normalizedPath)
      && !directDocumentSubscriptionCountsRef.current.has(normalizedPath)
    ) {
      return;
    }

    window.dispatchEvent(new CustomEvent<DmsCollaborationChangedSocketEvent>(DMS_COLLABORATION_CHANGED_EVENT, {
      detail: {
        path: response.data.path,
        reason: 'refresh',
        snapshot: response.data,
      },
    }));
  }, []);

  const subscribeDocument = useCallback((socket: Socket, documentPath: string) => {
    const normalizedPath = normalizeDocumentPath(documentPath);
    if (!normalizedPath) return;

    socket.emit('subscribe:document', { path: normalizedPath }, () => {
      void dispatchCollaborationSnapshot(normalizedPath);
    });
  }, [dispatchCollaborationSnapshot]);

  // Connect/disconnect based on auth state
  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;

    const token = getSharedAccessToken();
    if (!token) return;

    const wsUrl = getWsUrl();
    if (!wsUrl) return;

    const socket = io(`${wsUrl}/dms`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // 트리 변경 구독
      socket.emit('subscribe:tree');

      // 열린 문서가 있으면 구독.
      // connect handler 는 socket lifecycle 동안 유지되므로 최신 경로는 ref 에서 읽는다.
      const latestDocumentPaths = Array.from(new Set([
        ...subscribedDocumentPathsRef.current,
        ...directDocumentSubscriptionCountsRef.current.keys(),
      ])).sort();
      for (const documentPath of latestDocumentPaths) {
        subscribeDocument(socket, documentPath);
      }
      prevDocPaths.current = new Set(latestDocumentPaths);
    });

    // 파일 변경 이벤트
    socket.on('dms:file-changed', (event: DmsFileChangedEvent) => {
      onFileChangedRef.current?.(event);

      // create/rename/delete는 트리도 갱신
      if (event.action !== 'update' && event.action !== 'metadata') {
        invalidateFileTree();
      }
    });

    // 트리 변경 이벤트
    socket.on('dms:tree-changed', (event: DmsTreeChangedEvent) => {
      onTreeChangedRef.current?.(event);
      invalidateFileTree();
    });

    // publish 상태 이벤트
    socket.on('dms:publish-status', (event: DmsPublishStatusEvent) => {
      onPublishStatusRef.current?.(event);
    });

    socket.on('dms:collaboration-changed', (event: DmsCollaborationChangedSocketEvent) => {
      window.dispatchEvent(new CustomEvent(DMS_COLLABORATION_CHANGED_EVENT, { detail: event }));
    });

    socket.on('dms:lock-takeover-requested', (event: SoftLockTakeoverRequestClient) => {
      window.dispatchEvent(new CustomEvent(DMS_LOCK_TAKEOVER_REQUESTED_EVENT, { detail: event }));
    });

    socket.on('dms:lock-takeover-responded', (event: SoftLockTakeoverResponseClient) => {
      window.dispatchEvent(new CustomEvent(DMS_LOCK_TAKEOVER_RESPONDED_EVENT, { detail: event }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      prevDocPaths.current = new Set();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSubscribeDocument = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isDmsCollaborationDocumentSubscriptionEventDetail(detail)) {
        return;
      }

      const normalizedPath = normalizeDocumentPath(detail.path);
      if (!normalizedPath) {
        return;
      }

      const counts = directDocumentSubscriptionCountsRef.current;
      counts.set(normalizedPath, (counts.get(normalizedPath) ?? 0) + 1);
      const socket = socketRef.current;
      if (socket?.connected) {
        subscribeDocument(socket, normalizedPath);
      }
    };

    const handleUnsubscribeDocument = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      if (!isDmsCollaborationDocumentSubscriptionEventDetail(detail)) {
        return;
      }

      const normalizedPath = normalizeDocumentPath(detail.path);
      if (!normalizedPath) {
        return;
      }

      const counts = directDocumentSubscriptionCountsRef.current;
      const nextCount = (counts.get(normalizedPath) ?? 0) - 1;
      if (nextCount > 0) {
        counts.set(normalizedPath, nextCount);
        return;
      }

      counts.delete(normalizedPath);
      if (subscribedDocumentPathsRef.current.includes(normalizedPath)) {
        return;
      }

      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit('unsubscribe:document', { path: normalizedPath });
      }
    };

    window.addEventListener(DMS_COLLABORATION_SUBSCRIBE_DOCUMENT_EVENT, handleSubscribeDocument);
    window.addEventListener(DMS_COLLABORATION_UNSUBSCRIBE_DOCUMENT_EVENT, handleUnsubscribeDocument);
    return () => {
      window.removeEventListener(DMS_COLLABORATION_SUBSCRIBE_DOCUMENT_EVENT, handleSubscribeDocument);
      window.removeEventListener(DMS_COLLABORATION_UNSUBSCRIBE_DOCUMENT_EVENT, handleUnsubscribeDocument);
    };
  }, [subscribeDocument]);

  // Document path subscription management
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    const nextPaths = new Set(subscribedDocumentPathsRef.current);

    // 닫힌 문서 구독 해제
    for (const previousPath of prevDocPaths.current) {
      if (!nextPaths.has(previousPath)) {
        if (!directDocumentSubscriptionCountsRef.current.has(previousPath)) {
          socket.emit('unsubscribe:document', { path: previousPath });
        }
      }
    }

    // 새로 열린 문서 구독
    for (const nextPath of nextPaths) {
      if (!prevDocPaths.current.has(nextPath)) {
        subscribeDocument(socket, nextPath);
      }
    }

    prevDocPaths.current = nextPaths;
  }, [subscribeDocument, subscribedDocumentPathKey]);
}
