export const dynamic = 'force-dynamic';

import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

interface BackendSuccessResponse<T> {
  success: true;
  data: T;
}

interface BackendErrorResponse {
  success?: false;
  error?: { message?: string };
  message?: string;
}

function getBackendErrorMessage(responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null): string {
  if (!responseBody || responseBody.success === true) {
    return '열기 처리 중 오류가 발생했습니다.';
  }

  return responseBody.error?.message || responseBody.message || '열기 처리 중 오류가 발생했습니다.';
}

export async function GET(req: Request) {
  const query = new URL(req.url).searchParams.toString();
  const pathname = query ? `/dms/storage/open?${query}` : '/dms/storage/open';
  const response = await fetch(createServerApiUrl(pathname), createServerApiProxyInit(req));
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const responseBody = await response.json().catch(() => null) as BackendSuccessResponse<unknown> | BackendErrorResponse | unknown;
    if (response.ok && responseBody && typeof responseBody === 'object' && 'success' in responseBody) {
      const typedBody = responseBody as BackendSuccessResponse<unknown> | BackendErrorResponse;
      if (typedBody.success === true) {
        return Response.json(typedBody.data);
      }

      return Response.json({ error: getBackendErrorMessage(typedBody) }, { status: response.status || 500 });
    }

    return Response.json(responseBody, { status: response.status, headers: new Headers(response.headers) });
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const response = await fetch(
    createServerApiUrl('/dms/storage/open'),
    createServerApiProxyInit(req, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  const responseBody = await response.json().catch(() => null) as BackendSuccessResponse<unknown> | BackendErrorResponse | null;
  if (!response.ok || !responseBody || responseBody.success !== true) {
    return Response.json({ error: getBackendErrorMessage(responseBody) }, { status: response.status || 500 });
  }

  return Response.json(responseBody.data);
}
