export const dynamic = 'force-dynamic';

import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

async function forwardResponse(response: Response) {
  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/json',
    },
  });
}

export async function POST(req: Request) {
  const response = await fetch(
    createServerApiUrl('/crm/reports/confirm'),
    createServerApiProxyInit(req, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: await req.text(),
    }),
  );

  return forwardResponse(response);
}
