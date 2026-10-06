import type {
  AdvanceStageDto,
  CreateProjectDto,
  ProjectAiIndexBackfillRequest,
  UpdateProjectDto,
  UpsertRequestDetailDto,
} from '@ssoo/types';
import type { AiIndexJobRequest, AiIndexJobSnapshot } from '@ssoo/types/common';
import type { DatabaseService } from '../../../database/database.service.js';
import type { PlatformAdmissionService } from '../../common/onboarding/platform-admission.service.js';
import type { AccessFoundationService } from '../../common/access/access-foundation.service.js';
import type { AiIndexingService } from '../../common/ai-index/ai-indexing.service.js';
import type { ProjectOrgService } from './project-org.service.js';
import type { ProjectRelationService } from './project-relation.service.js';
import { ProjectService } from './project.service.js';

interface ProjectServiceFixture {
  service: ProjectService;
  calls: {
    aiQueue: AiIndexJobRequest[];
    projectCreate: unknown[];
    projectUpdate: unknown[];
    projectDelete: unknown[];
    projectFindMany: unknown[];
    customerFindUnique: unknown[];
    plantSiteFindUnique: unknown[];
    systemInstanceFindUnique: unknown[];
    requestDetailUpsert: unknown[];
    projectStatusUpdateMany: unknown[];
    projectOrgSync: unknown[];
  };
  setProjectFindUniqueResult: (value: unknown) => void;
  setPlantSiteFindUniqueResult: (value: unknown) => void;
  setSystemInstanceFindUniqueResult: (value: unknown) => void;
  setProjectFindManyResult: (value: Array<{ id: bigint; updatedAt: Date }>) => void;
  rejectNextAiQueue: (error: Error) => void;
  rejectProjectDelete: () => void;
}

function createQueueSnapshot(request: AiIndexJobRequest): AiIndexJobSnapshot {
  return {
    sourceApp: request.sourceApp,
    entityType: request.entityType,
    entityId: request.entityId,
    jobId: '9001',
    jobType: request.jobType ?? 'upsert',
    jobStatus: 'pending',
    priority: request.priority ?? 20,
    attemptCount: 0,
    maxAttempts: request.maxAttempts ?? 3,
    requestedAt: '2026-07-02T00:00:00.000Z',
  };
}

