export const dynamic = 'force-dynamic';

import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

async function forwardResponse(response: Response) {
  return new Response(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await fetch(
    createServerApiUrl(`/crm/business-plan/plans/${encodeURIComponent(id)}/rows`),
    createServerApiProxyInit(req, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: await req.text(),
    }),
  );
  return forwardResponse(response);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await fetch(
    createServerApiUrl(`/crm/business-plan/plans/${encodeURIComponent(id)}/rows`),
    createServerApiProxyInit(req, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: await req.text(),
    }),
  );
  return forwardResponse(response);
}
