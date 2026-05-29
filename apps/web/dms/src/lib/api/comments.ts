import type {
  CreateDmsDocumentCommentPayload,
  DmsDocumentCommentMutationResult,
  DmsDocumentCommentsResult,
  MutateDmsDocumentCommentPayload,
} from '@ssoo/types/dms';
import { del, get, patch, post } from './core';

function buildPathQuery(path: string) {
  return `?path=${encodeURIComponent(path)}`;
}

export const commentsApi = {
  list: (path: string) => (
    get<DmsDocumentCommentsResult>(`/api/comments${buildPathQuery(path)}`)
  ),
  create: (payload: CreateDmsDocumentCommentPayload) => (
    post<DmsDocumentCommentMutationResult>('/api/comments', payload)
  ),
  delete: (path: string, commentId: string) => (
    del<DmsDocumentCommentMutationResult>(
      `/api/comments/${encodeURIComponent(commentId)}${buildPathQuery(path)}`,
    )
  ),
  restore: (commentId: string, payload: MutateDmsDocumentCommentPayload) => (
    patch<DmsDocumentCommentMutationResult>(
      `/api/comments/${encodeURIComponent(commentId)}/restore`,
      payload,
    )
  ),
};
