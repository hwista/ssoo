import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

interface BackendSuccessResponse<T> {
  success: true;
  data: T;
}

interface BackendErrorResponse {
  success?: false;
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
}

function getBackendErrorMessage(
  responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null,
  fallbackMessage: string,
): string {
  if (!responseBody || responseBody.success === true) {
    return fallbackMessage;
  }

  return responseBody.error?.message || responseBody.message || fallbackMessage;
}

export async function proxyAccessJson<T>(
  request: Request,
  pathname: string,
  fallbackMessage: string,
  init?: RequestInit,
) {
  const response = await fetch(
    createServerApiUrl(pathname),
    createServerApiProxyInit(request, init),
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
