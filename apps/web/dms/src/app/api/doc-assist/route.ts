export const dynamic = 'force-dynamic';

import { composeDocument, composeDocumentStream, recommendDocumentPath, recommendTitleAndPath } from '@/server/handlers/docAssist.handler';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = body?.action ?? 'compose';

    if (action === 'recommendPath') {
      const result = recommendDocumentPath({
        instruction: typeof body?.instruction === 'string' ? body.instruction : '',
        activeDocPath: typeof body?.activeDocPath === 'string' ? body.activeDocPath : undefined,
        templates: Array.isArray(body?.templates) ? body.templates : [],
        summaryFiles: Array.isArray(body?.summaryFiles) ? body.summaryFiles : [],
        selectedText: typeof body?.selectedText === 'string' ? body.selectedText : undefined,
      });
      return Response.json(result);
    }

    if (action === 'recommendTitleAndPath') {
      const result = await recommendTitleAndPath({
        currentContent: typeof body?.currentContent === 'string' ? body.currentContent : '',
        activeDocPath: typeof body?.activeDocPath === 'string' ? body.activeDocPath : undefined,
      });
      return Response.json({ success: true, data: result });
    }

    const composeInput = {
      instruction: typeof body?.instruction === 'string' ? body.instruction : '',
      currentContent: typeof body?.currentContent === 'string' ? body.currentContent : '',
      selectedText: typeof body?.selectedText === 'string' ? body.selectedText : undefined,
      activeDocPath: typeof body?.activeDocPath === 'string' ? body.activeDocPath : undefined,
      templates: Array.isArray(body?.templates) ? body.templates : [],
      summaryFiles: Array.isArray(body?.summaryFiles) ? body.summaryFiles : [],
    };

    // stream=false → 기존 JSON 응답 (태그 추출, 요약 등 짧은 요청용)
    if (body?.stream === false) {
      const data = await composeDocument(composeInput);
      return Response.json(data);
    }

    // 기본: SSE 스트리밍 응답 (에디터 compose용)
    const { stream, applyMode, suggestedPath, relevanceWarnings } = await composeDocumentStream(composeInput, req.signal);

    const encoder = new TextEncoder();
    const sseStream = new ReadableStream({
      async start(controller) {
        const reader = stream.getReader();
        const onAbort = () => {
          reader.cancel().catch(() => {});
        };

        req.signal.addEventListener('abort', onAbort, { once: true });

        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'meta', applyMode, suggestedPath, relevanceWarnings })}\n\n`,
        ));

        try {
          while (true) {
            if (req.signal.aborted) break;
            const { done, value } = await reader.read();
            if (done || req.signal.aborted) break;
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'text-delta', delta: value })}\n\n`,
            ));
          }
          if (!req.signal.aborted) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          }
        } catch (error) {
          if (req.signal.aborted) return;
          const message = error instanceof Error ? error.message : '스트리밍 오류';
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', errorText: message })}\n\n`,
          ));
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
    const message = error instanceof Error ? error.message : '문서 작성 처리 중 오류가 발생했습니다.';
    const status = /필수|too short|invalid/i.test(message) ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}
