export const dynamic = 'force-dynamic';

import { createAuthProxyPostHandler } from '@ssoo/web-auth';
import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

export const POST = createAuthProxyPostHandler({
  createServerApiUrl,
  createServerApiProxyInit: (request, init = {}) => {
    const headers = new Headers(init.headers);
    headers.set('X-SSOO-App', 'crm');
    return createServerApiProxyInit(request, {
      ...init,
      headers,
    });
  },
});
