import {
  createForbiddenStateChangingProxyRequestResponse,
  isValidStateChangingProxyRequest,
  type StateChangingProxyRequestValidationOptions,
} from './state-changing-proxy';

interface BackendSuccessResponse<T> {
  success: true;
  data: T;
}

interface BackendErrorResponse {
  success?: false;
  error?: { message?: string } | string;
  message?: string;
}

export interface ProxyCommonNotificationJsonOptions {
  createBackendUrl: (pathname: string) => string;
  createBackendInit: (request: Request, init?: RequestInit) => RequestInit;
  trustedOrigins?: StateChangingProxyRequestValidationOptions['trustedOrigins'];
}

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getBackendErrorMessage(
  responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null,
  fallbackMessage: string,
): string {
  if (!responseBody || responseBody.success === true) {
    return fallbackMessage;
  }

  return (
    typeof responseBody.error === 'string'
      ? responseBody.error
      : responseBody.error?.message
  ) || responseBody.message || fallbackMessage;
}

export async function proxyCommonNotificationJson<T>(
  request: Request,
  pathname: string,
  fallbackMessage: string,
  options: ProxyCommonNotificationJsonOptions,
  init?: RequestInit,
): Promise<Response> {
  const method = (init?.method ?? request.method).toUpperCase();
  if (
    STATE_CHANGING_METHODS.has(method)
    && !isValidStateChangingProxyRequest(request, options.trustedOrigins)
  ) {
    return createForbiddenStateChangingProxyRequestResponse();
  }

  const response = await fetch(
    options.createBackendUrl(pathname),
    options.createBackendInit(request, init),
  );
  const responseBody = await response.json().catch(() => null) as
    | BackendSuccessResponse<T>
    | BackendErrorResponse
    | null;

  if (!response.ok || !responseBody || responseBody.success !== true) {
    return Response.json(
      { error: getBackendErrorMessage(responseBody, fallbackMessage) },
      { status: response.status || 500 },
    );
  }

  return Response.json(responseBody.data);
}
