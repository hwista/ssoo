import type { PmsWorkNotificationService } from '../settings/work-notification.service.js';
import type { CreateTaskDto, UpdateTaskDto } from '@ssoo/types';
import type { AiIndexJobRequest, AiIndexJobSnapshot } from '@ssoo/types/common';
import type { DatabaseService } from '../../../database/database.service.js';
import type { AiIndexingService } from '../../common/ai-index/ai-indexing.service.js';
import { TaskService } from './task.service.js';

interface TaskServiceFixture {
  service: TaskService;
  calls: {
    aiQueue: AiIndexJobRequest[];
    taskCreate: unknown[];
    taskUpdate: unknown[];
    taskDelete: unknown[];
    taskFindMany: unknown[];
    taskFindUnique: unknown[];
    wbsFindFirst: unknown[];
  };
  setTaskFindManyResult: (value: unknown[]) => void;
  setTaskFindUniqueResult: (value: unknown) => void;
  rejectNextAiQueue: (error: Error) => void;
}

function createQueueSnapshot(request: AiIndexJobRequest): AiIndexJobSnapshot {
  return {
    sourceApp: request.sourceApp,
    entityType: request.entityType,
    entityId: request.entityId,
    jobId: '9101',
    jobType: request.jobType ?? 'upsert',
    jobStatus: 'pending',
    priority: request.priority ?? 20,
    attemptCount: 0,
    maxAttempts: request.maxAttempts ?? 3,
    requestedAt: '2026-07-02T00:00:00.000Z',
  };
}

function createTaskServiceFixture(): TaskServiceFixture {
  const calls = {
    aiQueue: [] as AiIndexJobRequest[],
    taskCreate: [] as unknown[],
    taskUpdate: [] as unknown[],
    taskDelete: [] as unknown[],
    taskFindMany: [] as unknown[],
    taskFindUnique: [] as unknown[],
    wbsFindFirst: [] as unknown[],
  };
  const taskRow = {
    id: 77n,
    projectId: 42n,
    taskCode: 'DEV-001',
    taskName: '설비 인터페이스 개발',
  };
  let taskFindManyResult: unknown[] = [];
  let taskFindUniqueResult: unknown = taskRow;
  let nextAiQueueError: Error | undefined;

  const db = {
    client: {
      $transaction: async (run: (client: DatabaseService['client']) => Promise<unknown>) => run(db.client),
      $queryRaw: async () => [],
      task: {
        create: async (args: unknown) => {
          calls.taskCreate.push(args);
          return taskRow;
        },
        update: async (args: unknown) => {
          calls.taskUpdate.push(args);
          return taskRow;
        },
        delete: async (args: unknown) => {
          calls.taskDelete.push(args);
          return taskRow;
        },
        findUnique: async (args: unknown) => {
          calls.taskFindUnique.push(args);
          return taskFindUniqueResult;
        },
        findMany: async (args: unknown) => {
          calls.taskFindMany.push(args);
          return taskFindManyResult;
        },
      },
      wbs: {
        findFirst: async (args: unknown) => {
          calls.wbsFindFirst.push(args);
          return { id: 11n };
        },
      },
    },
  } as unknown as DatabaseService;
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
    service: new TaskService(db, aiIndexingService, { create: async () => [], publish: () => {}, assertAssignee: async () => {} } as unknown as PmsWorkNotificationService),
    calls,
    setTaskFindManyResult: (value: unknown[]) => {
      taskFindManyResult = value;
    },
    setTaskFindUniqueResult: (value: unknown) => {
      taskFindUniqueResult = value;
    },
    rejectNextAiQueue: (error: Error) => {
      nextAiQueueError = error;
    },
  };
}

