import type { AiIndexJobRequest, AiIndexJobSnapshot } from '@ssoo/types/common';
import type { DatabaseService } from '../../../database/database.service.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import type { AiIndexingService } from '../../common/ai-index/ai-indexing.service.js';
import type { CommonNotificationService } from '../../common/notification/notification.service.js';
import type { AccessService } from '../access/access.service.js';
import type { CreatePostDto, UpdatePostDto } from './dto/post.dto.js';
import { PostService } from './post.service.js';

interface DomainEventCall {
  sourceApp: string;
  eventType: string;
  payload: Record<string, string>;
}

interface PostServiceFixture {
  service: PostService;
  calls: {
    aiQueue: AiIndexJobRequest[];
    domainEvents: DomainEventCall[];
    postCreate: unknown[];
    postUpdate: unknown[];
    postFindUnique: unknown[];
    postTagCreate: unknown[];
    postTagDeleteMany: unknown[];
    tagUpsert: unknown[];
    visibilityRequests: Array<string | null | undefined>;
    sameUserChecks: unknown[];
  };
  setExistingPost: (value: unknown) => void;
  setTransactionFindUniqueResult: (value: unknown) => void;
  rejectNextAiQueue: (error: Error) => void;
}

function createQueueSnapshot(request: AiIndexJobRequest): AiIndexJobSnapshot {
  return {
    sourceApp: request.sourceApp,
    entityType: request.entityType,
    entityId: request.entityId,
    jobId: '9201',
    jobType: request.jobType ?? 'upsert',
    jobStatus: 'pending',
    priority: request.priority ?? 20,
    attemptCount: 0,
    maxAttempts: request.maxAttempts ?? 3,
    requestedAt: '2026-07-02T00:00:00.000Z',
  };
}

function createPostServiceFixture(): PostServiceFixture {
  const calls = {
    aiQueue: [] as AiIndexJobRequest[],
    domainEvents: [] as DomainEventCall[],
    postCreate: [] as unknown[],
    postUpdate: [] as unknown[],
    postFindUnique: [] as unknown[],
    postTagCreate: [] as unknown[],
    postTagDeleteMany: [] as unknown[],
    tagUpsert: [] as unknown[],
    visibilityRequests: [] as Array<string | null | undefined>,
    sameUserChecks: [] as unknown[],
  };
  const postRow = {
    id: 303n,
    authorUserId: 501n,
    title: 'AI/RAG SNS post',
    content: 'SNS post AI index queue hook',
    contentType: 'markdown',
    isActive: true,
    postTags: [],
  };
  let existingPost: unknown = postRow;
  let transactionFindUniqueResult: unknown = postRow;
  let nextAiQueueError: Error | undefined;

  const tx = {
    snsPost: {
      create: async (args: unknown) => {
        calls.postCreate.push(args);
        return postRow;
      },
      update: async (args: unknown) => {
        calls.postUpdate.push(args);
        return postRow;
      },
      findUnique: async (args: unknown) => {
        calls.postFindUnique.push(args);
        return transactionFindUniqueResult;
      },
    },
    snsTag: {
      upsert: async (args: unknown) => {
        calls.tagUpsert.push(args);
        return { id: 700n };
      },
    },
    snsPostTag: {
      create: async (args: unknown) => {
        calls.postTagCreate.push(args);
        return args;
      },
      deleteMany: async (args: unknown) => {
        calls.postTagDeleteMany.push(args);
        return { count: 1 };
      },
    },
  };

  const db = {
    client: {
      $transaction: async <T>(fn: (transactionClient: typeof tx) => Promise<T>) => fn(tx),
      snsPost: {
        findUnique: async (args: unknown) => {
          calls.postFindUnique.push(args);
          return existingPost;
        },
        update: async (args: unknown) => {
          calls.postUpdate.push(args);
          return {
            ...postRow,
            isActive: false,
          };
        },
      },
    },
  } as unknown as DatabaseService;
  const accessService = {
    hasSystemOverride: async () => false,
    assertWritablePost: async (...args: unknown[]) => { calls.sameUserChecks.push(args); },
    resolvePostVisibility: async (_user: TokenPayload, requestedScopeCode?: string | null) => {
      calls.visibilityRequests.push(requestedScopeCode);
      return {
        visibilityScopeCode: requestedScopeCode ?? 'public',
        targetOrgId: null,
      };
    },
    assertSameUserOrOverride: async (...args: unknown[]) => {
      calls.sameUserChecks.push(args);
    },
  } as unknown as AccessService;
  const notificationService = {
    publishDomainEvent: (sourceApp: string, eventType: string, payload: Record<string, string>) => {
      calls.domainEvents.push({ sourceApp, eventType, payload });
    },
  } as unknown as CommonNotificationService;
  const aiIndexingService = {
    queueJob: async (request: AiIndexJobRequest) => {
      calls.aiQueue.push(request);
      if (nextAiQueueError) {
        const error = nextAiQueueError;
        nextAiQueueError = undefined;
        throw error;
      }
      return createQueueSnapshot(request);
    },
  } as unknown as AiIndexingService;

  return {
    service: new PostService(db, accessService, notificationService, aiIndexingService),
    calls,
    setExistingPost: (value: unknown) => {
      existingPost = value;
    },
    setTransactionFindUniqueResult: (value: unknown) => {
      transactionFindUniqueResult = value;
    },
    rejectNextAiQueue: (error: Error) => {
      nextAiQueueError = error;
    },
  };
}

