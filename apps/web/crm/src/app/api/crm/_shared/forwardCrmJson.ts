import { createServerApiProxyInit, createServerApiUrl } from '@/app/api/_shared/serverApiProxy';

export async function forwardCrmJson(
  req: Request,
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
): Promise<Response> {
  const requestBody = method === 'GET' ? undefined : await req.text();
  const response = await fetch(
    createServerApiUrl(path),
    createServerApiProxyInit(req, {
      method,
      ...(requestBody !== undefined
        ? {
            headers: { 'Content-Type': 'application/json' },
            body: requestBody || undefined,
          }
        : {}),
    }),
  );
  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
  });
}
