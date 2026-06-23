import { Injectable } from '@nestjs/common';
import { embed, embedMany } from 'ai';
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
export class AiEmbeddingProviderService {
  getStatus(profileCode = 'default'): AiEmbeddingProviderStatus {
    return getAzureEmbeddingProviderStatus(profileCode);
  }

  async embedText(value: string, profileCode = 'default'): Promise<AiEmbeddingTextResult> {
    const providerStatus = this.requireReady(profileCode);
    const model = await getAzureEmbeddingModel();
    const result = await embed({
      model,
      value,
    });

    return {
      embedding: result.embedding,
      providerStatus,
    };
  }

  async embedTexts(values: string[], profileCode = 'default'): Promise<AiEmbeddingBatchResult> {
    const providerStatus = this.requireReady(profileCode);
    if (values.length === 0) {
      return {
        embeddings: [],
        providerStatus,
      };
    }

    const model = await getAzureEmbeddingModel();
    const result = await embedMany({
      model,
      values,
    });

    return {
      embeddings: result.embeddings,
      providerStatus,
    };
  }

  private requireReady(profileCode: string): AiEmbeddingProviderStatus {
    const status = this.getStatus(profileCode);
    if (!status.ready) {
      throw new AiEmbeddingProviderUnavailableError(status);
    }

    return status;
  }
}
