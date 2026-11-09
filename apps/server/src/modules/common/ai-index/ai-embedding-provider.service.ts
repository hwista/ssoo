import { BadRequestException, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { embed, embedMany } from 'ai';
import { IntegrationSettingsService, type IntegrationRuntime } from '../integrations/integration-settings.service.js';
import type { UpdateIntegrationSettingsDto } from '../integrations/integration-settings.dto.js';
import { LocalEmbeddingService, LOCAL_EMBEDDING_MODEL, LOCAL_EMBEDDING_DIMENSION } from './local-embedding.service.js';
import {
  type AiEmbeddingProviderStatus,
  getAzureEmbeddingModel,
  getAzureEmbeddingProviderStatus,
} from './ai-azure-provider.js';

export class AiEmbeddingProviderUnavailableError extends Error {
  readonly status: AiEmbeddingProviderStatus;

  constructor(status: AiEmbeddingProviderStatus) {
    super(status.reasonMessage ?? 'AI embedding provider is not ready.');
    this.name = 'AiEmbeddingProviderUnavailableError';
    this.status = status;
  }
}

export interface AiEmbeddingTextResult {
  embedding: number[];
  providerStatus: AiEmbeddingProviderStatus;
}

export interface AiEmbeddingBatchResult {
  embeddings: number[][];
  providerStatus: AiEmbeddingProviderStatus;
}

@Injectable()
export class AiEmbeddingProviderService implements OnModuleInit, OnModuleDestroy {
  private current: IntegrationRuntime<'embedding'> | undefined;
  private refreshTimer: ReturnType<typeof setInterval> | undefined;
  private refreshing = false;
  private readonly logger = new Logger(AiEmbeddingProviderService.name);

  async onModuleInit() {
    if (!this.settings) return;
    this.current = await this.settings.runtime('embedding');
    this.refreshTimer = setInterval(() => { void this.refresh(); }, 5000);
  }
  onModuleDestroy() { if (this.refreshTimer) clearInterval(this.refreshTimer); }
  private async refresh() {
    if (this.refreshing || !this.settings) return;
    this.refreshing = true;
    try { this.current = await this.settings.runtime('embedding'); }
    catch { this.logger.warn('임베딩 설정 동기화에 실패했습니다. 실제 요청 시 설정을 다시 확인합니다.'); }
    finally { this.refreshing = false; }
  }

  constructor(
    @Optional() private readonly settings?: IntegrationSettingsService,
    @Optional() private readonly local?: LocalEmbeddingService,
  ) {}

  private status(runtime: IntegrationRuntime<'embedding'> | undefined, profileCode: string): AiEmbeddingProviderStatus {
    if (!runtime || runtime.config.provider === 'environment') return getAzureEmbeddingProviderStatus(profileCode);
    const { config, secret } = runtime;
    const local = config.provider === 'local';
    const configured = local || Boolean(config.endpoint && config.deployment && secret);
    return {
      profileCode, providerCode: local ? 'local' : 'azure-openai', ready: config.enabled && configured,
      modelName: local ? LOCAL_EMBEDDING_MODEL : config.deployment,
      deploymentName: local ? 'q8-e5-v1' : config.deployment,
      dimension: local ? LOCAL_EMBEDDING_DIMENSION : config.dimension,
      apiVersion: local ? undefined : config.apiVersion,
      credentialMode: local ? undefined : 'api-key',
      ...(!config.enabled ? { reasonCode: 'disabled', reasonMessage: '관리자가 임베딩을 비활성화했습니다.' } : !configured ? { reasonCode: 'missing_configuration', reasonMessage: 'Azure 임베딩 연결 설정이 필요합니다.' } : {}),
    };
  }

  getStatus(profileCode = 'default'): AiEmbeddingProviderStatus {
    return this.status(this.current, profileCode);
  }

  async embedText(value: string, profileCode = 'default'): Promise<AiEmbeddingTextResult> {
    const result = await this.run([value], profileCode, 'query');
    return { embedding: result.embeddings[0], providerStatus: result.providerStatus };
  }

  async embedTexts(values: string[], profileCode = 'default'): Promise<AiEmbeddingBatchResult> {
    return this.run(values, profileCode, 'passage');
  }

  private async run(values: string[], profileCode: string, purpose: 'query' | 'passage', candidate?: IntegrationRuntime<'embedding'>): Promise<AiEmbeddingBatchResult> {
    const runtime = candidate ?? await this.settings?.runtime('embedding');
    const providerStatus = this.status(runtime, profileCode);
    if (!providerStatus.ready) throw new AiEmbeddingProviderUnavailableError(providerStatus);
    if (!values.length) return { embeddings: [], providerStatus };
    let embeddings: number[][];
    if (runtime?.config.provider === 'local') {
      if (!this.local) throw new Error('Local embedding runtime is unavailable.');
      embeddings = await this.local.embed(values, purpose);
    } else if (runtime?.config.provider === 'azure-openai') {
      const { config, secret } = runtime;
      const endpoint = new URL(config.endpoint);
      if (!endpoint.hostname.endsWith('.openai.azure.com') || endpoint.username || endpoint.password || endpoint.port) throw new BadRequestException('Azure OpenAI 리소스의 HTTPS 엔드포인트를 입력하세요.');
      const response = await fetch(`${endpoint.origin}/openai/deployments/${encodeURIComponent(config.deployment)}/embeddings?api-version=${encodeURIComponent(config.apiVersion)}`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000),
        headers: { 'api-key': secret, 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: values }),
      });
      if (!response.ok) throw new Error(`Azure embedding request failed (HTTP ${response.status}).`);
      const result = await response.json() as { data: Array<{ index: number; embedding: number[] }> };
      embeddings = result.data.sort((a, b) => a.index - b.index).map(item => item.embedding);
    } else {
      const model = await getAzureEmbeddingModel();
      embeddings = purpose === 'query' && values.length === 1 ? [(await embed({ model, value: values[0] })).embedding] : (await embedMany({ model, values })).embeddings;
    }
    if (embeddings.length !== values.length || embeddings.some(vector => vector.length !== providerStatus.dimension || vector.some(value => !Number.isFinite(value)) || !vector.some(value => value !== 0))) {
      throw new Error('임베딩 차원 또는 응답이 설정과 일치하지 않습니다. 저장하지 않았습니다.');
    }
    return { embeddings, providerStatus };
  }

  async probe(dto: UpdateIntegrationSettingsDto) {
    const candidate = await this.settings!.candidate('embedding', dto);
    candidate.config = { ...candidate.config, enabled: true };
    try {
      const result = await this.run(['플랫폼 운영 및 사용자 관리'], 'default', 'query', candidate);
      return { ok: true, checkedAt: new Date().toISOString(), message: `실제 임베딩 생성 성공 (${result.embeddings[0].length}차원).` };
    } catch { return { ok: false, checkedAt: new Date().toISOString(), message: '임베딩 생성에 실패했습니다. 모델 준비 상태·엔드포인트·배포·인증 정보·차원을 확인하세요.' }; }
  }

  async save(dto: UpdateIntegrationSettingsDto, actor: bigint) {
    const candidate = await this.settings!.candidate('embedding', dto);
    if (candidate.config.enabled && !(await this.probe(dto)).ok) throw new BadRequestException('실제 임베딩 생성에 실패하여 활성화하지 않았습니다.');
    const saved = await this.settings!.save('embedding', dto, actor);
    this.current = await this.settings!.runtime('embedding');
    return saved;
  }
}
