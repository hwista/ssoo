export const dynamic = 'force-dynamic';

import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

interface RouteContext {
  params: Promise<{ action: string }>;
}

interface BackendAuthResponse {
  success?: boolean;
  error?: {
    message?: string;
  };
  message?: string;
}

const AUTH_ACTIONS = new Set(['login', 'refresh', 'logout', 'me', 'session']);

function getDefaultErrorMessage(action: string): string {
  switch (action) {
    case 'login':
      return '로그인 처리 중 오류가 발생했습니다.';
    case 'refresh':
      return '토큰 갱신 중 오류가 발생했습니다.';
    case 'logout':
      return '로그아웃 처리 중 오류가 발생했습니다.';
    case 'me':
      return '사용자 정보 조회 중 오류가 발생했습니다.';
    case 'session':
      return '세션 복원 중 오류가 발생했습니다.';
    default:
      return '인증 처리 중 오류가 발생했습니다.';
  }
}

function createProxyResponseHeaders(response: Response): Headers {
  const headers = new Headers();
  const setCookie = response.headers.get('set-cookie');

  if (setCookie) {
    headers.append('set-cookie', setCookie);
  }

  return headers;
}

function createFallbackErrorResponse(action: string, response: Response) {
  return Response.json(
    {
      success: false,
      error: {
        message: getDefaultErrorMessage(action),
      },
    },
    {
      status: response.status || 500,
      headers: createProxyResponseHeaders(response),
    },
  );
}

export async function POST(req: Request, context: RouteContext) {
  const { action } = await context.params;
  if (!AUTH_ACTIONS.has(action)) {
    return Response.json(
      {
        success: false,
        error: {
          message: '지원하지 않는 인증 작업입니다.',
        },
      },
      { status: 404 },
    );
  }

  const rawBody = await req.text();
  const response = await fetch(
    createServerApiUrl(`/auth/${action}`),
    createServerApiProxyInit(req, {
      method: 'POST',
      headers: rawBody
        ? {
            'Content-Type': req.headers.get('content-type') || 'application/json',
          }
        : undefined,
      body: rawBody || undefined,
    }),
  );
  const responseBody = await response.json().catch(() => null) as BackendAuthResponse | null;

  if (!responseBody) {
    return createFallbackErrorResponse(action, response);
  }

  return Response.json(responseBody, {
    status: response.status,
    headers: createProxyResponseHeaders(response),
  });
}
