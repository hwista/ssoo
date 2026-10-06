export const dynamic = 'force-dynamic';

import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const templateKey = new URL(req.url).searchParams.get('templateKey');
  const query = templateKey ? `?${new URLSearchParams({ templateKey })}` : '';
  const response = await fetch(
    createServerApiUrl(`/crm/opportunities/${encodeURIComponent(id)}/contract-document-preview${query}`),
    createServerApiProxyInit(req, { method: 'GET' }),
  );
  return new Response(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
  });
}
