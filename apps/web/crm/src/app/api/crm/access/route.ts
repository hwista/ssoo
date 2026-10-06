export const dynamic = 'force-dynamic';

import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

export async function GET(req: Request) {
  const response = await fetch(
    createServerApiUrl(`/crm/access/me${new URL(req.url).search}`),
    createServerApiProxyInit(req, { method: 'GET' }),
  );
  return new Response(await response.text(), {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/json',
    },
  });
}
