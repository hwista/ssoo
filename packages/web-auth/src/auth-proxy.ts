export type AuthProxyAction = 'login' | 'refresh' | 'logout' | 'me' | 'session';

interface BackendSuccessResponse<T> {
  success: true;
  data: T;
}

interface BackendErrorResponse {
  success?: false;
  error?: {
    message?: string;
  };
  message?: string;
}

const AUTH_PROXY_ACTIONS = new Set<AuthProxyAction>([
  'login',
  'refresh',
  'logout',
  'me',
  'session',
]);

function getDefaultErrorMessage(action: AuthProxyAction): string {
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

function getBackendErrorMessage(
  action: AuthProxyAction,
  responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null,
): string {
  if (!responseBody || responseBody.success === true) {
    return getDefaultErrorMessage(action);
  }

  return responseBody.error?.message || responseBody.message || getDefaultErrorMessage(action);
}

export function isSupportedAuthProxyAction(action: string): action is AuthProxyAction {
  return AUTH_PROXY_ACTIONS.has(action as AuthProxyAction);
}

export function createUnsupportedAuthProxyActionResponse(): Response {
  return Response.json({ error: '지원하지 않는 인증 작업입니다.' }, { status: 404 });
}

export async function createAuthProxyRouteResponse(
  action: AuthProxyAction,
  response: Response,
): Promise<Response> {
  const responseBody = await response.json().catch(() => null) as
    | BackendSuccessResponse<unknown>
    | BackendErrorResponse
    | null;

  if (!response.ok || !responseBody || responseBody.success !== true) {
    return Response.json(
      { error: getBackendErrorMessage(action, responseBody) },
      {
        status: response.status || 500,
        headers: createProxyResponseHeaders(response),
      },
    );
  }

  return Response.json(responseBody.data, {
    status: response.status,
    headers: createProxyResponseHeaders(response),
  });
}
