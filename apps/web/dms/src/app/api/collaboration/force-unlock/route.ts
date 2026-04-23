export const dynamic = 'force-dynamic';

import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

interface BackendSuccessResponse<T> {
  success: true;
  data: T;
}

interface BackendErrorResponse {
  success?: false;
  error?: { message?: string } | string;
  message?: string;
}

function getBackendErrorMessage(responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null): string {
  if (!responseBody || responseBody.success === true) {
    return '협업 강제 잠금 해제 처리 중 오류가 발생했습니다.';
  }
  return (typeof responseBody.error === 'string' ? responseBody.error : responseBody.error?.message) || responseBody.message || '협업 강제 잠금 해제 처리 중 오류가 발생했습니다.';
}

export async function POST(req: Request) {
  const body = await req.json();
  const response = await fetch(createServerApiUrl('/dms/collaboration/force-unlock'), createServerApiProxyInit(req, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));
  const responseBody = await response.json().catch(() => null) as BackendSuccessResponse<unknown> | BackendErrorResponse | null;
  if (!response.ok || !responseBody || responseBody.success !== true) {
    return Response.json({ error: getBackendErrorMessage(responseBody) }, { status: response.status || 500 });
  }
  return Response.json(responseBody.data);
}
