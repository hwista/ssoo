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
    return '서버 콘텐츠 처리 중 오류가 발생했습니다.';
  }

  return (
    (typeof responseBody.error === 'string' ? responseBody.error : responseBody.error?.message)
    || responseBody.message
    || '서버 콘텐츠 처리 중 오류가 발생했습니다.'
  );
}

async function proxyJson<T>(request: Request, pathname: string, init?: RequestInit) {
  const response = await fetch(
    createServerApiUrl(pathname),
    createServerApiProxyInit(request, init),
  );
  const responseBody = await response.json().catch(() => null) as BackendSuccessResponse<T> | BackendErrorResponse | null;

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

export async function GET(req: Request) {
  const query = new URL(req.url).searchParams.toString();
  const pathname = query ? `/dms/content?${query}` : '/dms/content';
  return proxyJson(req, pathname);
}

export async function POST(req: Request) {
  const body = await req.json();
  return proxyJson(req, '/dms/content', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

export async function DELETE(req: Request) {
  const body = await req.json();
  return proxyJson(req, '/dms/content', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}
