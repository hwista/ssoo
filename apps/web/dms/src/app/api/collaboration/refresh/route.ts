export const dynamic = 'force-dynamic';

import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

interface BackendSuccessResponse<T> { success: true; data: T; }
interface BackendErrorResponse { success?: false; error?: { message?: string } | string; message?: string; }

function getBackendErrorMessage(responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null, fallback: string): string {
  if (!responseBody || responseBody.success === true) return fallback;
  return (typeof responseBody.error === 'string' ? responseBody.error : responseBody.error?.message) || responseBody.message || fallback;
}

async function proxyPost(req: Request, pathname: string, fallback: string) {
  const body = await req.json();
  const response = await fetch(createServerApiUrl(pathname), createServerApiProxyInit(req, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
  const responseBody = await response.json().catch(() => null) as BackendSuccessResponse<unknown> | BackendErrorResponse | null;
  if (!response.ok || !responseBody || responseBody.success !== true) {
    return Response.json({ error: getBackendErrorMessage(responseBody, fallback) }, { status: response.status || 500 });
  }
  return Response.json(responseBody.data);
}

export async function POST(req: Request) {
  return proxyPost(req, '/dms/collaboration/refresh', '협업 상태 refresh 처리 중 오류가 발생했습니다.');
}
