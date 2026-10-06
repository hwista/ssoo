import type { AccessService } from '../access/access.service.js';
import type { AiIndexObjectProjection } from '@ssoo/types/common';
import type { DatabaseService } from '../../../database/database.service.js';
import type { AiEmbeddingProviderService } from '../../common/ai-index/ai-embedding-provider.service.js';
import { AiIndexRegistryService } from '../../common/ai-index/ai-index-registry.service.js';
import { assertAiIndexObjectProjection } from '../../common/ai-index/ai-index-projection.validator.js';
import { SnsAiIndexAdapter } from './sns-ai-index.adapter.js';

type FindFirstPost = (args: unknown) => Promise<unknown>;

interface FindFirstPostMock extends FindFirstPost {
  calls: unknown[];
}

interface SnsPostFixtureOptions {
  visibilityScopeCode?: string;
  targetOrgId?: bigint | null;
}

function createPostFixture(options: SnsPostFixtureOptions = {}) {
  const visibilityScopeCode = options.visibilityScopeCode ?? 'public';
  const targetOrgId = options.targetOrgId ?? null;

  return {
    id: 303n,
    authorUserId: 501n,
    boardId: 77n,
    categoryId: 88n,
    title: 'AI/RAG 공용화 작업 공유',
    content: 'SNS post projection은 공용 AI index adapter 계약과 visibility ACL snapshot을 검증한다.',
    contentType: 'markdown',
    visibilityScopeCode,
    targetOrgId,
    isPinned: true,
    viewCount: 19,
    createdAt: new Date('2026-07-01T02:03:04.000Z'),
    updatedAt: new Date('2026-07-02T03:04:05.000Z'),
    board: {
      boardCode: 'rag-lab',
      boardName: 'AI RAG Lab',
      boardType: 'knowledge',
    },
    category: {
      categoryName: '공유',
    },
    accessRequests: [],
    postTags: [
      {
        tag: {
          tagName: 'rag',
        },
      },
      {
        tag: {
          tagName: 'sns',
        },
      },
    ],
    _count: {
      comments: 2,
      reactions: 5,
      attachments: 1,
      bookmarks: 3,
    },
  };
}

function createAdapter(post: unknown, embeddingReady = false) {
  const findFirst = (async (args: unknown) => {
    findFirst.calls.push(args);
    return post;
  }) as FindFirstPostMock;
  findFirst.calls = [];
  const db = {
    client: {
      snsPost: {
        findFirst,
      },
    },
  } as unknown as DatabaseService;
  const registry = new AiIndexRegistryService();
  const embeddingProvider = {
    getStatus: () => ({
      profileCode: 'default',
      providerCode: 'azure-openai',
      ready: embeddingReady,
      reasonCode: embeddingReady ? undefined : 'not_configured',
    }),
  } as unknown as AiEmbeddingProviderService;
  const adapter = new SnsAiIndexAdapter(db, registry, embeddingProvider, {} as AccessService);

  return {
    adapter,
    registry,
    findFirst,
  };
}

function requireProjection(result: { projection?: AiIndexObjectProjection }): AiIndexObjectProjection {
  if (!result.projection) {
    throw new Error('Expected SNS AI index projection');
  }
  return result.projection;
}

