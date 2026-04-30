'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { getSharedAccessToken } from '@ssoo/web-auth';
import { useAuthStore } from '@/stores';
import { fileTreeKeys } from '@/hooks/queries/useFileTree';
import { toast } from '@/lib/toast';

// ============================================================================
// Types
// ============================================================================

interface DmsFileChangedEvent {
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

interface UseDmsSocketOptions {
  /** 현재 보고 있는 문서 경로 */
  activeDocumentPath?: string;
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
  const { activeDocumentPath, onFileChanged, onTreeChanged, onPublishStatus } = options;
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const currentUserId = useAuthStore((state) => state.user?.userId);
  // currentUserId 를 ref 로도 보관 — socket 이벤트 핸들러는 effect 내부 closure 라
  // dependency 에 currentUserId 를 추가하면 socket 이 재생성됨. ref 로 최신값 참조.
  const currentUserIdRef = useRef(currentUserId);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);
  const prevDocPath = useRef<string | undefined>(undefined);

  // Invalidate file tree query
  const invalidateFileTree = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: fileTreeKeys.tree() });
  }, [queryClient]);

  // Connect/disconnect based on auth state
  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;

    const token = getSharedAccessToken();
    if (!token) return;

    const wsUrl = getWsUrl();
    if (!wsUrl) return;

    const socket = io(`${wsUrl}/dms`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // 트리 변경 구독
      socket.emit('subscribe:tree');

      // 현재 보고 있는 문서가 있으면 구독
      if (activeDocumentPath) {
        socket.emit('subscribe:document', { path: activeDocumentPath });
        prevDocPath.current = activeDocumentPath;
      }
    });

    // 파일 변경 이벤트
    socket.on('dms:file-changed', (event: DmsFileChangedEvent) => {
      onFileChanged?.(event);

      // 다른 사용자가 현재 보고 있는 문서를 수정한 경우 알림.
      // ref 로 최신 currentUserId 참조 (socket effect 의 closure 가 stale 한 문제 회피).
      if (event.userId && event.userId !== currentUserIdRef.current && event.action === 'update') {
        const who = event.userName ?? '다른 사용자';
        toast.warning(`${who}가 이 문서를 수정했습니다.`, {
          description: '저장 시 충돌이 발생할 수 있습니다. 최신 내용을 확인하세요.',
          duration: 6000,
        });
      }

      // create/rename/delete는 트리도 갱신
      if (event.action !== 'update' && event.action !== 'metadata') {
        invalidateFileTree();
      }
    });

    // 트리 변경 이벤트
    socket.on('dms:tree-changed', (event: DmsTreeChangedEvent) => {
      onTreeChanged?.(event);
      invalidateFileTree();
    });

    // publish 상태 이벤트
    socket.on('dms:publish-status', (event: DmsPublishStatusEvent) => {
      onPublishStatus?.(event);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      prevDocPath.current = undefined;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Document path subscription management
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    // 이전 문서 구독 해제
    if (prevDocPath.current && prevDocPath.current !== activeDocumentPath) {
      socket.emit('unsubscribe:document', { path: prevDocPath.current });
    }

    // 새 문서 구독
    if (activeDocumentPath) {
      socket.emit('subscribe:document', { path: activeDocumentPath });
    }

    prevDocPath.current = activeDocumentPath;
  }, [activeDocumentPath]);
}
