import {
  type AuthProxyResponseAction,
  createAuthProxyRouteResponse,
  createForbiddenAuthProxyRequestResponse,
  createUnsupportedAuthProxyActionResponse,
  isSupportedAuthProxyAction,
} from './auth-proxy';
import { isValidStateChangingProxyRequest } from './state-changing-proxy';

export interface AuthProxyRouteContext {
  params: Promise<{ action: string }>;
}

export interface CreateAuthProxyPostHandlerOptions {
  createServerApiUrl: (pathname: string) => string;
  createServerApiProxyInit: (request: Request, init?: RequestInit) => RequestInit;
  trustedOrigins?: readonly string[] | (() => readonly string[]);
}

export interface PasswordResetProxyRouteContext {
  params: Promise<{ action: string }>;
}

export type PasswordResetProxyAction = 'request' | 'confirm';

const PASSWORD_RESET_PROXY_ACTIONS = new Set<PasswordResetProxyAction>([
  'request',
  'confirm',
]);

function isSupportedPasswordResetProxyAction(action: string): action is PasswordResetProxyAction {
  return PASSWORD_RESET_PROXY_ACTIONS.has(action as PasswordResetProxyAction);
}

async function forwardAuthProxyPost(
  request: Request,
  {
    createServerApiUrl,
    createServerApiProxyInit,
  }: Pick<CreateAuthProxyPostHandlerOptions, 'createServerApiUrl' | 'createServerApiProxyInit'>,
  backendPath: string,
  responseAction: AuthProxyResponseAction,
): Promise<Response> {
  const rawBody = await request.text();
  const response = await fetch(
    createServerApiUrl(backendPath),
    createServerApiProxyInit(request, {
      method: 'POST',
      headers: rawBody
        ? {
            'Content-Type': request.headers.get('content-type') || 'application/json',
          }
        : undefined,
      body: rawBody || undefined,
    }),
  );

  return createAuthProxyRouteResponse(responseAction, response);
}

export function createAuthProxyPostHandler({
  createServerApiUrl,
  createServerApiProxyInit,
  trustedOrigins,
}: CreateAuthProxyPostHandlerOptions) {
  return async function POST(req: Request, context: AuthProxyRouteContext) {
    const { action } = await context.params;
    if (!isSupportedAuthProxyAction(action)) {
      return createUnsupportedAuthProxyActionResponse();
    }

    if (!isValidStateChangingProxyRequest(req, trustedOrigins)) {
      return createForbiddenAuthProxyRequestResponse();
    }

    return forwardAuthProxyPost(
      req,
      { createServerApiUrl, createServerApiProxyInit },
      `/auth/${action}`,
      action,
    );
  };
}

export function createPasswordResetProxyPostHandler({
  createServerApiUrl,
  createServerApiProxyInit,
  trustedOrigins,
}: CreateAuthProxyPostHandlerOptions) {
  return async function POST(req: Request, context: PasswordResetProxyRouteContext) {
    const { action } = await context.params;
    if (!isSupportedPasswordResetProxyAction(action)) {
      return createUnsupportedAuthProxyActionResponse();
    }

    if (!isValidStateChangingProxyRequest(req, trustedOrigins)) {
      return createForbiddenAuthProxyRequestResponse();
    }

    return forwardAuthProxyPost(
      req,
      { createServerApiUrl, createServerApiProxyInit },
      `/auth/password-reset/${action}`,
      `password-reset/${action}`,
    );
  };
}
