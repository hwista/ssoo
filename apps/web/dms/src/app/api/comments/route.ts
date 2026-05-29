import type {
  DmsDocumentCommentMutationResult,
  DmsDocumentCommentsResult,
} from '@ssoo/types/dms';
import { proxyCommentsJson } from './_shared/proxy';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  return proxyCommentsJson<DmsDocumentCommentsResult>(
    request,
    `/dms/comments${query ? `?${query}` : ''}`,
    '댓글 목록을 조회하지 못했습니다.',
  );
}

export async function POST(request: Request) {
  const body = await request.text();
  return proxyCommentsJson<DmsDocumentCommentMutationResult>(
    request,
    '/dms/comments',
    '댓글을 저장하지 못했습니다.',
    {
      method: 'POST',
      headers: {
        'Content-Type': request.headers.get('content-type') || 'application/json',
      },
      body,
    },
  );
}
