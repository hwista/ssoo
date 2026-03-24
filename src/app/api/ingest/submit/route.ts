export const dynamic = 'force-dynamic';

import { handleSubmitIngest, type IngestSubmitBody } from '@/server/handlers/ingest.handler';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as IngestSubmitBody;
    const result = handleSubmitIngest(body);

    if (!result.success) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : '수집 요청 처리 중 오류가 발생했습니다.';
    return Response.json({ error: message }, { status: 500 });
  }
}
