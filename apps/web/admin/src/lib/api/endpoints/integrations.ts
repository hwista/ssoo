import type { IntegrationKind, IntegrationSettings, UpdateIntegrationSettings, IntegrationProbeResult, LocalMailboxMessage } from '@ssoo/types/common';
import { apiClient } from '../client';
import type { ApiResponse } from '../types';

const base = (kind: IntegrationKind) => kind === 'mail' ? '/auth/admin/mail' : '/ai-index/embedding';
export const integrationsApi = {
  reindex: (body: { sourceApp: string; reason: string }) => apiClient.post<ApiResponse<{ queuedCount: number; message: string }>>('/ai-index/embedding/reindex', body).then(response => response.data.data!),
  get: <K extends IntegrationKind>(kind: K) => apiClient.get<ApiResponse<IntegrationSettings<K>>>(`${base(kind)}/settings`).then(response => response.data.data!),
  save: <K extends IntegrationKind>(kind: K, body: UpdateIntegrationSettings<K>) => apiClient.put<ApiResponse<IntegrationSettings<K>>>(`${base(kind)}/settings`, body, { timeout: 180000 }).then(response => response.data.data!),
  probe: <K extends IntegrationKind>(kind: K, body: UpdateIntegrationSettings<K>) => apiClient.post<ApiResponse<IntegrationProbeResult>>(`${base(kind)}/probe`, body, { timeout: 180000 }).then(response => response.data.data!),
  testMail: (to: string) => apiClient.post<ApiResponse<IntegrationProbeResult>>('/auth/admin/mail/test', { to }, { timeout: 45000 }).then(response => response.data.data!),
  inbox: () => apiClient.get<ApiResponse<LocalMailboxMessage[]>>('/auth/admin/mail/inbox').then(response => response.data.data!),
  message: (id: string) => apiClient.get<ApiResponse<LocalMailboxMessage>>(`/auth/admin/mail/inbox/${id}`).then(response => response.data.data!),
};
