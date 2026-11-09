export const dynamic = 'force-dynamic';

import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const response = await fetch(
    createServerApiUrl(`/codes${incoming.search}`),
    createServerApiProxyInit(request, { method: 'GET' }),
  );
  return new Response(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
  });
}

export async function POST(request: Request) {
  const response = await fetch(createServerApiUrl('/codes'), createServerApiProxyInit(request, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: await request.text() }));
  return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': 'application/json' } });
}
