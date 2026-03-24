/**
 * File API Route - 단일 파일 CRUD 작업
 * 비즈니스 로직은 @/server/handlers/file.handler.ts 참조
 */
export const dynamic = 'force-dynamic';

import { readFile, handleFileAction, type FileActionBody } from "@/server/handlers/file.handler";

export async function GET(req: Request) {
  // 헤더 우선, 없으면 쿼리 파라미터(path) 사용
  const url = new URL(req.url);
  const headerPath = req.headers.get('x-file-path');
  const queryPath = url.searchParams.get('path');
  const filePath = headerPath || queryPath;

  if (!filePath) {
    return Response.json({ error: 'Missing file path header or query' }, { status: 400 });
  }

  const result = await readFile(filePath);

  if (result.success) {
    return Response.json(result.data);
  }
  return Response.json({ error: result.error }, { status: result.status });
}

export async function POST(req: Request) {
  const body: FileActionBody = await req.json();
  const result = await handleFileAction(body);

  if (result.success) {
    return Response.json(result.data);
  }
  return Response.json({ error: result.error }, { status: result.status });
}
