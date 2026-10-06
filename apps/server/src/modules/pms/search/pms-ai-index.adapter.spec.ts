import type { ProjectAccessService } from '../project/project-access.service.js';
import type { AiIndexObjectProjection } from '@ssoo/types/common';
import type { DatabaseService } from '../../../database/database.service.js';
import type { AiEmbeddingProviderService } from '../../common/ai-index/ai-embedding-provider.service.js';
import { AiIndexRegistryService } from '../../common/ai-index/ai-index-registry.service.js';
import { assertAiIndexObjectProjection } from '../../common/ai-index/ai-index-projection.validator.js';
import { PmsAiIndexAdapter } from './pms-ai-index.adapter.js';

type FindUniqueProject = (args: unknown) => Promise<unknown>;
type FindFirstTask = (args: unknown) => Promise<unknown>;
type FindFirstProjectMember = (args: unknown) => Promise<unknown>;
type FindFirstProjectStatus = (args: unknown) => Promise<unknown>;

interface FindUniqueProjectMock extends FindUniqueProject {
  calls: unknown[];
}

interface FindFirstTaskMock extends FindFirstTask {
  calls: unknown[];
}

interface FindFirstProjectMemberMock extends FindFirstProjectMember {
  calls: unknown[];
}

interface FindFirstProjectStatusMock extends FindFirstProjectStatus {
  calls: unknown[];
}

function createProjectFixture() {
  return {
    id: 42n,
    projectName: 'MES 고도화 프로젝트',
    statusCode: 'execution',
    stageCode: 'in_progress',
    doneResultCode: null,
    currentOwnerUserId: 7n,
    ownerOrganizationId: 100n,
    customerId: 200n,
    plantId: null,
    systemInstanceId: 300n,
    handoffTypeCode: 'PM_TO_SM',
    handoffStatusCode: 'waiting',
    handoffRequestedAt: new Date('2026-07-01T01:00:00.000Z'),
    handoffConfirmedAt: null,
    memo: '핵심 제조 실행 관리 범위',
    updatedAt: new Date('2026-07-02T01:00:00.000Z'),
    requestDetail: {
      requestSourceCode: 'customer',
      requestChannelCode: 'meeting',
      requestSummary: '생산 실적과 품질 추적 개선 요청',
      requestReceivedAt: new Date('2026-06-01T00:00:00.000Z'),
      requestPriorityCode: 'high',
      memo: null,
      updatedAt: new Date('2026-06-02T00:00:00.000Z'),
    },
    proposalDetail: {
      proposalDueAt: new Date('2026-06-10T00:00:00.000Z'),
      proposalSubmittedAt: new Date('2026-06-08T00:00:00.000Z'),
      proposalVersion: 2,
      estimateAmount: 120000000n,
      estimateUnitCode: 'KRW',
      proposalScopeSummary: 'MES 생산, 품질, 설비 연계 범위',
      decisionDeadlineAt: new Date('2026-06-15T00:00:00.000Z'),
      memo: '제안 범위 확정',
      updatedAt: new Date('2026-06-09T00:00:00.000Z'),
    },
    executionDetail: {
      contractSignedAt: new Date('2026-06-20T00:00:00.000Z'),
      contractAmount: 110000000n,
      contractUnitCode: 'KRW',
      billingTypeCode: 'milestone',
      deliveryMethodCode: 'onsite',
      memo: null,
      updatedAt: new Date('2026-06-21T00:00:00.000Z'),
    },
    transitionDetail: {
      operationReservedAt: null,
      operationStartAt: null,
      transitionDueAt: new Date('2026-09-30T00:00:00.000Z'),
      transitionSummary: '운영 전환 준비 필요',
      memo: null,
      updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    },
    projectStatuses: [
      {
        statusCode: 'execution',
        statusGoal: '구축과 검증을 완료합니다.',
        expectedStartAt: new Date('2026-06-20T00:00:00.000Z'),
        expectedEndAt: new Date('2026-09-15T00:00:00.000Z'),
        actualStartAt: new Date('2026-06-21T00:00:00.000Z'),
        actualEndAt: null,
        memo: '진행 중',
        updatedAt: new Date('2026-07-02T00:00:00.000Z'),
      },
    ],
    projectMembers: [
      {
        userId: 8n,
        roleCode: 'pm',
        organizationId: 100n,
        accessLevel: 'owner',
        isPhaseOwner: true,
      },
      {
        userId: 9n,
        roleCode: 'developer',
        organizationId: 101n,
        accessLevel: 'participant',
        isPhaseOwner: false,
      },
    ],
    projectOrgs: [
      {
        organizationId: 100n,
        roleCode: 'owner',
      },
      {
        organizationId: 200n,
        roleCode: 'customer',
      },
    ],
  };
}

