export const dynamic = 'force-dynamic';

import { handleConvertToTemplate } from '@/server/handlers/template.handler';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { stream } = await handleConvertToTemplate(body, req.headers, req.signal);
    const encoder = new TextEncoder();

    const sseStream = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        const onAbort = () => {
          reader.cancel().catch(() => {});
        };

        req.signal.addEventListener('abort', onAbort, { once: true });

        try {
          while (true) {
            if (req.signal.aborted) break;
            const { done, value } = await reader.read();
            if (done || req.signal.aborted) break;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text-delta', delta: value })}\n\n`));
          }
          if (!req.signal.aborted) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          }
        } finally {
          req.signal.removeEventListener('abort', onAbort);
          controller.close();
        }
      },
      cancel() {
        stream.cancel().catch(() => {});
      },
    });

    return new Response(sseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '템플릿 변환 중 오류가 발생했습니다.';
    return Response.json({ error: message }, { status: 400 });
  }
}
