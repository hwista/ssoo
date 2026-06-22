'use client';

import { useEffect } from 'react';
import type { AuthIdentity } from '@ssoo/types/common';
import type { StoreApi, UseBoundStore } from 'zustand';
import { SHARED_AUTH_CHANGE_EVENT } from './storage';
import type { AuthStore } from './store';

export interface SharedAuthStateSyncProps<TUser extends AuthIdentity = AuthIdentity> {
  authStore: UseBoundStore<StoreApi<AuthStore<TUser>>>;
}

export function SharedAuthStateSync<TUser extends AuthIdentity = AuthIdentity>({
  authStore,
}: SharedAuthStateSyncProps<TUser>) {
  const syncFromStorage = authStore((state) => state.syncFromStorage);

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
