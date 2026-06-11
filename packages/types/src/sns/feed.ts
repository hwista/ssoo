export interface FeedItem {
  post: import('./post').Post;
  author: {
    id: string;
    userName: string;
    displayName: string | null;
    avatarUrl: string | null;
    departmentCode: string | null;
    positionCode: string | null;
  };
  reactionCount: number;
  commentCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  tags: string[];
}

export interface FeedQueryDto {
  cursor?: string;
  limit?: number;
  feedType?: 'all' | 'following' | 'board';
  boardId?: string;
}

export interface ReactionDto {
  reactionType?: string;
}
