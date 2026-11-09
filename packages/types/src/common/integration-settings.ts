/** Platform-owned runtime integrations. Secrets are write-only. */
export type IntegrationKind = 'mail' | 'embedding';
export interface MailIntegrationConfig {
  provider: 'environment' | 'local' | 'smtp' | 'microsoft-graph';
  enabled: boolean;
  fromAddress: string;
  host: string;
  port: number;
  tls: 'starttls' | 'tls' | 'none';
  username: string;
  tenantId: string;
  clientId: string;
}
export interface EmbeddingIntegrationConfig {
  provider: 'environment' | 'local' | 'azure-openai';
  enabled: boolean;
  endpoint: string;
  deployment: string;
  dimension: number;
  apiVersion: string;
}
export interface IntegrationConfigMap {
  mail: MailIntegrationConfig;
  embedding: EmbeddingIntegrationConfig;
}
export interface IntegrationSettings<K extends IntegrationKind = IntegrationKind> {
  kind: K;
  config: IntegrationConfigMap[K];
  secretConfigured: boolean;
  updatedAt: string | null;
  activatedAt: string | null;
}
export interface UpdateIntegrationSettings<K extends IntegrationKind = IntegrationKind> {
  config: IntegrationConfigMap[K];
  /** Blank preserves the current provider's secret; null clears it. */
  secret?: string | null;
  expectedUpdatedAt: string | null;
  reason: string;
}
export interface IntegrationProbeResult {
  ok: boolean;
  message: string;
  checkedAt: string;
}
export interface LocalMailboxMessage {
  id: string;
  subject: string;
  to: string[];
  createdAt: string;
  text?: string;
}
