/**
 * Files API Route - 파일 트리 조회
 * 
 * @description 얇은 라우팅 레이어 - 핸들러 호출만 수행
 * @see server/handlers/files.handler.ts
 */

import { getFileTree } from "@/server/handlers/files.handler";

export async function GET() {
  const result = await getFileTree();
  
  if (result.success) {
    return Response.json(result.data);
  }
  
  return new Response(result.error || "Failed to read directory", { status: 500 });
}
