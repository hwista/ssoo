'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchDmsAdminOverview,
  fetchDmsAdminDocuments,
  type DmsAdminDocumentListParams,
} from '@/lib/api/endpoints/dms';

export function useDmsAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'dms', 'overview'],
    queryFn: fetchDmsAdminOverview,
    staleTime: 30_000,
  });
}

export function useDmsAdminDocuments(params: DmsAdminDocumentListParams) {
  return useQuery({
    queryKey: ['admin', 'dms', 'documents', params],
    queryFn: () => fetchDmsAdminDocuments(params),
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });
}
