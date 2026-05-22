export const dynamic = 'force-dynamic';

import type { SearchInsightsResponse } from '@ssoo/types/dms';
import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

interface BackendSuccessResponse {
  success: true;
  data: SearchInsightsResponse;
}

interface BackendErrorResponse {
  success?: false;
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
}

function getBackendErrorMessage(responseBody: BackendSuccessResponse | BackendErrorResponse | null): string {
  if (!responseBody || responseBody.success === true) {
    return '검색 기록 조회 중 오류가 발생했습니다.';
  }

  return responseBody.error?.message || responseBody.message || '검색 기록 조회 중 오류가 발생했습니다.';
}

export async function GET(req: Request) {
  const query = new URL(req.url).searchParams.toString();
  const pathname = query ? `/dms/search/insights?${query}` : '/dms/search/insights';
  const response = await fetch(createServerApiUrl(pathname), createServerApiProxyInit(req));
  const responseBody = await response.json().catch(() => null) as BackendSuccessResponse | BackendErrorResponse | null;

  if (!response.ok || !responseBody || responseBody.success !== true) {
    return Response.json(
      { error: getBackendErrorMessage(responseBody) },
      { status: response.status || 500 },
    );
  }

  return Response.json(responseBody.data);
}