function createTaskFixture() {
  return {
    id: 77n,
    projectId: 42n,
    wbsId: 11n,
    parentTaskId: 55n,
    taskCode: 'DEV-001',
    taskName: '설비 인터페이스 개발',
    description: 'PLC 실적 수집 인터페이스 구현',
    taskTypeCode: 'development',
    statusCode: 'in_progress',
    priorityCode: 'high',
    assigneeUserId: 9n,
    plannedStartAt: new Date('2026-07-01T00:00:00.000Z'),
    plannedEndAt: new Date('2026-07-10T00:00:00.000Z'),
    actualStartAt: new Date('2026-07-02T00:00:00.000Z'),
    actualEndAt: null,
    progressRate: 45,
    estimatedHours: { toString: () => '80.0' },
    actualHours: { toString: () => '30.5' },
    depth: 1,
    sortOrder: 10,
    memo: '설비 vendor 협의 필요',
    updatedAt: new Date('2026-07-03T00:00:00.000Z'),
    assignee: {
      id: 9n,
      userName: 'kim.dev',
      displayName: '김개발',
    },
    wbs: {
      id: 11n,
      wbsCode: 'WBS-IF',
      wbsName: '설비 인터페이스',
      statusCode: 'in_progress',
    },
    parentTask: {
      id: 55n,
      taskCode: 'DEV',
      taskName: '개발',
    },
    project: {
      id: 42n,
      projectName: 'MES 고도화 프로젝트',
      statusCode: 'execution',
      stageCode: 'in_progress',
      currentOwnerUserId: 7n,
      ownerOrganizationId: 100n,
      updatedAt: new Date('2026-07-02T01:00:00.000Z'),
      projectMembers: [
        {
          userId: 8n,
          roleCode: 'pm',
          organizationId: 100n,
          accessLevel: 'owner',
          isPhaseOwner: true,
        },
        {
          userId: 9n,
          roleCode: 'developer',
          organizationId: 101n,
          accessLevel: 'participant',
          isPhaseOwner: false,
        },
      ],
      projectOrgs: [
        {
          organizationId: 100n,
          roleCode: 'owner',
        },
      ],
    },
  };
}

function createProjectMemberFixture() {
  return {
    projectId: 42n,
    userId: 9n,
    roleCode: 'developer',
    organizationId: 101n,
    accessLevel: 'participant',
    isPhaseOwner: false,
    assignedAt: new Date('2026-07-01T00:00:00.000Z'),
    releasedAt: null,
    allocationRate: 80,
    memo: '설비 인터페이스 담당',
    updatedAt: new Date('2026-07-03T00:00:00.000Z'),
    user: {
      id: 9n,
      userName: 'kim.dev',
      displayName: '김개발',
      email: 'dev@example.com',
      departmentCode: 'rnd',
      positionCode: 'senior',
    },
    project: {
      id: 42n,
      projectName: 'MES 고도화 프로젝트',
      statusCode: 'execution',
      stageCode: 'in_progress',
      currentOwnerUserId: 7n,
      ownerOrganizationId: 100n,
      updatedAt: new Date('2026-07-02T01:00:00.000Z'),
      projectMembers: createTaskFixture().project.projectMembers,
      projectOrgs: createTaskFixture().project.projectOrgs,
    },
  };
}

