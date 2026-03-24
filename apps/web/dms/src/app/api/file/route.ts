/**
 * File API Route - 단일 파일 CRUD 작업
 * 비즈니스 로직은 @/server/handlers/file.handler.ts 참조
 */
export const dynamic = 'force-dynamic';

import { readFile, handleFileAction, type FileActionBody } from "@/server/handlers/file.handler";
import { fail, toNextResponse } from '@/server/shared/result';

export async function GET(req: Request) {
  // 헤더 우선, 없으면 쿼리 파라미터(path) 사용
  const url = new URL(req.url);
  const headerPath = req.headers.get('x-file-path');
  const queryPath = url.searchParams.get('path');
  const filePath = headerPath || queryPath;

  if (!filePath) {
    return toNextResponse(fail('Missing file path header or query', 400));
  }

  return toNextResponse(await readFile(filePath));
}

export async function POST(req: Request) {
  const body: FileActionBody = await req.json();
  return toNextResponse(await handleFileAction(body));
}
