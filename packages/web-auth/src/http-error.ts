import { getSsooErrorMessage, parseSsooRetryAfter, readSsooErrorMetadata } from '@ssoo/web-shell';
import { SharedApiError } from './axios-api-client';

/** Preserve response metadata before a workspace reduces an error to user-facing text. */
export function createSharedHttpError(response: Response, payload: unknown, fallback?: string): SharedApiError {
  const status = response.ok ? 502 : response.status;
  const bodyMetadata = readSsooErrorMetadata(payload);
  const metadata = {
    ...bodyMetadata,
    retryAfterSeconds: parseSsooRetryAfter(response.headers.get('retry-after')) ?? bodyMetadata.retryAfterSeconds,
  };
  const message = getSsooErrorMessage(payload, fallback);
  return new SharedApiError(getSsooErrorMessage({ message, status }), status, metadata);
}
