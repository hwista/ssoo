import { createServerApiProxyInit, createServerApiUrl } from '../_shared/serverApiProxy';

export const dynamic = 'force-dynamic';

async function forward(request: Request) {
  try {
    const response = await fetch(createServerApiUrl('/initial-setup'), {
      ...createServerApiProxyInit(request, { method: request.method, headers: { 'Content-Type': 'application/json' },
        ...(request.method === 'POST' ? { body: await request.text() } : {}) }),
      cache: 'no-store', signal: AbortSignal.timeout(12000),
    });
    return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ success: false, error: { message: '설정 서버에 연결하지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.' } }, { status: 503 });
  }
}

export const GET = forward;
export const POST = forward;
