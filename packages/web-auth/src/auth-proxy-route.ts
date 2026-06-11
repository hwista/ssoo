import {
  createAuthProxyRouteResponse,
  createUnsupportedAuthProxyActionResponse,
  isSupportedAuthProxyAction,
} from './auth-proxy';

export interface AuthProxyRouteContext {
  params: Promise<{ action: string }>;
}

export interface CreateAuthProxyPostHandlerOptions {
  createServerApiUrl: (pathname: string) => string;
  createServerApiProxyInit: (request: Request, init?: RequestInit) => RequestInit;
}

export function createAuthProxyPostHandler({
  createServerApiUrl,
  createServerApiProxyInit,
}: CreateAuthProxyPostHandlerOptions) {
  return async function POST(req: Request, context: AuthProxyRouteContext) {
    const { action } = await context.params;
    if (!isSupportedAuthProxyAction(action)) {
      return createUnsupportedAuthProxyActionResponse();
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

    return createAuthProxyRouteResponse(action, response);
  };
}
