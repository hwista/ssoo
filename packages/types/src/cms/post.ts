export type CmsVisibilityScopeCode = 'public' | 'organization' | 'followers' | 'self';

export interface Post {
  id: string;
  authorUserId: string;
  boardId: string | null;
  categoryId: string | null;
  title: string | null;
  content: string;
  contentType: string;
  visibilityScopeCode: CmsVisibilityScopeCode;
  targetOrgId: string | null;
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
  visibilityScopeCode?: CmsVisibilityScopeCode;
  tagNames?: string[];
}

export interface UpdatePostDto {
  title?: string;
  content?: string;
  contentType?: string;
  boardId?: string | null;
  categoryId?: string | null;
  visibilityScopeCode?: CmsVisibilityScopeCode;
  isPinned?: boolean;
}
