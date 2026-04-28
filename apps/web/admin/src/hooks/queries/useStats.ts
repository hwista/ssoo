'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAdminStats } from '@/lib/api/endpoints/stats';

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: fetchAdminStats,
    staleTime: 30_000,
  });
}
