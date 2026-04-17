/**
 * Search API Route - 시맨틱 문서 검색
 * pgvector 유사도 검색 + 키워드 폴백
 */
export const dynamic = 'force-dynamic';

import type { SearchRequest, SearchResponse } from '@ssoo/types/dms';
import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

interface BackendSuccessResponse {
  success: true;
  data: SearchResponse;
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
    return '서버 검색 처리 중 오류가 발생했습니다.';
  }

  return responseBody.error?.message || responseBody.message || '서버 검색 처리 중 오류가 발생했습니다.';
}

export async function POST(req: Request) {
  const body = await req.json();
  const payload: SearchRequest = {
    query: typeof body?.query === 'string' ? body.query : '',
    contextMode: body?.contextMode === 'deep' ? 'deep' : 'doc',
    activeDocPath: typeof body?.activeDocPath === 'string' ? body.activeDocPath : undefined,
  };

  const response = await fetch(createServerApiUrl('/dms/search'), createServerApiProxyInit(req, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }));

  const responseBody = await response.json().catch(() => null) as BackendSuccessResponse | BackendErrorResponse | null;

  if (!response.ok || !responseBody || !('success' in responseBody) || responseBody.success !== true) {
    return Response.json(
      { error: getBackendErrorMessage(responseBody) },
      { status: response.status || 500 },
    );
  }

  return Response.json(responseBody.data);
}