describe('TaskService AI index queue hooks', () => {
  it('queues PMS AI index upsert job after task create', async () => {
    const fixture = createTaskServiceFixture();
    const dto: CreateTaskDto = {
      taskCode: 'DEV-001',
      taskName: '설비 인터페이스 개발',
      description: 'PLC 실적 수집 인터페이스 구현',
    };

    await expect(fixture.service.create(42n, dto, 1n)).resolves.toMatchObject({
      id: 77n,
      projectId: 42n,
    });

    expect(fixture.calls.taskCreate).toHaveLength(1);
    expect(fixture.calls.aiQueue).toEqual([
      expect.objectContaining({
        sourceApp: 'pms',
        entityType: 'task',
        entityId: '77',
        jobType: 'upsert',
        priority: 20,
        payload: {
          source: 'pms.task',
          reasonCode: 'task_created',
          projectId: '42',
        },
      }),
    ]);
  });

  it('queues PMS AI index upsert job after task update', async () => {
    const fixture = createTaskServiceFixture();
    const dto: UpdateTaskDto = {
      taskName: '설비 인터페이스 개발 보정',
      statusCode: 'in_progress',
    };

    await expect(fixture.service.update(77n, dto, 1n, 42n)).resolves.toMatchObject({
      id: 77n,
      projectId: 42n,
    });

    expect(fixture.calls.taskFindUnique).toHaveLength(1);
    expect(fixture.calls.taskUpdate).toHaveLength(1);
    expect(fixture.calls.aiQueue[0]).toMatchObject({
      sourceApp: 'pms',
      entityType: 'task',
      entityId: '77',
      jobType: 'upsert',
      payload: {
        reasonCode: 'task_updated',
        projectId: '42',
      },
    });
  });

  it('does not fail task update when AI index queue fails', async () => {
    const fixture = createTaskServiceFixture();
    fixture.rejectNextAiQueue(new Error('queue unavailable'));

    await expect(fixture.service.update(77n, {
      taskName: '설비 인터페이스 개발 보정',
    }, 1n, 42n)).resolves.toMatchObject({
      id: 77n,
    });

    expect(fixture.calls.taskUpdate).toHaveLength(1);
    expect(fixture.calls.aiQueue).toHaveLength(1);
  });

  it('queues PMS AI index delete job after task removal', async () => {
    const fixture = createTaskServiceFixture();

    await expect(fixture.service.remove(77n)).resolves.toMatchObject({
      id: 77n,
      projectId: 42n,
    });

    expect(fixture.calls.taskDelete).toEqual([
      {
        where: { id: 77n },
      },
    ]);
    expect(fixture.calls.aiQueue[0]).toMatchObject({
      sourceApp: 'pms',
      entityType: 'task',
      entityId: '77',
      jobType: 'delete',
      priority: 10,
      payload: {
        reasonCode: 'task_deleted',
        projectId: '42',
      },
    });
  });

  it('queues controlled PMS AI index backfill jobs for project tasks', async () => {
    const fixture = createTaskServiceFixture();
    const firstUpdatedAt = new Date('2026-07-02T01:02:03.000Z');
    const secondUpdatedAt = new Date('2026-07-02T01:02:04.000Z');
    fixture.setTaskFindManyResult([
      { id: 77n, projectId: 42n, updatedAt: firstUpdatedAt },
      { id: 78n, projectId: 42n, updatedAt: secondUpdatedAt },
    ]);

    const response = await fixture.service.queueAiIndexBackfill(42n, {
      taskIds: ['77', '78', '77'],
      limit: 10,
      reasonCode: 'manual_task_reindex',
    });

    expect(fixture.calls.taskFindMany).toEqual([
      {
        where: {
          projectId: 42n,
          isActive: true,
          id: { in: [77n, 78n] },
        },
        select: {
          id: true,
          projectId: true,
          updatedAt: true,
        },
        orderBy: [
          { updatedAt: 'desc' },
          { id: 'asc' },
        ],
        take: 10,
      },
    ]);
    expect(fixture.calls.aiQueue).toEqual([
      expect.objectContaining({
        sourceApp: 'pms',
        entityType: 'task',
        entityId: '77',
        jobType: 'backfill',
        priority: 30,
        payload: {
          source: 'pms.task',
          backfill: true,
          includeInactive: false,
          taskUpdatedAt: firstUpdatedAt.toISOString(),
          selectedLimit: 10,
          reasonCode: 'manual_task_reindex',
          projectId: '42',
        },
      }),
      expect.objectContaining({
        entityId: '78',
        jobType: 'backfill',
        priority: 30,
        payload: expect.objectContaining({
          taskUpdatedAt: secondUpdatedAt.toISOString(),
          reasonCode: 'manual_task_reindex',
          projectId: '42',
        }),
      }),
    ]);
    expect(response).toEqual({
      sourceApp: 'pms',
      entityType: 'task',
      jobType: 'backfill',
      projectId: '42',
      requestedCount: 2,
      selectedCount: 2,
      queuedCount: 2,
      failedCount: 0,
      limit: 10,
      includeInactive: false,
      reasonCode: 'manual_task_reindex',
      items: [
        { taskId: '77', status: 'queued' },
        { taskId: '78', status: 'queued' },
      ],
    });
  });

  it('reports PMS task AI index backfill queue failures without aborting the batch', async () => {
    const fixture = createTaskServiceFixture();
    fixture.setTaskFindManyResult([
      { id: 77n, projectId: 42n, updatedAt: new Date('2026-07-02T01:02:03.000Z') },
      { id: 78n, projectId: 42n, updatedAt: new Date('2026-07-02T01:02:04.000Z') },
    ]);
    fixture.rejectNextAiQueue(new Error('queue unavailable'));

    const response = await fixture.service.queueAiIndexBackfill(42n, {});

    expect(fixture.calls.aiQueue).toHaveLength(2);
    expect(response).toMatchObject({
      selectedCount: 2,
      queuedCount: 1,
      failedCount: 1,
      reasonCode: 'task_backfill_requested',
      items: [
        {
          taskId: '77',
          status: 'failed',
          errorMessage: 'queue unavailable',
        },
        {
          taskId: '78',
          status: 'queued',
        },
      ],
    });
  });

  it('rejects invalid PMS task AI index backfill task ids before querying', async () => {
    const fixture = createTaskServiceFixture();

    await expect(fixture.service.queueAiIndexBackfill(42n, {
      taskIds: ['77', 'bad-id'],
    })).rejects.toThrow('유효한 태스크 식별자 목록이 아닙니다.');

    expect(fixture.calls.taskFindMany).toHaveLength(0);
    expect(fixture.calls.aiQueue).toHaveLength(0);
  });
});
