export const dynamic = 'force-dynamic';

import { handleStorageUpload, type StorageUploadBody } from '@/server/handlers/storage.handler';
import { fail, toNextResponse } from '@/server/shared/result';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as StorageUploadBody;
    return toNextResponse(handleStorageUpload(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : '업로드 처리 중 오류가 발생했습니다.';
    return toNextResponse(fail(message, 500));
  }
}
