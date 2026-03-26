export const dynamic = 'force-dynamic';

import { handleStorageUpload, type StorageUploadBody } from '@/server/handlers/storage.handler';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as StorageUploadBody;
    const result = handleStorageUpload(body);

    if (!result.success) {
      return Response.json({ error: result.error }, { status: result.status });
    }

    return Response.json(result.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : '업로드 처리 중 오류가 발생했습니다.';
    return Response.json({ error: message }, { status: 500 });
  }
}
