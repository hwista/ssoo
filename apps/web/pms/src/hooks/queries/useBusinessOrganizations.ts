import { useQuery } from '@tanstack/react-query';
import { onboardingApi } from '@/lib/api/endpoints/onboarding';
import { useAuthStore } from '@/stores';

export function useBusinessOrganizations() {
  const userId = useAuthStore((state) => state.user?.userId);
  return useQuery({
    queryKey: ['onboarding', 'business-organizations', 'pms', userId],
    queryFn: () => onboardingApi.businessOrganizations(),
    enabled: Boolean(userId),
    staleTime: 0,
  });
}