describe('PostService AI index queue hooks', () => {
  const currentUser: TokenPayload = {
    userId: '501',
    loginId: 'sns-user',
  };

  it('queues SNS AI index upsert job after post create', async () => {
    const fixture = createPostServiceFixture();
    const dto: CreatePostDto = {
      title: 'AI/RAG SNS post',
      content: 'SNS post AI index queue hook',
      contentType: 'markdown',
      visibilityScopeCode: 'public',
      tagNames: [],
    };

    await expect(fixture.service.create(dto, currentUser)).resolves.toMatchObject({
      id: 303n,
      authorUserId: 501n,
    });

    expect(fixture.calls.postCreate[0]).toMatchObject({
      data: {
        authorUserId: 501n,
        title: 'AI/RAG SNS post',
        content: 'SNS post AI index queue hook',
        visibilityScopeCode: 'public',
      },
    });
    expect(fixture.calls.domainEvents).toEqual([
      {
        sourceApp: 'sns',
        eventType: 'sns.feed.changed',
        payload: {
          actorUserId: '501',
          userId: '501',
          postId: '303',
        },
      },
    ]);
    expect(fixture.calls.aiQueue).toEqual([
      expect.objectContaining({
        sourceApp: 'sns',
        entityType: 'post',
        entityId: '303',
        jobType: 'upsert',
        priority: 20,
        payload: {
          source: 'sns.post',
          reasonCode: 'post_created',
          actorUserId: '501',
        },
      }),
    ]);
  });

  it('queues SNS AI index upsert job after post update', async () => {
    const fixture = createPostServiceFixture();
    const dto: UpdatePostDto = {
      title: 'Updated SNS post',
      content: 'updated content',
    };

    await expect(fixture.service.update(303n, dto, currentUser)).resolves.toMatchObject({
      id: 303n,
    });

    // The author is accepted directly; per-item grants are checked for other users.
    expect(fixture.calls.sameUserChecks).toHaveLength(0);
    expect(fixture.calls.postUpdate).toHaveLength(1);
    expect(fixture.calls.aiQueue[0]).toMatchObject({
      sourceApp: 'sns',
      entityType: 'post',
      entityId: '303',
      jobType: 'upsert',
      payload: {
        reasonCode: 'post_updated',
        actorUserId: '501',
      },
    });
  });

  it('does not fail post update when SNS AI index queue fails', async () => {
    const fixture = createPostServiceFixture();
    fixture.rejectNextAiQueue(new Error('queue unavailable'));

    await expect(fixture.service.update(303n, {
      content: 'updated content',
    }, currentUser)).resolves.toMatchObject({
      id: 303n,
    });

    expect(fixture.calls.postUpdate).toHaveLength(1);
    expect(fixture.calls.aiQueue).toHaveLength(1);
  });

  it('queues SNS AI index delete job after post soft delete', async () => {
    const fixture = createPostServiceFixture();

    await expect(fixture.service.softDelete(303n, currentUser)).resolves.toMatchObject({
      id: 303n,
      isActive: false,
    });

    expect(fixture.calls.postUpdate[0]).toEqual({
      where: { id: 303n },
      data: { isActive: false },
    });
    expect(fixture.calls.aiQueue[0]).toMatchObject({
      sourceApp: 'sns',
      entityType: 'post',
      entityId: '303',
      jobType: 'delete',
      priority: 10,
      payload: {
        source: 'sns.post',
        reasonCode: 'post_deleted',
        actorUserId: '501',
      },
    });
  });

  it('does not queue SNS AI index job when post update target is missing', async () => {
    const fixture = createPostServiceFixture();
    fixture.setExistingPost(null);

    await expect(fixture.service.update(303n, {
      content: 'missing target',
    }, currentUser)).rejects.toThrow('Post 303 not found');

    expect(fixture.calls.postUpdate).toHaveLength(0);
    expect(fixture.calls.aiQueue).toHaveLength(0);
  });

  it('does not queue SNS AI index job when post create returns no row', async () => {
    const fixture = createPostServiceFixture();
    fixture.setTransactionFindUniqueResult(null);

    await expect(fixture.service.create({
      content: 'SNS post create without returned row',
    }, currentUser)).resolves.toBeNull();

    expect(fixture.calls.aiQueue).toHaveLength(0);
    expect(fixture.calls.domainEvents).toHaveLength(0);
  });
});
