'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchDmsAdminOverview,
  fetchDmsAdminDocuments,
  fetchDmsAdminTemplates,
  type DmsAdminDocumentListParams,
  type DmsAdminTemplateListParams,
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

export function useDmsAdminTemplates(params: DmsAdminTemplateListParams) {
  return useQuery({
    queryKey: ['admin', 'dms', 'templates', params],
    queryFn: () => fetchDmsAdminTemplates(params),
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });
}
