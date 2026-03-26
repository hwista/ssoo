export interface Post {
  id: string;
  authorUserId: string;
  boardId: string | null;
  categoryId: string | null;
  title: string | null;
  content: string;
  contentType: string;
  isPinned: boolean;
  viewCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostDto {
  title?: string;
  content: string;
  contentType?: string;
  boardId?: string;
  categoryId?: string;
  tagNames?: string[];
}

export interface UpdatePostDto {
  title?: string;
  content?: string;
  contentType?: string;
  boardId?: string | null;
  categoryId?: string | null;
  isPinned?: boolean;
}
