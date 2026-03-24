import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { followsApi } from '@/lib/api/endpoints/follows';

const followKeys = {
  all: ['chs', 'follows'] as const,
  followers: (
    userId: string,
    params?: { page?: number; pageSize?: number }
  ) => [...followKeys.all, 'followers', userId, params] as const,
  following: (
    userId: string,
    params?: { page?: number; pageSize?: number }
  ) => [...followKeys.all, 'following', userId, params] as const,
};

export function useFollowers(
  userId: string,
  params?: { page?: number; pageSize?: number }
) {
  return useQuery({
    queryKey: followKeys.followers(userId, params),
    queryFn: () => followsApi.followers({ userId, ...params }),
    enabled: !!userId,
  });
}

export function useFollowing(
  userId: string,
  params?: { page?: number; pageSize?: number }
) {
  return useQuery({
    queryKey: followKeys.following(userId, params),
    queryFn: () => followsApi.following({ userId, ...params }),
    enabled: !!userId,
  });
}

export function useFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => followsApi.follow(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: followKeys.all });
      qc.invalidateQueries({ queryKey: ['chs', 'profiles'] });
    },
  });
}

export function useUnfollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => followsApi.unfollow(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: followKeys.all });
      qc.invalidateQueries({ queryKey: ['chs', 'profiles'] });
    },
  });
}
