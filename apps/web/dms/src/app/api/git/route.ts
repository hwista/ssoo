/**
 * Git API Route - Document Git 저장소 관리
 * 비즈니스 로직은 @/server/handlers/git.handler.ts 참조
 */
export const dynamic = 'force-dynamic';

import {
  handleGitAction,
  initializeGit,
  isGitAvailable,
  type GitActionBody,
} from '@/server/handlers/git.handler';
import { fail, toNextResponse } from '@/server/shared/result';

export async function GET() {
  // 초기화를 보장 (lazy init)
  if (!isGitAvailable()) {
    await initializeGit();
  }

  // GET = 간단한 status 조회
  return toNextResponse(await handleGitAction({ action: 'status' }));
}

export async function POST(req: Request) {
  // 초기화를 보장 (lazy init)
  if (!isGitAvailable()) {
    await initializeGit();
  }

  const body: GitActionBody = await req.json();
  try {
    return toNextResponse(await handleGitAction(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Git 작업 처리 중 오류가 발생했습니다.';
    return toNextResponse(fail(message, 500));
  }
}
