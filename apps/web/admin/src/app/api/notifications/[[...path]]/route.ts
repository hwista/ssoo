export const dynamic = 'force-dynamic';

import { createNotificationProxyRouteHandlers } from '@ssoo/web-auth';

import {
  createServerApiProxyInit,
  createServerApiUrl,
  proxySessionBackedStreamResponse,
} from '@/app/api/_shared/serverApiProxy';

const handlers = createNotificationProxyRouteHandlers({
  createBackendUrl: createServerApiUrl,
  createBackendInit: createServerApiProxyInit,
  proxySessionBackedStreamResponse,
});

export const GET = handlers.GET;
export const PUT = handlers.PUT;
