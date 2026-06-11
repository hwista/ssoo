import { useQuery } from '@tanstack/react-query';
import { homeApi } from '@/lib/api/endpoints/home';

export const homeSummaryKeys = {
  all: ['home-summary'] as const,
};

export function useHomeSummary() {
  return useQuery({
    queryKey: homeSummaryKeys.all,
    queryFn: () => homeApi.getSummary(),
    staleTime: 60 * 1000,
  });
}
