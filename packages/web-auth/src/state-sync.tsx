'use client';

import { useEffect } from 'react';
import type { AuthIdentity } from '@ssoo/types/common';
import type { StoreApi, UseBoundStore } from 'zustand';
import { SHARED_AUTH_CHANGE_EVENT } from './storage';
import type { AuthStore } from './store';

export const SHARED_AUTH_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const SHARED_AUTH_LAST_ACTIVITY_KEY = 'ssoo-auth-last-activity';
const ACTIVITY_WRITE_THROTTLE_MS = 1000;
const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart', 'scroll'];

export interface SharedAuthStateSyncProps<TUser extends AuthIdentity = AuthIdentity> {
  authStore: UseBoundStore<StoreApi<AuthStore<TUser>>>;
}

export function SharedAuthStateSync<TUser extends AuthIdentity = AuthIdentity>({
  authStore,
}: SharedAuthStateSyncProps<TUser>) {
  const syncFromStorage = authStore((state) => state.syncFromStorage);
  const isAuthenticated = authStore((state) => state.isAuthenticated);
  const logout = authStore((state) => state.logout);

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

  useEffect(() => {
    if (!isAuthenticated) {
      window.localStorage.removeItem(SHARED_AUTH_LAST_ACTIVITY_KEY);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let lastWrittenAt = 0;

    const readLastActivity = () => {
      const parsed = Number(window.localStorage.getItem(SHARED_AUTH_LAST_ACTIVITY_KEY));
      return Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now();
    };

    const schedule = () => {
      if (timeoutId !== null) clearTimeout(timeoutId);
      const remaining = Math.max(0, SHARED_AUTH_IDLE_TIMEOUT_MS - (Date.now() - readLastActivity()));
      timeoutId = setTimeout(() => {
        // The store exposes a retryable session notice on failure. An idle
        // callback has no caller to handle a rejected logout promise.
        void logout().catch(() => undefined);
      }, remaining);
    };

    const recordActivity = () => {
      const now = Date.now();
      if (now - lastWrittenAt >= ACTIVITY_WRITE_THROTTLE_MS) {
        lastWrittenAt = now;
        window.localStorage.setItem(SHARED_AUTH_LAST_ACTIVITY_KEY, String(now));
      }
      schedule();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === SHARED_AUTH_LAST_ACTIVITY_KEY) schedule();
    };

    if (!window.localStorage.getItem(SHARED_AUTH_LAST_ACTIVITY_KEY)) {
      window.localStorage.setItem(SHARED_AUTH_LAST_ACTIVITY_KEY, String(Date.now()));
    }
    schedule();
    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, recordActivity, { passive: true });
    }
    window.addEventListener('storage', handleStorage);

    return () => {
      if (timeoutId !== null) clearTimeout(timeoutId);
      for (const eventName of ACTIVITY_EVENTS) window.removeEventListener(eventName, recordActivity);
      window.removeEventListener('storage', handleStorage);
    };
  }, [isAuthenticated, logout]);

  return null;
}
