import { AiEmbeddingProviderService } from '../../src/modules/common/ai-index/ai-embedding-provider.service.js';
import { AiRetrievalService } from '../../src/modules/common/ai-index/ai-retrieval.service.js';

describe('runtime embedding provider', () => {
  const config = { provider: 'local', enabled: true, endpoint: '', deployment: '', dimension: 1536, apiVersion: '2024-10-21' };
  const runtime = () => ({ config, secret: '', updatedAt: null, activatedAt: null });

  it('uses native local dimensions and distinct query/passage prefixes', async () => {
    const purposes: string[] = [];
    const provider = new AiEmbeddingProviderService({ runtime: async () => runtime() } as never, { embed: async (values: string[], purpose: string) => { purposes.push(purpose); return values.map(() => Array(384).fill(0.1)); } } as never);
    expect((await provider.embedText('사용자 관리')).embedding).toHaveLength(384);
    expect((await provider.embedTexts(['문서', '게시글'])).embeddings).toHaveLength(2);
    expect(purposes).toEqual(['query', 'passage']);
  });

  it('rejects malformed vectors before they reach storage', async () => {
    const provider = new AiEmbeddingProviderService({ runtime: async () => runtime() } as never, { embed: async () => [[1, 2, 3]] } as never);
    await expect(provider.embedText('검증')).rejects.toThrow('차원');
  });

  it('filters vector retrieval by actual provider identity and guards mixed dimensions', async () => {
    const calls: Array<[string, ...unknown[]]> = [];
    const provider = { getStatus: () => ({ ready: true }), embedText: async () => ({ embedding: Array(384).fill(0.1), providerStatus: { dimension: 384, providerCode: 'local', modelName: 'e5', deploymentName: 'q8' } }) };
    const service = new AiRetrievalService({ client: { $queryRawUnsafe: async (sql: string, ...args: unknown[]) => { calls.push([sql, ...args]); return []; } } } as never, provider as never, {} as never, {} as never, {} as never);
    await (service as unknown as { findVectorRows: (...args: unknown[]) => Promise<unknown> }).findVectorRows('사용자', undefined, undefined, { userId: '1' }, 10);
    expect(calls[0][0]).toContain('CASE WHEN e.embedding_dimension = $11');
    expect(calls[0][0]).toContain('e.model_name IS NOT DISTINCT FROM $13');
    expect(calls[0].slice(-4)).toEqual([384, 'local', 'e5', 'q8']);
  });
});
