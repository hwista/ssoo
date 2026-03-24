export const dynamic = 'force-dynamic';

import { handleSubmitIngest, type IngestSubmitBody } from '@/server/handlers/ingest.handler';
import { fail, toNextResponse } from '@/server/shared/result';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as IngestSubmitBody;
    return toNextResponse(handleSubmitIngest(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : '수집 요청 처리 중 오류가 발생했습니다.';
    return toNextResponse(fail(message, 500));
  }
}