function createProjectServiceFixture(): ProjectServiceFixture {
  const calls = {
    aiQueue: [] as AiIndexJobRequest[],
    projectCreate: [] as unknown[],
    projectUpdate: [] as unknown[],
    projectDelete: [] as unknown[],
    projectFindMany: [] as unknown[],
    customerFindUnique: [] as unknown[],
    plantSiteFindUnique: [] as unknown[],
    systemInstanceFindUnique: [] as unknown[],
    requestDetailUpsert: [] as unknown[],
    projectStatusUpdateMany: [] as unknown[],
    projectOrgSync: [] as unknown[],
  };
  const projectRow = {
    id: 42n,
    projectName: 'AI/RAG PMS Project',
    statusCode: 'request',
    stageCode: 'waiting',
  };
  const requestDetailRow = {
    projectId: 42n,
    requestSummary: 'AI index queue hook',
  };
  let projectFindUniqueResult: unknown = { id: 42n };
  let plantSiteFindUniqueResult: unknown = { siteId: 2001n, customerId: 1001n, isActive: true };
  let systemInstanceFindUniqueResult: unknown = {
    systemInstanceId: 3001n,
    customerId: 1001n,
    siteId: 2001n,
    isActive: true,
  };
  let projectFindManyResult: Array<{ id: bigint; updatedAt: Date }> = [
    {
      id: 42n,
      updatedAt: new Date('2026-07-02T00:00:00.000Z'),
    },
  ];
  let deleteShouldReject = false;
  let nextAiQueueError: Error | undefined;

  const tx = {
    project: {
      create: async (args: unknown) => {
        calls.projectCreate.push(args);
        return projectRow;
      },
      update: async (args: unknown) => {
        calls.projectUpdate.push(args);
        return projectRow;
      },
    },
    projectStatus: {
      updateMany: async (args: unknown) => {
        calls.projectStatusUpdateMany.push(args);
        return { count: 1 };
      },
      upsert: async (args: unknown) => args,
    },
    projectProposalDetail: {
      upsert: async (args: unknown) => args,
    },
    projectExecutionDetail: {
      upsert: async (args: unknown) => args,
    },
    projectTransitionDetail: {
      upsert: async (args: unknown) => args,
    },
    projectContract: {
      findFirst: async () => null,
      create: async (args: unknown) => args,
      update: async (args: unknown) => args,
    },
  };

  const db = {
    client: {
      $transaction: async <T>(fn: (transactionClient: typeof tx) => Promise<T>) => fn(tx),
      projectRequestDetail: {
        upsert: async (args: unknown) => {
          calls.requestDetailUpsert.push(args);
          return requestDetailRow;
        },
      },
      projectProposalDetail: {
        upsert: async (args: unknown) => args,
      },
      projectTransitionDetail: {
        upsert: async (args: unknown) => args,
      },
      projectDeliverable: {
        findMany: async () => [],
      },
      projectCloseCondition: {
        findMany: async () => [],
      },
      userOrganizationRelation: {
        findFirst: async () => null,
      },
      customer: {
        findUnique: async (args: unknown) => {
          calls.customerFindUnique.push(args);
          return { id: 1001n, isActive: true };
        },
      },
      plantSite: {
        findUnique: async (args: unknown) => {
          calls.plantSiteFindUnique.push(args);
          return plantSiteFindUniqueResult;
        },
      },
      systemInstance: {
        findUnique: async (args: unknown) => {
          calls.systemInstanceFindUnique.push(args);
          return systemInstanceFindUniqueResult;
        },
      },
    },
    project: {
      findMany: async (args: unknown) => {
        calls.projectFindMany.push(args);
        return projectFindManyResult;
      },
      findUnique: async () => projectFindUniqueResult,
      delete: async (args: unknown) => {
        calls.projectDelete.push(args);
        if (deleteShouldReject) {
          throw new Error('missing project');
        }
        return projectRow;
      },
    },
  } as unknown as DatabaseService;

  const projectOrgService = {
    syncCompatibilityProjectOrgs: async (...args: unknown[]) => {
      calls.projectOrgSync.push(args);
    },
  } as unknown as ProjectOrgService;
  const projectRelationService = {
    syncCompatibilityProjectRelations: async () => undefined,
  } as unknown as ProjectRelationService;
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

  const service = new ProjectService(
    db,
    {} as AccessFoundationService,
    projectOrgService,
    projectRelationService,
    aiIndexingService,
    { resolveBusinessOrganization: async (_user: bigint, _service: string, id?: string) => BigInt(id ?? '100') } as unknown as PlatformAdmissionService,
  );

  return {
    service,
    calls,
    setProjectFindUniqueResult: (value: unknown) => {
      projectFindUniqueResult = value;
    },
    setPlantSiteFindUniqueResult: (value: unknown) => {
      plantSiteFindUniqueResult = value;
    },
    setSystemInstanceFindUniqueResult: (value: unknown) => {
      systemInstanceFindUniqueResult = value;
    },
    setProjectFindManyResult: (value: Array<{ id: bigint; updatedAt: Date }>) => {
      projectFindManyResult = value;
    },
    rejectNextAiQueue: (error: Error) => {
      nextAiQueueError = error;
    },
    rejectProjectDelete: () => {
      deleteShouldReject = true;
    },
  };
}

