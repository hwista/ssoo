'use client';

import { useQuery } from '@tanstack/react-query';
import { accessOpsApi } from '@/lib/api/endpoints/accessOps';
import type { InspectAccessParams } from '@/lib/api/endpoints/accessOps';

export const accessOpsKeys = {
  all: ['access-ops'] as const,
  inspect: (params?: InspectAccessParams | null) => [...accessOpsKeys.all, 'inspect', params] as const,
};

export function useInspectAccess(params?: InspectAccessParams | null, enabled: boolean = true) {
  return useQuery({
    queryKey: accessOpsKeys.inspect(params),
    queryFn: () => accessOpsApi.inspect(params ?? {}),
    enabled: enabled && !!(params?.userId || params?.loginId),
  });
}
