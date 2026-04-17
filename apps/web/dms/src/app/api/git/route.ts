export const dynamic = 'force-dynamic';

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

function getBackendErrorMessage(responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null): string {
  if (!responseBody || responseBody.success === true) {
    return '서버 Git 처리 중 오류가 발생했습니다.';
  }

  return responseBody.error?.message || responseBody.message || '서버 Git 처리 중 오류가 발생했습니다.';
}

async function proxyJson<T>(request: Request, init?: RequestInit) {
  const response = await fetch(
    createServerApiUrl('/dms/git'),
    createServerApiProxyInit(request, init),
  );
  const responseBody = await response.json().catch(() => null) as BackendSuccessResponse<T> | BackendErrorResponse | null;

  if (!response.ok || !responseBody || responseBody.success !== true) {
    return Response.json(
      { error: getBackendErrorMessage(responseBody) },
      { status: response.status || 500 },
    );
  }

  return Response.json(responseBody.data);
}

export async function GET(req: Request) {
  return proxyJson(req);
}

export async function POST(req: Request) {
  const body = await req.json();
  return proxyJson(req, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}
