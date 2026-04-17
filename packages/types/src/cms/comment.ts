export interface Comment {
  id: string;
  postId: string;
  authorUserId: string;
  parentCommentId: string | null;
  content: string;
  depth: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentDto {
  content: string;
  parentCommentId?: string;
}

export interface UpdateCommentDto {
  content: string;
}
