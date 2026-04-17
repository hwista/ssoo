'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { collaborationApi, type DocumentCollaborationSnapshotClient } from '@/lib/api/collaborationApi';

function createSessionId(): string {
  return `sess_${Math.random().toString(36).slice(2, 10)}`;
}

export function useDocumentCollaboration(path: string | null, mode: 'view' | 'edit') {
  const [snapshot, setSnapshot] = useState<DocumentCollaborationSnapshotClient | null>(null);
  const [sessionId] = useState(() => createSessionId());

  const heartbeat = useCallback(async () => {
    if (!path) return null;
    const response = await collaborationApi.heartbeat(path, mode, sessionId);
    if (response.success && response.data) {
      setSnapshot(response.data);
      return response.data;
    }
    return null;
  }, [mode, path, sessionId]);

  const takeover = useCallback(async () => {
    if (!path) return null;
    const response = await collaborationApi.takeover(path, sessionId);
    if (response.success && response.data) {
      setSnapshot(response.data);
      return response.data;
    }
    return null;
  }, [path, sessionId]);

  const refresh = useCallback(async () => {
    if (!path) return null;
    const response = await collaborationApi.refresh(path);
    if (response.success && response.data) {
      setSnapshot(response.data);
      return response.data;
    }
    return null;
  }, [path]);

  const retryPublish = useCallback(async () => {
    if (!path) return null;
    const response = await collaborationApi.retryPublish(path);
    if (response.success && response.data) {
      setSnapshot(response.data);
      return response.data;
    }
    return null;
  }, [path]);

  useEffect(() => {
    if (!path) {
      setSnapshot(null);
      return;
    }
    let active = true;
    const runHeartbeat = async () => {
      const response = await collaborationApi.heartbeat(path, mode, sessionId);
      if (active && response.success && response.data) {
        setSnapshot(response.data);
      }
    };
    void runHeartbeat();
    const interval = window.setInterval(() => void runHeartbeat(), 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
      void collaborationApi.leave(path, sessionId);
    };
  }, [mode, path, sessionId]);

  const activeEditors = useMemo(() => (snapshot?.members ?? []).filter((member) => member.mode === 'edit'), [snapshot]);

  return { snapshot, activeEditors, sessionId, heartbeat, takeover, refresh, retryPublish };
}
