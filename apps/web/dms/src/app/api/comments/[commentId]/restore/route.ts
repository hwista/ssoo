import type { DmsDocumentCommentMutationResult } from '@ssoo/types/dms';
import { proxyCommentsJson } from '../../_shared/proxy';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await context.params;
  const body = await request.text();
  return proxyCommentsJson<DmsDocumentCommentMutationResult>(
    request,
    `/dms/comments/${encodeURIComponent(commentId)}/restore`,
    '댓글을 복원하지 못했습니다.',
    {
      method: 'PATCH',
      headers: {
        'Content-Type': request.headers.get('content-type') || 'application/json',
      },
      body,
    },
  );
}
