'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { IntegrationKind, UpdateIntegrationSettings } from '@ssoo/types/common';
import { integrationsApi } from '@/lib/api/endpoints/integrations';

export function useIntegration<K extends IntegrationKind>(kind: K) {
  return useQuery({ queryKey: ['integrations', kind], queryFn: () => integrationsApi.get(kind), staleTime: Infinity, refetchOnWindowFocus: false });
}
export function useSaveIntegration<K extends IntegrationKind>(kind: K) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (body: UpdateIntegrationSettings<K>) => integrationsApi.save(kind, body), onSuccess: () => {
    client.invalidateQueries({ queryKey: ['integrations', kind] });
    client.invalidateQueries({ queryKey: ['auth-admin'] });
    client.invalidateQueries({ queryKey: ['ai-operations'] });
  } });
}
export function useProbeIntegration<K extends IntegrationKind>(kind: K) { return useMutation({ mutationFn: (body: UpdateIntegrationSettings<K>) => integrationsApi.probe(kind, body) }); }
export function useTestMail() {
  const client = useQueryClient();
  return useMutation({ mutationFn: integrationsApi.testMail, onSuccess: () => client.invalidateQueries({ queryKey: ['local-mailbox'] }) });
}
export function useLocalMailbox(enabled: boolean) { return useQuery({ queryKey: ['local-mailbox'], queryFn: integrationsApi.inbox, enabled, staleTime: 0 }); }
export function useLocalMail(id: string | null) { return useQuery({ queryKey: ['local-mailbox', id], queryFn: () => integrationsApi.message(id!), enabled: Boolean(id), gcTime: 0 }); }
export function useEmbeddingReindex() {
  const client = useQueryClient();
  return useMutation({ mutationFn: integrationsApi.reindex, onSuccess: () => client.invalidateQueries({ queryKey: ['ai-operations'] }) });
}
