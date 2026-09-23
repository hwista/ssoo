export const dynamic = 'force-dynamic';
import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

async function forward(req: Request, { params }: { params: Promise<{ segments: string[] }> }) {
  const { segments } = await params;
  const path = segments.map(encodeURIComponent).join('/');
  const search = new URL(req.url).search;
  const response = await fetch(createServerApiUrl(`/crm/contract-approvals/${path}${search}`), createServerApiProxyInit(req, {
    method: req.method,
    headers: { 'Content-Type': 'application/json' },
    ...(req.method === 'POST' ? { body: await req.text() } : {}),
  }));
  return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': response.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store' } });
}
export const GET = forward;
export const POST = forward;
