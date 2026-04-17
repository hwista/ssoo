export const dynamic = 'force-dynamic';

import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

interface RouteContext {
  params: Promise<{ id: string }>;
}

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
    return '수집 작업 승인 중 오류가 발생했습니다.';
  }

  return responseBody.error?.message || responseBody.message || '수집 작업 승인 중 오류가 발생했습니다.';
}

export async function POST(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const response = await fetch(
    createServerApiUrl(`/dms/ingest/jobs/${encodeURIComponent(id)}/confirm`),
    createServerApiProxyInit(_req, {
      method: 'POST',
    }),
  );
  const responseBody = await response.json().catch(() => null) as BackendSuccessResponse<unknown> | BackendErrorResponse | null;
  if (!response.ok || !responseBody || responseBody.success !== true) {
    return Response.json({ error: getBackendErrorMessage(responseBody) }, { status: response.status || 500 });
  }

  return Response.json(responseBody.data);
}
