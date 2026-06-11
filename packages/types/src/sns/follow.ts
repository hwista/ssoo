export interface Follow {
  id: string;
  followerUserId: string;
  followingUserId: string;
  createdAt: string;
}

export interface FollowStats {
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}
