export const dynamic = 'force-dynamic';

import {
  createAuthProxyRouteResponse,
  createUnsupportedAuthProxyActionResponse,
  isSupportedAuthProxyAction,
} from '@ssoo/web-auth';
import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

interface RouteContext {
  params: Promise<{ action: string }>;
}

export async function POST(req: Request, context: RouteContext) {
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
}
