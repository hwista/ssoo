export const dynamic = 'force-dynamic';

import { composeDocument, recommendDocumentPath, recommendTitleAndPath } from '@/server/handlers/docAssist.handler';

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

    const data = await composeDocument({
      instruction: typeof body?.instruction === 'string' ? body.instruction : '',
      currentContent: typeof body?.currentContent === 'string' ? body.currentContent : '',
      selectedText: typeof body?.selectedText === 'string' ? body.selectedText : undefined,
      activeDocPath: typeof body?.activeDocPath === 'string' ? body.activeDocPath : undefined,
      templates: Array.isArray(body?.templates) ? body.templates : [],
      summaryFiles: Array.isArray(body?.summaryFiles) ? body.summaryFiles : [],
    });
    return Response.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : '문서 작성 처리 중 오류가 발생했습니다.';
    const status = /필수|too short|invalid/i.test(message) ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}
