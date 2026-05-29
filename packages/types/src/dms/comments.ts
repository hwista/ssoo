import type { DocumentComment } from './document-metadata';

export interface DmsDocumentCommentsResult {
  path: string;
  comments: DocumentComment[];
}

export interface CreateDmsDocumentCommentPayload {
  path: string;
  content: string;
  parentId?: string;
}

export interface MutateDmsDocumentCommentPayload {
  path: string;
}

export interface DmsDocumentCommentMutationResult extends DmsDocumentCommentsResult {
  comment?: DocumentComment;
}
