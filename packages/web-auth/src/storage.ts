import type { AuthIdentity } from '@ssoo/types/common';

export const SHARED_AUTH_STORAGE_KEY = 'ssoo-auth';
export const SHARED_AUTH_CHANGE_EVENT = 'ssoo-auth-changed';

interface PersistedAuthState {
  state?: {
    accessToken?: string | null;
    refreshToken?: string | null;
    user?: unknown;
    isAuthenticated?: boolean;
  };
  version?: number;
}

export interface SharedAuthSnapshot {
  accessToken: string | null;
  refreshToken: string | null;
  user: unknown;
  isAuthenticated: boolean;
  version: number;
}

export interface SharedAuthHeaderOptions {
  forceAuthorization?: boolean;
  skipAuth?: boolean;
}

function readPersistedAuthState(rawValue: string): PersistedAuthState | null {
  try {
    const parsed = JSON.parse(rawValue) as PersistedAuthState;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeSnapshot(state: PersistedAuthState | null): SharedAuthSnapshot | null {
  if (!state?.state || typeof state.state !== 'object') {
    return null;
  }

  const accessToken = isNonEmptyString(state.state.accessToken) ? state.state.accessToken : null;
  const refreshToken = isNonEmptyString(state.state.refreshToken) ? state.state.refreshToken : null;

  return {
    accessToken,
    refreshToken,
    user: state.state.user ?? null,
    isAuthenticated: state.state.isAuthenticated === true || accessToken !== null || refreshToken !== null,
    version: typeof state.version === 'number' ? state.version : 0,
  };
}

function dispatchSharedAuthChanged(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(SHARED_AUTH_CHANGE_EVENT));
}

export function isBaseAuthIdentity(value: unknown): value is AuthIdentity {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<AuthIdentity>;
  return (
    typeof candidate.userId === 'string'
    && typeof candidate.loginId === 'string'
  );
}

export function toBaseAuthIdentity(value: unknown): AuthIdentity | null {
  return isBaseAuthIdentity(value) ? value : null;
}

export function readSharedAuthSnapshot(): SharedAuthSnapshot | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(SHARED_AUTH_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  return normalizeSnapshot(readPersistedAuthState(rawValue));
}

export function getSharedAccessToken(): string | null {
  return readSharedAuthSnapshot()?.accessToken ?? null;
}

export function getSharedRefreshToken(): string | null {
  return readSharedAuthSnapshot()?.refreshToken ?? null;
}

export function writeSharedAuthSnapshot(snapshot: SharedAuthSnapshot | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!snapshot) {
    window.localStorage.removeItem(SHARED_AUTH_STORAGE_KEY);
    dispatchSharedAuthChanged();
    return;
  }

  window.localStorage.setItem(
    SHARED_AUTH_STORAGE_KEY,
    JSON.stringify({
      state: {
        accessToken: snapshot.accessToken,
        refreshToken: snapshot.refreshToken,
        user: snapshot.user,
        isAuthenticated: snapshot.isAuthenticated,
      },
      version: snapshot.version,
    }),
  );
  dispatchSharedAuthChanged();
}

export function setSharedAuthTokens(accessToken: string, refreshToken: string): void {
  const currentSnapshot = readSharedAuthSnapshot();

  writeSharedAuthSnapshot({
    accessToken,
    refreshToken,
    user: currentSnapshot?.user ?? null,
    isAuthenticated: true,
    version: currentSnapshot?.version ?? 0,
  });
}

export function setSharedAuthSession(accessToken: string, user: unknown): void {
  const currentSnapshot = readSharedAuthSnapshot();

  writeSharedAuthSnapshot({
    accessToken,
    refreshToken: null,
    user,
    isAuthenticated: true,
    version: currentSnapshot?.version ?? 0,
  });
}

export function clearSharedAuthState(): void {
  writeSharedAuthSnapshot(null);
}

export function applySharedAuthHeaders(
  headers: HeadersInit = {},
  options: SharedAuthHeaderOptions = {},
): Headers {
  const nextHeaders = new Headers(headers);

  if (options.skipAuth) {
    nextHeaders.delete('Authorization');
    return nextHeaders;
  }

  if (!options.forceAuthorization && nextHeaders.has('Authorization')) {
    return nextHeaders;
  }

  const accessToken = getSharedAccessToken();
  if (!accessToken) {
    nextHeaders.delete('Authorization');
    return nextHeaders;
  }

  nextHeaders.set('Authorization', `Bearer ${accessToken}`);
  return nextHeaders;
}
