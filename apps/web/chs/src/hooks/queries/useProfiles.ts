import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profilesApi } from '@/lib/api/endpoints/profiles';

const profileKeys = {
  all: ['chs', 'profiles'] as const,
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
