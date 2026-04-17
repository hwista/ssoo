'use client';

import { useEffect } from 'react';
import { SHARED_AUTH_CHANGE_EVENT } from '@ssoo/web-auth';
import { useAuthStore } from '@/stores';

export function AuthStateSync() {
  const syncFromStorage = useAuthStore((state) => state.syncFromStorage);

  useEffect(() => {
    const handleSync = () => {
      syncFromStorage();
    };

    handleSync();
    window.addEventListener('storage', handleSync);
    window.addEventListener(SHARED_AUTH_CHANGE_EVENT, handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener(SHARED_AUTH_CHANGE_EVENT, handleSync);
    };
  }, [syncFromStorage]);

  return null;
}
