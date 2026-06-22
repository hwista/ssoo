import { useEffect } from 'react';
import type { AuthIdentity } from '@ssoo/types/common';
import type { StoreApi, UseBoundStore } from 'zustand';
import type { AuthStore } from './store';

export type UserScopeId = string | null;

export type UserScopeChangeListener = (
  /** 새 사용자 ID (로그아웃 시 null) */
  next: UserScopeId,
  /** 직전 사용자 ID (첫 로그인 시 null) */
  prev: UserScopeId,
) => void;

export interface AuthUserScopeLifecycle {
  getCurrentUserScopeId: () => UserScopeId;
  registerUserScopedReset: (listener: UserScopeChangeListener) => () => void;
  dispose: () => void;
}

export interface CreateAuthUserScopeLifecycleOptions<TUser extends AuthIdentity> {
  authStore: UseBoundStore<StoreApi<AuthStore<TUser>>>;
  logPrefix?: string;
}

export interface ClearableQueryClient {
  clear: () => void;
}

export interface UseUserScopeQueryCacheResetOptions {
  lifecycle: Pick<AuthUserScopeLifecycle, 'registerUserScopedReset'>;
  queryClient: ClearableQueryClient;
}

export const AUTH_TOKEN_BOUNDARY_PREV = '__auth-token-boundary__';

export function isUserScopeTransition(next: UserScopeId, prev: UserScopeId): boolean {
  return next !== prev;
}

export function shouldResetPersistedUserState(
  next: UserScopeId,
  ownerUserId: UserScopeId,
  hasUserScopedData: boolean,
): boolean {
  if (next === null) {
    return false;
  }

  if (ownerUserId === null) {
    return hasUserScopedData;
  }

  return ownerUserId !== next;
}

function emitUserChangeListener(
  listener: UserScopeChangeListener,
  next: UserScopeId,
  prev: UserScopeId,
  logPrefix: string,
): void {
  try {
    listener(next, prev);
  } catch (error) {
    if (typeof console !== 'undefined') {
      console.error(`${logPrefix} listener threw`, error);
    }
  }
}

export function createAuthUserScopeLifecycle<TUser extends AuthIdentity>({
  authStore,
  logPrefix = '[web-auth:user-scope]',
}: CreateAuthUserScopeLifecycleOptions<TUser>): AuthUserScopeLifecycle {
  const listeners = new Set<UserScopeChangeListener>();

  function getCurrentUserScopeId(): UserScopeId {
    return authStore.getState().user?.userId ?? null;
  }

  function getCurrentAccessToken(): string | null {
    return authStore.getState().accessToken ?? null;
  }

  let lastUserId: UserScopeId = getCurrentUserScopeId();
  let lastAccessToken: string | null = getCurrentAccessToken();

  const unsubscribe = authStore.subscribe((state) => {
    const next = state.user?.userId ?? null;
    const nextAccessToken = state.accessToken ?? null;
    const didTokenChange = nextAccessToken !== lastAccessToken;

    if (didTokenChange && next === null && next === lastUserId) {
      const prev = lastUserId ?? AUTH_TOKEN_BOUNDARY_PREV;
      lastAccessToken = nextAccessToken;
      listeners.forEach((fn) => emitUserChangeListener(fn, null, prev, logPrefix));
      return;
    }

    if (next === lastUserId) {
      lastAccessToken = nextAccessToken;
      return;
    }

    const prev = lastUserId;
    lastUserId = next;
    lastAccessToken = nextAccessToken;
    listeners.forEach((fn) => emitUserChangeListener(fn, next, prev, logPrefix));
  });

  return {
    getCurrentUserScopeId,
    registerUserScopedReset(listener: UserScopeChangeListener) {
      listeners.add(listener);
      if (lastUserId !== null) {
        emitUserChangeListener(listener, lastUserId, null, logPrefix);
      }
      return () => listeners.delete(listener);
    },
    dispose: unsubscribe,
  };
}

export function useUserScopeQueryCacheReset({
  lifecycle,
  queryClient,
}: UseUserScopeQueryCacheResetOptions): void {
  useEffect(() => lifecycle.registerUserScopedReset((next, prev) => {
    if (isUserScopeTransition(next, prev)) {
      queryClient.clear();
    }
  }), [lifecycle, queryClient]);
}
