export const dynamic = 'force-dynamic';

import {
  createServerApiProxyInit,
  createServerApiUrl,
  proxySessionBackedBinaryResponse,
} from '@/app/api/_shared/serverApiProxy';

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
  return proxySessionBackedBinaryResponse(req, pathname);
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
