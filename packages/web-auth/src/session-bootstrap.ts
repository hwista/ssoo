import type { AuthIdentity } from '@ssoo/types/common';
import { createAuthApiAdapter, type CreateAuthApiAdapterOptions } from './auth-api';
import { clearSharedAuthState, setSharedAuthSession } from './storage';

const DEFAULT_SESSION_RESTORE_ERROR = '세션 복원 중 오류가 발생했습니다.';
const INVALID_SESSION_PAYLOAD_ERROR = '세션 복원 응답 형식이 올바르지 않습니다.';

export interface RestoreSharedAuthSessionSuccess {
  success: true;
  accessToken: string;
  user: AuthIdentity | null;
}

export interface RestoreSharedAuthSessionFailure {
  success: false;
  error: string;
  status?: number;
  clearedAuth: boolean;
  reason: 'unauthorized' | 'transient' | 'invalid-payload';
}

export type RestoreSharedAuthSessionResult =
  | RestoreSharedAuthSessionSuccess
  | RestoreSharedAuthSessionFailure;

type ResolvedRestoreOptions = Required<CreateAuthApiAdapterOptions>;

const restorePromises = new Map<string, Promise<RestoreSharedAuthSessionResult>>();

function resolveRestoreOptions(
  options: CreateAuthApiAdapterOptions = {},
): ResolvedRestoreOptions {
  return {
    basePath: options.basePath ?? '/api/auth',
    credentials: options.credentials ?? 'same-origin',
    fetchImpl: options.fetchImpl ?? fetch,
  };
}

function getRestorePromiseKey(options: ResolvedRestoreOptions): string {
  return `${options.basePath}::${options.credentials}`;
}

function createFailureResult(
  result: {
    error?: string;
    message?: string;
    status?: number;
  },
  fallback: RestoreSharedAuthSessionFailure['reason'],
): RestoreSharedAuthSessionFailure {
  if (fallback === 'invalid-payload') {
    clearSharedAuthState();
    return {
      success: false,
      error: INVALID_SESSION_PAYLOAD_ERROR,
      clearedAuth: true,
      reason: fallback,
    };
  }

  const status = result.status;
  const error = result.error || result.message || DEFAULT_SESSION_RESTORE_ERROR;

  if (status === 401 || status === 403) {
    clearSharedAuthState();
    return {
      success: false,
      error,
      status,
      clearedAuth: true,
      reason: 'unauthorized',
    };
  }

  return {
    success: false,
    error,
    status,
    clearedAuth: false,
    reason: 'transient',
  };
}

export async function restoreSharedAuthSession(
  options: CreateAuthApiAdapterOptions = {},
): Promise<RestoreSharedAuthSessionResult> {
  const resolvedOptions = resolveRestoreOptions(options);
  const promiseKey = getRestorePromiseKey(resolvedOptions);
  const existingPromise = restorePromises.get(promiseKey);

  if (existingPromise) {
    return existingPromise;
  }

  const restorePromise = (async (): Promise<RestoreSharedAuthSessionResult> => {
    const authApi = createAuthApiAdapter<AuthIdentity>(resolvedOptions);
    const restored = await authApi.restoreSession();

    if (!restored.success || !restored.data) {
      return createFailureResult(restored, 'transient');
    }

    if (typeof restored.data.accessToken !== 'string') {
      return createFailureResult({}, 'invalid-payload');
    }

    setSharedAuthSession(restored.data.accessToken, restored.data.user ?? null);

    return {
      success: true,
      accessToken: restored.data.accessToken,
      user: restored.data.user ?? null,
    };
  })();

  restorePromises.set(promiseKey, restorePromise);

  try {
    return await restorePromise;
  } finally {
    restorePromises.delete(promiseKey);
  }
}
