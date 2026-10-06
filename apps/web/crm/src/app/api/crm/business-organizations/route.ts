export const dynamic = 'force-dynamic';

import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

export async function GET(req: Request) {
  const response = await fetch(
    createServerApiUrl('/onboarding/business-organizations?service=crm'),
    createServerApiProxyInit(req, { method: 'GET' }),
  );
  return new Response(await response.text(), {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/json',
    },
  });
}
