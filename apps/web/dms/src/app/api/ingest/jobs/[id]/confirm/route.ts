import { handleConfirmIngestJob } from '@/server/handlers/ingest.handler';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = handleConfirmIngestJob(id);

    if (!result.success) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : '수집 작업 승인 중 오류가 발생했습니다.';
    return Response.json({ error: message }, { status: 500 });
  }
}
