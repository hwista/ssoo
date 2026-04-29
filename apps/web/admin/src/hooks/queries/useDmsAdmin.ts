'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchDmsAdminOverview } from '@/lib/api/endpoints/dms';

export function useDmsAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'dms', 'overview'],
    queryFn: fetchDmsAdminOverview,
    staleTime: 30_000,
  });
}
