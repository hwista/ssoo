import type { DmsDocumentCommentMutationResult } from '@ssoo/types/dms';
import { proxyCommentsJson } from '../_shared/proxy';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await context.params;
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  return proxyCommentsJson<DmsDocumentCommentMutationResult>(
    request,
    `/dms/comments/${encodeURIComponent(commentId)}${query ? `?${query}` : ''}`,
    '댓글을 삭제하지 못했습니다.',
    { method: 'DELETE' },
  );
}
