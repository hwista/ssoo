import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';
export const dynamic = 'force-dynamic';
async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (!/^[1-9]\d{0,18}$/.test(path[0] ?? '') || path.length > 2 || (path.length === 2 && !['usage', 'permanent'].includes(path[1]))) return new Response(null, { status: 404 });
  const response = await fetch(createServerApiUrl('/codes/' + path.join('/')), createServerApiProxyInit(request, { method: request.method, ...(request.method !== 'GET' ? { headers: { 'Content-Type': 'application/json' }, body: await request.text() } : {}) }));
  return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': 'application/json' } });
}
export { proxy as GET, proxy as PUT, proxy as DELETE };
