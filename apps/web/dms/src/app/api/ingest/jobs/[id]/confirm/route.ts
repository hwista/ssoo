export const dynamic = 'force-dynamic';

import { handleConfirmIngestJob } from '@/server/handlers/ingest.handler';
import { fail, toNextResponse } from '@/server/shared/result';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return toNextResponse(handleConfirmIngestJob(id));
  } catch (error) {
    const message = error instanceof Error ? error.message : '수집 작업 승인 중 오류가 발생했습니다.';
    return toNextResponse(fail(message, 500));
  }
}
