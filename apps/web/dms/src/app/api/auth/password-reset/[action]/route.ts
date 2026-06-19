export const dynamic = 'force-dynamic';

import { createPasswordResetProxyPostHandler } from '@ssoo/web-auth';
import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

export const POST = createPasswordResetProxyPostHandler({
  createServerApiUrl,
  createServerApiProxyInit,
});