function createProjectStatusFixture() {
  return {
    projectId: 42n,
    statusCode: 'execution',
    statusGoal: '구축과 검증을 완료합니다.',
    statusOwnerUserId: 8n,
    expectedStartAt: new Date('2026-06-20T00:00:00.000Z'),
    expectedEndAt: new Date('2026-09-15T00:00:00.000Z'),
    actualStartAt: new Date('2026-06-21T00:00:00.000Z'),
    actualEndAt: null,
    closeConditionGroupCode: 'execution-close',
    memo: '진행 중',
    updatedAt: new Date('2026-07-02T00:00:00.000Z'),
    project: {
      id: 42n,
      projectName: 'MES 고도화 프로젝트',
      statusCode: 'execution',
      stageCode: 'in_progress',
      currentOwnerUserId: 7n,
      ownerOrganizationId: 100n,
      updatedAt: new Date('2026-07-02T01:00:00.000Z'),
      projectMembers: createTaskFixture().project.projectMembers,
      projectOrgs: createTaskFixture().project.projectOrgs,
    },
  };
}

function createAdapter(
  project: unknown,
  embeddingReady = false,
  task: unknown = null,
  projectMember: unknown = null,
  projectStatus: unknown = null,
) {
  const findUnique = (async (args: unknown) => {
    findUnique.calls.push(args);
    return project;
  }) as FindUniqueProjectMock;
  findUnique.calls = [];
  const findFirstTask = (async (args: unknown) => {
    findFirstTask.calls.push(args);
    return task;
  }) as FindFirstTaskMock;
  findFirstTask.calls = [];
  const findFirstProjectMember = (async (args: unknown) => {
    findFirstProjectMember.calls.push(args);
    return projectMember;
  }) as FindFirstProjectMemberMock;
  findFirstProjectMember.calls = [];
  const findFirstProjectStatus = (async (args: unknown) => {
    findFirstProjectStatus.calls.push(args);
    return projectStatus;
  }) as FindFirstProjectStatusMock;
  findFirstProjectStatus.calls = [];
  const db = {
    client: {
      project: {
        findUnique,
      },
      task: {
        findFirst: findFirstTask,
      },
      projectMember: {
        findFirst: findFirstProjectMember,
      },
      projectStatus: {
        findFirst: findFirstProjectStatus,
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
  const adapter = new PmsAiIndexAdapter(db, registry, embeddingProvider, {} as ProjectAccessService);

  return {
    adapter,
    registry,
    findUnique,
    findFirstTask,
    findFirstProjectMember,
    findFirstProjectStatus,
  };
}

function requireProjection(result: { projection?: AiIndexObjectProjection }): AiIndexObjectProjection {
  if (!result.projection) {
    throw new Error('Expected PMS AI index projection');
  }
  return result.projection;
}

describe('PmsAiIndexAdapter', () => {
  it('registers a provider-gated PMS project domain adapter', () => {
    const { adapter, registry } = createAdapter(createProjectFixture(), true);

    adapter.onModuleInit();

    expect(registry.get('pms')).toBe(adapter);
    expect(adapter.capabilities).toMatchObject({
      keyword: true,
      metadata: true,
      semantic: true,
      vector: true,
      ragContext: true,
      indexing: true,
    });
  });

  it('projects PMS project RDB rows into a valid AI index object', async () => {
    const { adapter, findUnique } = createAdapter(createProjectFixture(), false);

    const result = await adapter.syncObject({
      sourceApp: 'pms',
      entityType: 'project',
      entityId: '42',
      jobType: 'upsert',
    });
    const projection = requireProjection(result);

    expect(result.status).toBe('indexed');
    expect(findUnique.calls[0]).toMatchObject({
      where: {
        id: 42n,
        isActive: true,
      },
    });
    expect(() => assertAiIndexObjectProjection(projection)).not.toThrow();
    expect(projection).toMatchObject({
      sourceApp: 'pms',
      sourceKind: 'domain',
      adapterCode: 'pms.project.ai-index',
      entityType: 'project',
      entityId: '42',
      title: 'MES 고도화 프로젝트',
      target: {
        sourceApp: 'pms',
        path: '/project/detail',
      },
      sensitivity: 'internal',
      capabilities: {
        semantic: false,
        vector: false,
        ragContext: false,
      },
    });
    expect(projection.bodyText).toContain('생산 실적과 품질 추적 개선 요청');
    expect(projection.bodyText).toContain('MES 생산, 품질, 설비 연계 범위');
    expect(projection.bodyText).toContain('운영 전환 준비 필요');
    expect(projection.bodyText).not.toContain('Customer id:');
    expect(projection.bodyText).not.toContain('Plant id:');
    expect(projection.bodyText).not.toContain('System instance id:');
    expect(projection.chunks?.map((chunk) => chunk.chunkKey)).toEqual([
      'pms-project-overview',
      'pms-project-request',
      'pms-project-proposal',
      'pms-project-execution',
      'pms-project-transition',
      'pms-project-status',
      'pms-project-handoff',
    ]);
    expect(projection.acl).toMatchObject({
      accessScope: 'acl',
      sensitivity: 'internal',
      searchEligible: true,
      contextEligible: true,
    });
    expect(projection.acl.snapshot['readableUserIds']).toEqual(['7', '8', '9']);
    expect(projection.acl.snapshot['organizationIds']).toEqual(['100', '101', '200']);
    expect(projection.metadata).toMatchObject({
      projectId: '42',
      statusCode: 'execution',
      stageCode: 'in_progress',
      projectMemberCount: 2,
      projectOrgCount: 2,
    });
  });

  it('projects PMS task RDB rows into a valid AI index object', async () => {
    const { adapter, findFirstTask } = createAdapter(createProjectFixture(), false, createTaskFixture());

    const result = await adapter.syncObject({
      sourceApp: 'pms',
      entityType: 'task',
      entityId: '77',
      jobType: 'upsert',
    });
    const projection = requireProjection(result);

    expect(result.status).toBe('indexed');
    expect(findFirstTask.calls[0]).toMatchObject({
      where: {
        id: 77n,
        isActive: true,
        project: {
          isActive: true,
        },
      },
    });
    expect(() => assertAiIndexObjectProjection(projection)).not.toThrow();
    expect(projection).toMatchObject({
      sourceApp: 'pms',
      sourceKind: 'domain',
      adapterCode: 'pms.project.ai-index',
      entityType: 'task',
      entityId: '77',
      title: '설비 인터페이스 개발',
      target: {
        sourceApp: 'pms',
        path: '/project/detail',
      },
      sensitivity: 'internal',
    });
    expect(projection.bodyText).toContain('PLC 실적 수집 인터페이스 구현');
    expect(projection.bodyText).toContain('WBS-IF');
    expect(projection.bodyText).toContain('김개발');
    expect(projection.bodyText).not.toContain('Assignee user id:');
    expect(projection.chunks?.map((chunk) => chunk.chunkKey)).toEqual([
      'pms-task-overview',
      'pms-task-schedule',
      'pms-task-assignment',
    ]);
    expect(projection.acl.snapshot['readableUserIds']).toEqual(['7', '9', '8']);
    expect(projection.acl.snapshot['organizationIds']).toEqual(['100', '101']);
    expect(projection.metadata).toMatchObject({
      projectId: '42',
      taskId: '77',
      taskCode: 'DEV-001',
      statusCode: 'in_progress',
      priorityCode: 'high',
    });
  });

  it('projects PMS project member RDB rows into a valid AI index object', async () => {
    const { adapter, findFirstProjectMember } = createAdapter(
      createProjectFixture(),
      false,
      createTaskFixture(),
      createProjectMemberFixture(),
    );

    const result = await adapter.syncObject({
      sourceApp: 'pms',
      entityType: 'projectMember',
      entityId: '42:9:developer',
      jobType: 'upsert',
    });
    const projection = requireProjection(result);

    expect(result.status).toBe('indexed');
    expect(findFirstProjectMember.calls[0]).toMatchObject({
      where: {
        projectId: 42n,
        userId: 9n,
        roleCode: 'developer',
        isActive: true,
        project: {
          isActive: true,
        },
      },
    });
    expect(() => assertAiIndexObjectProjection(projection)).not.toThrow();
    expect(projection).toMatchObject({
      sourceApp: 'pms',
      sourceKind: 'domain',
      adapterCode: 'pms.project.ai-index',
      entityType: 'projectMember',
      entityId: '42:9:developer',
      title: 'MES 고도화 프로젝트 · 김개발 · developer',
      target: {
        sourceApp: 'pms',
        path: '/project/detail',
      },
      sensitivity: 'internal',
    });
    expect(projection.bodyText).toContain('설비 인터페이스 담당');
    expect(projection.bodyText).toContain('김개발');
    expect(projection.bodyText).toContain('developer');
    expect(projection.bodyText).not.toContain('Organization id:');
    expect(projection.bodyText).not.toContain('Project owner user id:');
    expect(projection.bodyText).not.toContain('Project owner organization id:');
    expect(projection.chunks?.map((chunk) => chunk.chunkKey)).toEqual([
      'pms-project-member-assignment',
      'pms-project-member-project-context',
    ]);
    expect(projection.acl.snapshot['readableUserIds']).toEqual(['7', '9', '8']);
    expect(projection.metadata).toMatchObject({
      projectId: '42',
      userId: '9',
      roleCode: 'developer',
      accessLevel: 'participant',
    });
  });

  it('projects PMS project status RDB rows into a valid AI index object', async () => {
    const { adapter, findFirstProjectStatus } = createAdapter(
      createProjectFixture(),
      false,
      createTaskFixture(),
      createProjectMemberFixture(),
      createProjectStatusFixture(),
    );

    const result = await adapter.syncObject({
      sourceApp: 'pms',
      entityType: 'projectStatus',
      entityId: '42:execution',
      jobType: 'upsert',
    });
    const projection = requireProjection(result);

    expect(result.status).toBe('indexed');
    expect(findFirstProjectStatus.calls[0]).toMatchObject({
      where: {
        projectId: 42n,
        statusCode: 'execution',
        isActive: true,
        project: {
          isActive: true,
        },
      },
    });
    expect(() => assertAiIndexObjectProjection(projection)).not.toThrow();
    expect(projection).toMatchObject({
      sourceApp: 'pms',
      sourceKind: 'domain',
      adapterCode: 'pms.project.ai-index',
      entityType: 'projectStatus',
      entityId: '42:execution',
      title: 'MES 고도화 프로젝트 · execution',
      target: {
        sourceApp: 'pms',
        path: '/project/detail',
      },
      sensitivity: 'internal',
    });
    expect(projection.bodyText).toContain('구축과 검증을 완료합니다.');
    expect(projection.bodyText).toContain('execution-close');
    expect(projection.bodyText).not.toContain('Status owner user id:');
    expect(projection.bodyText).not.toContain('Project owner user id:');
    expect(projection.bodyText).not.toContain('Project owner organization id:');
    expect(projection.chunks?.map((chunk) => chunk.chunkKey)).toEqual([
      'pms-project-status-detail',
      'pms-project-status-schedule',
      'pms-project-status-project-context',
    ]);
    expect(projection.acl.snapshot['readableUserIds']).toEqual(['7', '8', '9']);
    expect(projection.metadata).toMatchObject({
      projectId: '42',
      statusCode: 'execution',
      statusOwnerUserId: '8',
    });
  });

  it('skips unsupported or invalid references before DB lookup', async () => {
    const {
      adapter,
      findUnique,
      findFirstTask,
      findFirstProjectMember,
      findFirstProjectStatus,
    } = createAdapter(createProjectFixture());

    await expect(adapter.syncObject({
      sourceApp: 'pms',
      entityType: 'milestone',
      entityId: '42',
      jobType: 'upsert',
    })).resolves.toMatchObject({
      status: 'skipped',
      reasonCode: 'unsupported_entity_type',
    });
    await expect(adapter.syncObject({
      sourceApp: 'pms',
      entityType: 'project',
      entityId: 'not-a-number',
      jobType: 'upsert',
    })).resolves.toMatchObject({
      status: 'skipped',
      reasonCode: 'invalid_project_id',
    });
    await expect(adapter.syncObject({
      sourceApp: 'pms',
      entityType: 'task',
      entityId: 'not-a-number',
      jobType: 'upsert',
    })).resolves.toMatchObject({
      status: 'skipped',
      reasonCode: 'invalid_task_id',
    });
    await expect(adapter.syncObject({
      sourceApp: 'pms',
      entityType: 'projectMember',
      entityId: 'not-a-member',
      jobType: 'upsert',
    })).resolves.toMatchObject({
      status: 'skipped',
      reasonCode: 'invalid_project_member_id',
    });
    await expect(adapter.syncObject({
      sourceApp: 'pms',
      entityType: 'projectStatus',
      entityId: 'not-a-status',
      jobType: 'upsert',
    })).resolves.toMatchObject({
      status: 'skipped',
      reasonCode: 'invalid_project_status_id',
    });
    expect(findUnique.calls).toHaveLength(0);
    expect(findFirstTask.calls).toHaveLength(0);
    expect(findFirstProjectMember.calls).toHaveLength(0);
    expect(findFirstProjectStatus.calls).toHaveLength(0);
  });

  it('maps delete and missing rows without creating projections', async () => {
    const deleteAdapter = createAdapter(createProjectFixture()).adapter;
    const missing = createAdapter(null);
    const missingTask = createAdapter(createProjectFixture(), false, null);
    const missingMember = createAdapter(createProjectFixture(), false, createTaskFixture(), null);
    const missingStatus = createAdapter(createProjectFixture(), false, createTaskFixture(), null, null);

    await expect(deleteAdapter.syncObject({
      sourceApp: 'pms',
      entityType: 'project',
      entityId: '42',
      jobType: 'delete',
    })).resolves.toMatchObject({
      status: 'deleted',
      reasonCode: 'deleted_by_source',
    });
    await expect(missing.adapter.syncObject({
      sourceApp: 'pms',
      entityType: 'project',
      entityId: '42',
      jobType: 'upsert',
    })).resolves.toMatchObject({
      status: 'skipped',
      reasonCode: 'missing_project',
    });
    await expect(deleteAdapter.syncObject({
      sourceApp: 'pms',
      entityType: 'task',
      entityId: '77',
      jobType: 'delete',
    })).resolves.toMatchObject({
      status: 'deleted',
      reasonCode: 'deleted_by_source',
    });
    await expect(missingTask.adapter.syncObject({
      sourceApp: 'pms',
      entityType: 'task',
      entityId: '77',
      jobType: 'upsert',
    })).resolves.toMatchObject({
      status: 'skipped',
      reasonCode: 'missing_task',
    });
    await expect(deleteAdapter.syncObject({
      sourceApp: 'pms',
      entityType: 'projectMember',
      entityId: '42:9:developer',
      jobType: 'delete',
    })).resolves.toMatchObject({
      status: 'deleted',
      reasonCode: 'deleted_by_source',
    });
    await expect(missingMember.adapter.syncObject({
      sourceApp: 'pms',
      entityType: 'projectMember',
      entityId: '42:9:developer',
      jobType: 'upsert',
    })).resolves.toMatchObject({
      status: 'skipped',
      reasonCode: 'missing_project_member',
    });
    await expect(deleteAdapter.syncObject({
      sourceApp: 'pms',
      entityType: 'projectStatus',
      entityId: '42:execution',
      jobType: 'delete',
    })).resolves.toMatchObject({
      status: 'deleted',
      reasonCode: 'deleted_by_source',
    });
    await expect(missingStatus.adapter.syncObject({
      sourceApp: 'pms',
      entityType: 'projectStatus',
      entityId: '42:execution',
      jobType: 'upsert',
    })).resolves.toMatchObject({
      status: 'skipped',
      reasonCode: 'missing_project_status',
    });
    expect(missing.findUnique.calls).toHaveLength(1);
    expect(missingTask.findFirstTask.calls).toHaveLength(1);
    expect(missingMember.findFirstProjectMember.calls).toHaveLength(1);
    expect(missingStatus.findFirstProjectStatus.calls).toHaveLength(1);
  });
});
