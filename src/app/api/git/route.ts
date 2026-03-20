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

export async function GET() {
  // 초기화를 보장 (lazy init)
  if (!isGitAvailable()) {
    await initializeGit();
  }

  // GET = 간단한 status 조회
  const result = await handleGitAction({ action: 'status' });

  if (result.success) {
    return Response.json(result.data);
  }
  return Response.json({ error: result.error }, { status: 500 });
}

export async function POST(req: Request) {
  // 초기화를 보장 (lazy init)
  if (!isGitAvailable()) {
    await initializeGit();
  }

  const body: GitActionBody = await req.json();
  const result = await handleGitAction(body);

  if (result.success) {
    return Response.json(result.data);
  }
  return Response.json({ error: result.error }, { status: 400 });
}
