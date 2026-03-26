export const dynamic = 'force-dynamic';

import { handleListIngestJobs } from '@/server/handlers/ingest.handler';

export async function GET() {
  try {
    const result = handleListIngestJobs();
    return Response.json(result.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : '수집 작업 조회 중 오류가 발생했습니다.';
    return Response.json({ error: message }, { status: 500 });
  }
}
