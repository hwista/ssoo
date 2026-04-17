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
  } | string;
  message?: string;
  details?: unknown;
}

function getBackendErrorMessage(responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null): string {
  if (!responseBody || responseBody.success === true) {
    return '서버 파일 처리 중 오류가 발생했습니다.';
  }

  return (
    (typeof responseBody.error === 'string' ? responseBody.error : responseBody.error?.message)
    || responseBody.message
    || '서버 파일 처리 중 오류가 발생했습니다.'
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const headerPath = req.headers.get('x-file-path');
  const queryPath = url.searchParams.get('path');
  const query = queryPath ? `?path=${encodeURIComponent(queryPath)}` : '';
  const response = await fetch(
    createServerApiUrl(`/dms/file${query}`),
    createServerApiProxyInit(req, {
      headers: headerPath ? { 'x-file-path': headerPath } : undefined,
    }),
  );
  const responseBody = await response.json().catch(() => null) as BackendSuccessResponse<unknown> | BackendErrorResponse | null;
  if (!response.ok || !responseBody || responseBody.success !== true) {
    return Response.json(
      {
        error: getBackendErrorMessage(responseBody),
        details: responseBody && responseBody.success !== true ? responseBody.details : undefined,
      },
      { status: response.status || 500 },
    );
  }

  return Response.json(responseBody.data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const response = await fetch(
    createServerApiUrl('/dms/file'),
    createServerApiProxyInit(req, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  const responseBody = await response.json().catch(() => null) as BackendSuccessResponse<unknown> | BackendErrorResponse | null;
  if (!response.ok || !responseBody || responseBody.success !== true) {
    return Response.json(
      {
        error: getBackendErrorMessage(responseBody),
        details: responseBody && responseBody.success !== true ? responseBody.details : undefined,
      },
      { status: response.status || 500 },
    );
  }

  return Response.json(responseBody.data);
}
