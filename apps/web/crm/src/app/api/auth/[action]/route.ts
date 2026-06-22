export const dynamic = 'force-dynamic';

import { createAuthProxyPostHandler } from '@ssoo/web-auth';
import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

export const POST = createAuthProxyPostHandler({
  createServerApiUrl,
  createServerApiProxyInit,
});
