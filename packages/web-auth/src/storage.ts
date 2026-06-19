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
  user: unknown;
  isAuthenticated: boolean;
  version: number;
}

export interface SharedAuthHeaderOptions {
  forceAuthorization?: boolean;
  skipAuth?: boolean;
}

let runtimeAccessToken: string | null = null;

interface SafeJsonStateStorage {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
}

function warnStorageRecovery(message: string, error: unknown): void {
  if (typeof console === 'undefined') {
    return;
  }

  console.warn(`[web-auth] ${message}`, error);
}

export function createSafeJsonStateStorage(getStorage: () => Storage): SafeJsonStateStorage {
  let storage: Storage | null | undefined;

  const resolveStorage = () => {
    if (storage !== undefined) {
      return storage;
    }

    if (typeof window === 'undefined') {
      storage = null;
      return storage;
    }

    try {
      storage = getStorage();
    } catch (error) {
      storage = null;
      warnStorageRecovery('브라우저 저장소에 접근하지 못해 인증 상태 복원을 건너뜁니다.', error);
    }

    return storage;
  };

  return {
    getItem: (name: string) => {
      const resolvedStorage = resolveStorage();
      if (!resolvedStorage) {
        return null;
      }

      let rawValue: string | null = null;
      try {
        rawValue = resolvedStorage.getItem(name);
      } catch (error) {
        warnStorageRecovery('인증 상태를 읽지 못해 저장된 세션을 무시합니다.', error);
        return null;
      }

      if (rawValue === null) {
        return null;
      }

      try {
        JSON.parse(rawValue);
        if (name !== SHARED_AUTH_STORAGE_KEY) {
          return rawValue;
        }

        const sanitizedValue = removePersistedTokens(rawValue);
        if (sanitizedValue !== rawValue) {
          resolvedStorage.setItem(name, sanitizedValue);
        }
        return sanitizedValue;
      } catch (error) {
        warnStorageRecovery('손상된 인증 상태를 제거하고 다시 초기화합니다.', error);
        try {
          resolvedStorage.removeItem(name);
        } catch (removeError) {
          warnStorageRecovery('손상된 인증 상태 제거에 실패했습니다.', removeError);
        }
        return null;
      }
    },
    setItem: (name: string, value: string) => {
      const resolvedStorage = resolveStorage();
      if (!resolvedStorage) {
        return;
      }

      try {
        const valueToStore = name === SHARED_AUTH_STORAGE_KEY ? removePersistedTokens(value) : value;
        resolvedStorage.setItem(name, valueToStore);
      } catch (error) {
        warnStorageRecovery('인증 상태를 저장하지 못했습니다.', error);
      }
    },
    removeItem: (name: string) => {
      const resolvedStorage = resolveStorage();
      if (!resolvedStorage) {
        return;
      }

      try {
        resolvedStorage.removeItem(name);
      } catch (error) {
        warnStorageRecovery('인증 상태를 제거하지 못했습니다.', error);
      }
    },
  };
}

function readPersistedAuthState(rawValue: string): PersistedAuthState | null {
  try {
    const parsed = JSON.parse(rawValue) as PersistedAuthState;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function removePersistedTokens(rawValue: string): string {
  const parsed = readPersistedAuthState(rawValue);
  if (!parsed?.state || typeof parsed.state !== 'object') {
    return rawValue;
  }

  const state = { ...parsed.state };
  const hadPersistedToken = 'accessToken' in state || 'refreshToken' in state;
  delete state.accessToken;
  delete state.refreshToken;

  if (!hadPersistedToken) {
    return rawValue;
  }

  return JSON.stringify({
    ...parsed,
    state,
  });
}

function normalizeSnapshot(state: PersistedAuthState | null): SharedAuthSnapshot | null {
  if (!state?.state || typeof state.state !== 'object') {
    return null;
  }

  return {
    accessToken: runtimeAccessToken,
    user: state.state.user ?? null,
    isAuthenticated: state.state.isAuthenticated === true || runtimeAccessToken !== null,
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
  if (!isBaseAuthIdentity(value)) {
    return null;
  }

  const candidate = value;
  return {
    userId: candidate.userId,
    loginId: candidate.loginId,
    userName: typeof candidate.userName === 'string' ? candidate.userName : undefined,
  };
}

export function readSharedAuthSnapshot(): SharedAuthSnapshot | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(SHARED_AUTH_STORAGE_KEY);
  if (!rawValue) {
    if (runtimeAccessToken) {
      return {
        accessToken: runtimeAccessToken,
        user: null,
        isAuthenticated: true,
        version: 0,
      };
    }

    return null;
  }

  const sanitizedValue = removePersistedTokens(rawValue);
  if (sanitizedValue !== rawValue) {
    window.localStorage.setItem(SHARED_AUTH_STORAGE_KEY, sanitizedValue);
  }

  return normalizeSnapshot(readPersistedAuthState(sanitizedValue));
}

export function getSharedAccessToken(): string | null {
  return runtimeAccessToken;
}

export function writeSharedAuthSnapshot(snapshot: SharedAuthSnapshot | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!snapshot) {
    runtimeAccessToken = null;
    window.localStorage.removeItem(SHARED_AUTH_STORAGE_KEY);
    dispatchSharedAuthChanged();
    return;
  }

  runtimeAccessToken = snapshot.accessToken;
  window.localStorage.setItem(
    SHARED_AUTH_STORAGE_KEY,
    JSON.stringify({
      state: {
        user: snapshot.user,
        isAuthenticated: snapshot.isAuthenticated,
      },
      version: snapshot.version,
    }),
  );
  dispatchSharedAuthChanged();
}

export function setSharedAuthSession(accessToken: string, user: unknown): void {
  const currentSnapshot = readSharedAuthSnapshot();

  writeSharedAuthSnapshot({
    accessToken,
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
