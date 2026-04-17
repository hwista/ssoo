/**
 * Ask API Route - RAG 기반 질문 답변 (스트리밍)
 * apps/server의 공용 DMS ask 파이프라인으로 프록시한다.
 */
export const dynamic = 'force-dynamic';

import type { AskRequest, AskResponse } from '@ssoo/types/dms';
import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

interface BackendSuccessResponse {
  success: true;
  data: AskResponse;
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
    return '서버 질문 처리 중 오류가 발생했습니다.';
  }

  return responseBody.error?.message || responseBody.message || '서버 질문 처리 중 오류가 발생했습니다.';
}

export async function POST(req: Request) {
  const body = await req.json();
  const payload: AskRequest = {
    query: typeof body?.query === 'string' ? body.query : undefined,
    messages: Array.isArray(body?.messages) ? body.messages : undefined,
    contextMode: body?.contextMode === 'deep'
      ? 'deep'
      : body?.contextMode === 'attachments-only'
        ? 'attachments-only'
        : 'doc',
    activeDocPath: typeof body?.activeDocPath === 'string' ? body.activeDocPath : undefined,
    templates: Array.isArray(body?.templates)
      ? body.templates.filter((template: unknown): template is { name: string; content: string } => (
          typeof template === 'object'
          && template !== null
          && typeof (template as Record<string, unknown>).name === 'string'
          && typeof (template as Record<string, unknown>).content === 'string'
        ))
      : undefined,
    stream: body?.stream !== false,
  };

  const response = await fetch(createServerApiUrl('/dms/ask'), createServerApiProxyInit(req, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  }));

  if (payload.stream !== false) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers),
    });
  }

  const responseBody = await response.json().catch(() => null) as BackendSuccessResponse | BackendErrorResponse | null;

  if (!response.ok || !responseBody || !('success' in responseBody) || responseBody.success !== true) {
    return Response.json(
      { error: getBackendErrorMessage(responseBody) },
      { status: response.status || 500 },
    );
  }

  return Response.json(responseBody.data);
}