describe('SnsAiIndexAdapter', () => {
  it('registers a provider-gated SNS post domain adapter', () => {
    const { adapter, registry } = createAdapter(createPostFixture(), true);

    adapter.onModuleInit();

    expect(registry.get('sns')).toBe(adapter);
    expect(adapter.capabilities).toMatchObject({
      keyword: true,
      metadata: true,
      semantic: true,
      vector: true,
      ragContext: true,
      indexing: true,
    });
  });

  it('projects public SNS post rows into a valid AI index object', async () => {
    const { adapter, findFirst } = createAdapter(createPostFixture(), false);

    const result = await adapter.syncObject({
      sourceApp: 'sns',
      entityType: 'post',
      entityId: '303',
      jobType: 'upsert',
    });
    const projection = requireProjection(result);

    expect(result.status).toBe('indexed');
    expect(findFirst.calls[0]).toMatchObject({
      where: {
        id: 303n,
        isActive: true,
      },
      include: {
        postTags: {
          include: {
            tag: true,
          },
        },
      },
    });
    expect(() => assertAiIndexObjectProjection(projection)).not.toThrow();
    expect(projection).toMatchObject({
      sourceApp: 'sns',
      sourceKind: 'domain',
      adapterCode: 'sns.post.ai-index',
      entityType: 'post',
      entityId: '303',
      title: 'AI/RAG 공용화 작업 공유',
      target: {
        sourceApp: 'sns',
        path: '/board/77?postId=303',
      },
      sensitivity: 'public',
      acl: {
        accessScope: 'public',
        searchEligible: true,
        contextEligible: true,
      },
      capabilities: {
        semantic: false,
        vector: false,
        ragContext: false,
      },
    });
    expect(projection.bodyText).toContain('SNS post projection은 공용 AI index adapter 계약');
    expect(projection.bodyText).toContain('Comment count: 2');
    expect(projection.metadata).toMatchObject({
      postId: '303',
      boardCode: 'rag-lab',
      visibilityScopeCode: 'public',
      tags: ['rag', 'sns'],
      commentCount: 2,
    });
    expect(projection.chunks?.map((chunk) => chunk.chunkKey)).toEqual([
      'sns-post-overview',
      'sns-post-content',
      'sns-post-engagement',
    ]);
  });

  it('uses organization ACL snapshots without widening SNS org posts to all authenticated users', async () => {
    const { adapter } = createAdapter(createPostFixture({
      visibilityScopeCode: 'organization',
      targetOrgId: 700n,
    }), false);

    const result = await adapter.syncObject({
      sourceApp: 'sns',
      entityType: 'post',
      entityId: '303',
      jobType: 'upsert',
    });
    const projection = requireProjection(result);

    expect(() => assertAiIndexObjectProjection(projection)).not.toThrow();
    expect(projection).toMatchObject({
      sensitivity: 'internal',
      acl: {
        accessScope: 'acl',
        sensitivity: 'internal',
        snapshot: {
          access: 'organization-acl',
          organizationIds: ['700'],
          ownerUserId: '501',
          readableUserIds: ['501'],
        },
      },
    });
  });

  it.each(['followers', 'self'] as const)(
    'narrows %s visibility to owner-only ACL for SNS RAG context',
    async (visibilityScopeCode) => {
      const { adapter } = createAdapter(createPostFixture({ visibilityScopeCode }), false);

      const result = await adapter.syncObject({
        sourceApp: 'sns',
        entityType: 'post',
        entityId: '303',
        jobType: 'upsert',
      });
      const projection = requireProjection(result);

      expect(() => assertAiIndexObjectProjection(projection)).not.toThrow();
      expect(projection).toMatchObject({
        sensitivity: 'restricted',
        acl: {
          accessScope: 'owner',
          sensitivity: 'restricted',
          snapshot: {
            access: 'owner-only',
            visibilityScopeCode,
            ownerUserId: '501',
            readableUserIds: ['501'],
            userIds: ['501'],
          },
        },
      });
    },
  );

  it('adds individually approved users to private AI ACL without making it public', async () => {
    const post = { ...createPostFixture({ visibilityScopeCode: 'self' }), accessRequests: [{ requesterUserId: 702n }] };
    const { adapter, findFirst } = createAdapter(post);
    const projection = requireProjection(await adapter.syncObject({ sourceApp: 'sns', entityType: 'post', entityId: '303', jobType: 'upsert' }));
    expect(projection.acl).toMatchObject({ accessScope: 'acl', snapshot: { readableUserIds: ['501', '702'], userIds: ['501', '702'] } });
    expect(findFirst.calls[0]).toMatchObject({ include: { accessRequests: { where: { isActive: true, statusCode: 'approved', OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }] } } } });
  });

  it('skips unsupported SNS entity types and invalid IDs', async () => {
    const { adapter, findFirst } = createAdapter(createPostFixture(), false);

    await expect(adapter.syncObject({
      sourceApp: 'sns',
      entityType: 'comment',
      entityId: '303',
      jobType: 'upsert',
    })).resolves.toMatchObject({
      status: 'skipped',
      reasonCode: 'unsupported_entity_type',
    });

    await expect(adapter.syncObject({
      sourceApp: 'sns',
      entityType: 'post',
      entityId: 'sns-post-303',
      jobType: 'upsert',
    })).resolves.toMatchObject({
      status: 'skipped',
      reasonCode: 'invalid_post_id',
    });

    expect(findFirst.calls).toHaveLength(0);
  });

  it('returns deleted when SNS source requests post deletion', async () => {
    const { adapter, findFirst } = createAdapter(createPostFixture(), false);

    await expect(adapter.syncObject({
      sourceApp: 'sns',
      entityType: 'post',
      entityId: '303',
      jobType: 'delete',
    })).resolves.toMatchObject({
      status: 'deleted',
      reasonCode: 'deleted_by_source',
    });

    expect(findFirst.calls).toHaveLength(0);
  });

  it('skips missing or inactive SNS posts', async () => {
    const { adapter, findFirst } = createAdapter(null, false);

    await expect(adapter.syncObject({
      sourceApp: 'sns',
      entityType: 'post',
      entityId: '303',
      jobType: 'upsert',
    })).resolves.toMatchObject({
      status: 'skipped',
      reasonCode: 'missing_post',
    });

    expect(findFirst.calls).toHaveLength(1);
  });
});
