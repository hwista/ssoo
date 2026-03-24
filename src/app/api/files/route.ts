/**
 * Files API Route - 파일 트리 조회
 * 
 * @description 얇은 라우팅 레이어 - 핸들러 호출만 수행
 * @see server/handlers/files.handler.ts
 */
export const dynamic = 'force-dynamic';

import { getFileTree } from "@/server/handlers/files.handler";
import { toNextResponse } from '@/server/shared/result';

export async function GET() {
  return toNextResponse(await getFileTree());
}
