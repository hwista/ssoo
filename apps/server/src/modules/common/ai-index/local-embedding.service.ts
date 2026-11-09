import { Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FeatureExtractionPipeline } from '@huggingface/transformers';

export const LOCAL_EMBEDDING_MODEL = 'Xenova/multilingual-e5-small';
export const LOCAL_EMBEDDING_DIMENSION = 384;
export const LOCAL_EMBEDDING_REVISION = '761b726dd34fb83930e26aab4e9ac3899aa1fa78';

@Injectable()
export class LocalEmbeddingService implements OnModuleDestroy {
  private extractor: FeatureExtractionPipeline | undefined;
  private queue: Promise<unknown> = Promise.resolve();
  private waiting = 0;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;
  constructor(private readonly env: ConfigService) {}

  async embed(values: string[], purpose: 'query' | 'passage'): Promise<number[][]> {
    if (this.waiting >= 10) throw new ServiceUnavailableException('로컬 임베딩이 처리 중입니다. 잠시 후 다시 시도하세요.');
    this.waiting++;
    const result = this.queue.then(async () => {
      if (this.idleTimer) clearTimeout(this.idleTimer);
      if (!this.extractor) {
        const { pipeline, env } = await import('@huggingface/transformers');
        env.cacheDir = this.env.get<string>('LOCAL_EMBEDDING_CACHE_DIR', '/var/lib/ssoo/models');
        env.allowLocalModels = false;
        this.extractor = await pipeline('feature-extraction', LOCAL_EMBEDDING_MODEL, {
          revision: LOCAL_EMBEDDING_REVISION, dtype: 'q8', device: 'cpu', session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 },
        });
      }
      const embeddings: number[][] = [];
      // Sequential inference bounds peak memory even when the indexing batch is large.
      for (const text of values) {
        const output = await this.extractor(`${purpose}: ${text}`, { pooling: 'mean', normalize: true });
        embeddings.push(Array.from(output.data, Number));
      }
      return embeddings;
    });
    this.queue = result.catch(() => undefined);
    try { return await result; }
    finally {
      this.waiting--;
      if (!this.waiting) this.idleTimer = setTimeout(() => { void this.dispose(); }, 5 * 60_000);
    }
  }

  private async dispose() {
    const extractor = this.extractor;
    this.extractor = undefined;
    if (extractor) await extractor.dispose();
  }

  async onModuleDestroy() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    await this.queue;
    await this.dispose();
  }
}
