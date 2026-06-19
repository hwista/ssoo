import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { followsApi } from '@/lib/api/endpoints/follows';
import { profilesApi } from '@/lib/api/endpoints/profiles';

const profileKeys = {
  all: ['sns', 'profiles'] as const,
  me: () => [...profileKeys.all, 'me'] as const,
  user: (userId: string) => [...profileKeys.all, userId] as const,
};

export function useMyProfile() {
  return useQuery({
    queryKey: profileKeys.me(),
    queryFn: () => profilesApi.me(),
  });
}

export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: profileKeys.user(userId),
    queryFn: () => profilesApi.byUser(userId),
    enabled: !!userId && userId !== 'me',
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: profilesApi.update,
    onSuccess: () => { qc.invalidateQueries({ queryKey: profileKeys.all }); },
  });
}

export function useToggleProfileFollow(userId: string, isFollowing: boolean) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => isFollowing
      ? followsApi.unfollow(userId)
      : followsApi.follow(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: profileKeys.all });
      qc.invalidateQueries({ queryKey: ['sns', 'posts'] });
    },
  });
}
