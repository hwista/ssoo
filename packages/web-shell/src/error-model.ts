export type SsooErrorKind =
  | 'validation' | 'auth-required' | 'forbidden' | 'not-found' | 'conflict'
  | 'rate-limited' | 'network' | 'unavailable' | 'unexpected';

export interface SsooErrorMetadata {
  status?: number;
  code?: string;
  details?: unknown;
  retryAfterSeconds?: number;
  requestId?: string;
}

export interface SsooResolvedError extends SsooErrorMetadata {
  kind: SsooErrorKind;
  title: string;
  description: string;
  retryable: boolean;
}

const ERROR_COPY: Record<SsooErrorKind, { title: string; description: string; retryable: boolean }> = {
  validation: { title: '입력 내용을 확인해 주세요', description: '안내된 항목을 수정한 후 다시 시도해 주세요.', retryable: false },
  'auth-required': { title: '로그인이 필요합니다', description: '인증이 만료되었거나 로그인하지 않은 상태입니다. 로그인 후 다시 이용해 주세요.', retryable: false },
  forbidden: { title: '접근 권한이 없습니다', description: '현재 계정으로 이용할 수 없는 기능입니다. 이용 가능한 화면으로 이동하거나 관리자에게 권한을 요청해 주세요.', retryable: false },
  'not-found': { title: '요청한 대상을 찾을 수 없습니다', description: '주소가 올바르지 않거나 대상이 이동 또는 삭제되었을 수 있습니다.', retryable: false },
  conflict: { title: '변경 사항을 확인해 주세요', description: '다른 변경 사항이나 현재 처리 상태와 충돌합니다. 입력 내용을 유지한 채 최신 상태를 확인해 주세요.', retryable: false },
  'rate-limited': { title: '요청이 잠시 제한되었습니다', description: '잠시 기다린 후 다시 시도해 주세요.', retryable: true },
  network: { title: '서버에 연결하지 못했습니다', description: '연결 상태를 확인한 후 다시 시도해 주세요. 다른 화면으로 이동할 수도 있습니다.', retryable: true },
  unavailable: { title: '일시적으로 이용할 수 없습니다', description: '서버에서 요청을 처리하지 못했습니다. 잠시 후 다시 시도하거나 다른 화면으로 이동해 주세요.', retryable: true },
  unexpected: { title: '요청을 처리하지 못했습니다', description: '다시 시도하거나 다른 화면으로 이동해 주세요. 문제가 계속되면 관리자에게 알려 주세요.', retryable: true },
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : undefined;
}

/** Accepts shared API errors, DMS request errors, and backend envelopes without losing domain details. */
export function readSsooErrorMetadata(error: unknown): SsooErrorMetadata {
  const record = asRecord(error);
  const response = asRecord(record?.response);
  const body = asRecord(response?.data) ?? record;
  const nested = asRecord(body?.error);
  const status = record?.status ?? record?.statusCode ?? response?.status ?? nested?.statusCode;
  const code = nested?.code ?? body?.code ?? record?.code;
  const retryAfter = record?.retryAfterSeconds ?? body?.retryAfterSeconds ?? nested?.retryAfterSeconds;
  const requestId = record?.requestId ?? body?.requestId ?? nested?.requestId ?? record?.digest;
  return {
    status: typeof status === 'number' ? status : undefined,
    code: typeof code === 'string' ? code : undefined,
    details: record?.details ?? body?.details ?? nested?.details,
    retryAfterSeconds: typeof retryAfter === 'number' && Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter : undefined,
    requestId: typeof requestId === 'string' && /^[\w.-]{1,100}$/.test(requestId) ? requestId : undefined,
  };
}

export function resolveSsooError(error?: unknown, kind?: SsooErrorKind): SsooResolvedError {
  const metadata = readSsooErrorMetadata(error);
  const { status, code } = metadata;
  const resolvedKind = kind ?? (
    status === 401 ? 'auth-required'
      : status === 403 ? 'forbidden'
        : status === 404 || status === 410 ? 'not-found'
          : status === 409 || status === 412 || status === 423 ? 'conflict'
            : status === 429 ? 'rate-limited'
              : status === 400 || status === 413 || status === 415 || status === 422 ? 'validation'
                : status !== undefined && status >= 500 ? 'unavailable'
                  : status === 0 || status === 408 || ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT', 'NETWORK_ERROR'].includes(code ?? '') ? 'network'
                    : 'unexpected'
  );
  return { ...metadata, kind: resolvedKind, ...ERROR_COPY[resolvedKind] };
}

/** App-owned messages are retained; raw server documents, stacks and credentials are never shown. */
export function getSsooErrorMessage(error: unknown, fallback?: string): string {
  const resolved = resolveSsooError(error);
  const record = asRecord(error);
  const nested = asRecord(record?.error);
  const value = typeof error === 'string' ? error : record?.message ?? nested?.message ?? record?.error;
  if (typeof value !== 'string' || !value.trim()) return fallback ?? resolved.description;
  if (resolved.status !== undefined && resolved.status >= 500) return fallback ?? resolved.description;
  if (/<(?:!doctype|html|body|script)\b|\bat\s+\S+\s*\([^)]*:\d+:\d+\)|\b(?:SELECT|INSERT INTO|UPDATE)\s|(?:Bearer\s|password\s*[:=]|accessToken\s*[:=])/i.test(value)) {
    return fallback ?? resolved.description;
  }
  if (/^(?:HTTP\s+5\d\d\b|Internal server error|Request failed with status code 5\d\d)/i.test(value)) return fallback ?? ERROR_COPY.unavailable.description;
  if (/^(?:Failed to fetch|Network Error|fetch failed|Load failed)$/i.test(value.trim())) return fallback ?? ERROR_COPY.network.description;
  return value.trim();
}

export function parseSsooRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;
  const seconds = /^\d+$/.test(value.trim()) ? Number(value) : (Date.parse(value) - now) / 1000;
  return Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds)) : undefined;
}

export function isSafeSsooRecoveryHref(href: string): boolean {
  if (/[\u0000-\u0020\\]/.test(href)) return false;
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  try {
    const url = new URL(href);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}