describe('ProjectService AI index queue hooks', () => {
  it('queues PMS AI index upsert job after project create', async () => {
    const fixture = createProjectServiceFixture();
    const dto: CreateProjectDto = {
      projectName: 'AI/RAG PMS Project',
      ownerOrganizationId: '100',
    };

    await expect(fixture.service.create(dto, 7n)).resolves.toMatchObject({
      id: 42n,
      projectName: 'AI/RAG PMS Project',
    });

    expect(fixture.calls.projectCreate).toHaveLength(1);
    expect(fixture.calls.projectOrgSync).toHaveLength(1);
    expect(fixture.calls.aiQueue).toEqual([
      expect.objectContaining({
        sourceApp: 'pms',
        entityType: 'project',
        entityId: '42',
        jobType: 'upsert',
        priority: 20,
        payload: {
          source: 'pms.project',
          reasonCode: 'project_created',
        },
      }),
    ]);
  });

  it('stores validated PMS asset anchors after project create', async () => {
    const fixture = createProjectServiceFixture();
    const dto: CreateProjectDto = {
      projectName: 'Asset anchored PMS Project',
      customerId: '1001',
      plantId: '2001',
      systemInstanceId: '3001',
    };

    await fixture.service.create(dto, 7n);

    expect(fixture.calls.customerFindUnique).toHaveLength(1);
    expect(fixture.calls.plantSiteFindUnique).toHaveLength(1);
    expect(fixture.calls.systemInstanceFindUnique).toHaveLength(1);
    expect(fixture.calls.projectCreate[0]).toMatchObject({
      data: {
        customerId: 1001n,
        plantId: 2001n,
        systemInstanceId: 3001n,
      },
    });
  });

  it('rejects project create when selected system instance belongs to another site', async () => {
    const fixture = createProjectServiceFixture();
    fixture.setSystemInstanceFindUniqueResult({
      systemInstanceId: 3001n,
      customerId: 1001n,
      siteId: 2999n,
      isActive: true,
    });

    await expect(fixture.service.create({
      projectName: 'Invalid asset anchored PMS Project',
      customerId: '1001',
      plantId: '2001',
      systemInstanceId: '3001',
    }, 7n)).rejects.toThrow('systemInstanceId belongs to a different plantId');
  });

  it('queues PMS AI index upsert job after project update', async () => {
    const fixture = createProjectServiceFixture();
    const dto: UpdateProjectDto = {
      projectName: 'Updated PMS Project',
      ownerOrganizationId: '100',
    };

    await expect(fixture.service.update(42n, dto, 7n)).resolves.toMatchObject({
      id: 42n,
    });

    expect(fixture.calls.projectUpdate).toHaveLength(1);
    expect(fixture.calls.aiQueue[0]).toMatchObject({
      sourceApp: 'pms',
      entityType: 'project',
      entityId: '42',
      jobType: 'upsert',
      payload: {
        reasonCode: 'project_updated',
      },
    });
  });

  it('stores validated PMS asset anchors after project update', async () => {
    const fixture = createProjectServiceFixture();
    fixture.setProjectFindUniqueResult({
      id: 42n,
      customerId: null,
      plantId: null,
      systemInstanceId: null,
    });

    await fixture.service.update(42n, {
      customerId: '1001',
      plantId: '2001',
      systemInstanceId: '3001',
    }, 7n);

    expect(fixture.calls.projectUpdate[0]).toMatchObject({
      data: {
        customerId: 1001n,
        plantId: 2001n,
        systemInstanceId: 3001n,
      },
    });
  });

  it('does not fail project update when AI index queue fails', async () => {
    const fixture = createProjectServiceFixture();
    fixture.rejectNextAiQueue(new Error('queue unavailable'));

    await expect(fixture.service.update(42n, {
      projectName: 'Updated PMS Project',
      ownerOrganizationId: '100',
    }, 7n)).resolves.toMatchObject({
      id: 42n,
    });

    expect(fixture.calls.projectUpdate).toHaveLength(1);
    expect(fixture.calls.aiQueue).toHaveLength(1);
  });

  it('queues controlled PMS AI index backfill jobs for active projects', async () => {
    const fixture = createProjectServiceFixture();
    fixture.setProjectFindManyResult([
      {
        id: 42n,
        updatedAt: new Date('2026-07-02T01:00:00.000Z'),
      },
      {
        id: 43n,
        updatedAt: new Date('2026-07-02T02:00:00.000Z'),
      },
    ]);
    const request: ProjectAiIndexBackfillRequest = {
      projectIds: ['42', '43', '42'],
      limit: 10,
      reasonCode: 'manual_reindex',
    };

    await expect(fixture.service.queueAiIndexBackfill(request, {
      userId: '7',
      loginId: 'admin',
    })).resolves.toMatchObject({
      sourceApp: 'pms',
      entityType: 'project',
      jobType: 'backfill',
      requestedCount: 2,
      selectedCount: 2,
      queuedCount: 2,
      failedCount: 0,
      limit: 10,
      includeInactive: false,
      reasonCode: 'manual_reindex',
      items: [
        { projectId: '42', status: 'queued' },
        { projectId: '43', status: 'queued' },
      ],
    });

    expect(fixture.calls.projectFindMany[0]).toMatchObject({
      where: {
        isActive: true,
        id: { in: [42n, 43n] },
      },
      select: {
        id: true,
        updatedAt: true,
      },
      take: 10,
    });
    expect(fixture.calls.aiQueue).toEqual([
      expect.objectContaining({
        sourceApp: 'pms',
        entityType: 'project',
        entityId: '42',
        jobType: 'backfill',
        priority: 30,
        payload: {
          source: 'pms.project',
          backfill: true,
          includeInactive: false,
          projectUpdatedAt: '2026-07-02T01:00:00.000Z',
          selectedLimit: 10,
          reasonCode: 'manual_reindex',
        },
      }),
      expect.objectContaining({
        sourceApp: 'pms',
        entityType: 'project',
        entityId: '43',
        jobType: 'backfill',
        priority: 30,
      }),
    ]);
  });

  it('reports PMS AI index backfill queue failures without aborting the batch', async () => {
    const fixture = createProjectServiceFixture();
    fixture.setProjectFindManyResult([
      {
        id: 42n,
        updatedAt: new Date('2026-07-02T01:00:00.000Z'),
      },
      {
        id: 43n,
        updatedAt: new Date('2026-07-02T02:00:00.000Z'),
      },
    ]);
    fixture.rejectNextAiQueue(new Error('queue unavailable'));

    await expect(fixture.service.queueAiIndexBackfill({ limit: 2 })).resolves.toMatchObject({
      selectedCount: 2,
      queuedCount: 1,
      failedCount: 1,
      items: [
        {
          projectId: '42',
          status: 'failed',
          errorMessage: 'queue unavailable',
        },
        {
          projectId: '43',
          status: 'queued',
        },
      ],
    });
    expect(fixture.calls.aiQueue).toHaveLength(2);
  });

  it('rejects invalid PMS AI index backfill project ids before querying', async () => {
    const fixture = createProjectServiceFixture();

    await expect(fixture.service.queueAiIndexBackfill({
      projectIds: ['42', 'not-a-number'],
    })).rejects.toThrow('유효한 프로젝트 식별자 목록이 아닙니다.');

    expect(fixture.calls.projectFindMany).toHaveLength(0);
    expect(fixture.calls.aiQueue).toHaveLength(0);
  });

  it('does not queue PMS AI index job when project update target is missing', async () => {
    const fixture = createProjectServiceFixture();
    fixture.setProjectFindUniqueResult(null);

    await expect(fixture.service.update(42n, {
      projectName: 'Missing PMS Project',
      ownerOrganizationId: '100',
    }, 7n)).resolves.toBeNull();

    expect(fixture.calls.projectUpdate).toHaveLength(0);
    expect(fixture.calls.aiQueue).toHaveLength(0);
  });

  it('queues PMS AI index delete job after project removal', async () => {
    const fixture = createProjectServiceFixture();

    await expect(fixture.service.remove(42n)).resolves.toBe(true);

    expect(fixture.calls.projectDelete).toEqual([
      {
        where: { id: 42n },
      },
    ]);
    expect(fixture.calls.aiQueue[0]).toMatchObject({
      sourceApp: 'pms',
      entityType: 'project',
      entityId: '42',
      jobType: 'delete',
      priority: 10,
      payload: {
        reasonCode: 'project_deleted',
      },
    });
  });

  it('does not queue PMS AI index delete job when project removal fails', async () => {
    const fixture = createProjectServiceFixture();
    fixture.rejectProjectDelete();

    await expect(fixture.service.remove(42n)).resolves.toBe(false);

    expect(fixture.calls.projectDelete).toHaveLength(1);
    expect(fixture.calls.aiQueue).toHaveLength(0);
  });

  it('queues PMS AI index upsert job after request detail upsert', async () => {
    const fixture = createProjectServiceFixture();
    const dto: UpsertRequestDetailDto = {
      requestSummary: 'AI index detail sync',
    };

    await expect(fixture.service.upsertRequestDetail(42n, dto)).resolves.toMatchObject({
      projectId: 42n,
      requestSummary: 'AI index queue hook',
    });

    expect(fixture.calls.requestDetailUpsert).toHaveLength(1);
    expect(fixture.calls.aiQueue[0]).toMatchObject({
      sourceApp: 'pms',
      entityType: 'project',
      entityId: '42',
      jobType: 'upsert',
      payload: {
        reasonCode: 'request_detail_upserted',
      },
    });
  });

  it('queues PMS AI index upsert job after stage advance', async () => {
    const fixture = createProjectServiceFixture();
    fixture.setProjectFindUniqueResult({
      id: 42n,
      statusCode: 'request',
      stageCode: 'waiting',
    });
    const dto: AdvanceStageDto = {
      targetStage: 'in_progress',
    };

    await expect(fixture.service.advanceStage(42n, dto)).resolves.toMatchObject({
      previousStatusCode: 'request',
      currentStatusCode: 'request',
      currentStageCode: 'in_progress',
    });

    expect(fixture.calls.projectStatusUpdateMany).toHaveLength(1);
    expect(fixture.calls.aiQueue[0]).toMatchObject({
      sourceApp: 'pms',
      entityType: 'project',
      entityId: '42',
      jobType: 'upsert',
      payload: {
        reasonCode: 'stage_advanced',
      },
    });
  });
});
