export const dynamic = 'force-dynamic';

import { handleListIngestJobs } from '@/server/handlers/ingest.handler';
import { fail, toNextResponse } from '@/server/shared/result';

export async function GET() {
  try {
    return toNextResponse(handleListIngestJobs());
  } catch (error) {
    const message = error instanceof Error ? error.message : '수집 작업 조회 중 오류가 발생했습니다.';
    return toNextResponse(fail(message, 500));
  }
}
