import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ExtendedPrismaClient } from '@ssoo/database';
import type { CreateProjectRelationDto, ProjectRelationTypeCode } from '@ssoo/types';
import { DatabaseService } from '../../../database/database.service.js';

type TxClient = Omit<
  ExtendedPrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

const PROJECT_RELATION_COMPAT_SOURCE = 'pms-project-relation-compat';
const PROJECT_RELATION_COMPAT_ACTIVITY = 'sync-anchor';
const PROJECT_RELATION_MANUAL_SOURCE = 'pms-project-relation-manual';
const PROJECT_RELATION_MANUAL_CREATE_ACTIVITY = 'manual-create';
const EXPLICIT_PROJECT_RELATION_TYPE_CODES: Array<Extract<ProjectRelationTypeCode, 'linked'>> = [
  'linked',
];

const PROJECT_RELATION_INCLUDE = {
  sourceProject: {
    select: {
      id: true,
      projectName: true,
      statusCode: true,
      stageCode: true,
    },
  },
  targetProject: {
    select: {
      id: true,
      projectName: true,
      statusCode: true,
      stageCode: true,
    },
  },
} as const;

@Injectable()
export class ProjectRelationService {
  constructor(private readonly db: DatabaseService) {}

  async findByProject(projectId: bigint) {
    await this.syncCompatibilityProjectRelations(projectId);

    return this.db.client.projectRelation.findMany({
      where: {
        isActive: true,
        OR: [{ sourceProjectId: projectId }, { targetProjectId: projectId }],
      },
      include: PROJECT_RELATION_INCLUDE,
      orderBy: [
        { relationTypeCode: 'asc' },
        { sourceProjectId: 'asc' },
        { targetProjectId: 'asc' },
      ],
    });
  }

  async create(projectId: bigint, dto: CreateProjectRelationDto) {
    const relationTypeCode = this.parseExplicitRelationTypeCode(dto.relationTypeCode);

    return this.db.client.$transaction(async (tx) => {
      await this.ensureProjectExists(projectId, tx);
      const targetProjectId = await this.resolveExplicitTargetProjectId(
        projectId,
        dto.targetProjectId,
        tx,
      );

      const existing = await tx.projectRelation.findUnique({
        where: {
          pk_pr_project_relation_r_m: {
            sourceProjectId: projectId,
            targetProjectId,
            relationTypeCode,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Project relation already exists');
      }

      return tx.projectRelation.create({
        data: {
          sourceProjectId: projectId,
          targetProjectId,
          relationTypeCode,
          isActive: true,
          memo: this.normalizeMemo(dto.memo),
          lastSource: PROJECT_RELATION_MANUAL_SOURCE,
          lastActivity: PROJECT_RELATION_MANUAL_CREATE_ACTIVITY,
        },
        include: PROJECT_RELATION_INCLUDE,
      });
    });
  }

  async remove(projectId: bigint, targetProjectIdValue: string, relationTypeCodeValue: string) {
    const relationTypeCode = this.parseExplicitRelationTypeCode(relationTypeCodeValue);
    const targetProjectId = this.parseProjectId(targetProjectIdValue);

    const existing = await this.db.client.projectRelation.findUnique({
      where: {
        pk_pr_project_relation_r_m: {
          sourceProjectId: projectId,
          targetProjectId,
          relationTypeCode,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Project relation not found');
    }

    await this.db.client.projectRelation.delete({
      where: {
        pk_pr_project_relation_r_m: {
          sourceProjectId: projectId,
          targetProjectId,
          relationTypeCode,
        },
      },
    });

    return true;
  }

  async syncCompatibilityProjectRelations(
    projectId: bigint,
    tx: TxClient = this.db.client,
    options?: { strict?: boolean },
  ): Promise<void> {
    const strict = options?.strict ?? false;

    const detail = await tx.projectExecutionDetail.findUnique({
      where: { projectId },
      select: { nextProjectId: true },
    });

    await this.syncSuccessorAnchor({
      tx,
      sourceProjectId: projectId,
      targetProjectId: detail?.nextProjectId ?? null,
      strict,
    });

    const inboundDetails = await tx.projectExecutionDetail.findMany({
      where: { nextProjectId: projectId },
      select: { projectId: true },
    });

    for (const inboundDetail of inboundDetails) {
      await this.syncSuccessorAnchor({
        tx,
        sourceProjectId: inboundDetail.projectId,
        targetProjectId: projectId,
        strict: false,
      });
    }
  }

  private async syncSuccessorAnchor(params: {
    tx: TxClient;
    sourceProjectId: bigint;
    targetProjectId: bigint | null;
    strict: boolean;
  }): Promise<void> {
    const { tx, sourceProjectId, strict } = params;
    const targetProjectId = await this.resolveTargetProjectId(
      params.sourceProjectId,
      params.targetProjectId,
      tx,
      strict,
    );

    if (targetProjectId) {
      await tx.projectRelation.upsert({
        where: {
          pk_pr_project_relation_r_m: {
            sourceProjectId,
            targetProjectId,
            relationTypeCode: 'successor',
          },
        },
        update: {
          isActive: true,
          memo: 'Synced from execution detail next project anchor',
          lastSource: PROJECT_RELATION_COMPAT_SOURCE,
          lastActivity: PROJECT_RELATION_COMPAT_ACTIVITY,
        },
        create: {
          sourceProjectId,
          targetProjectId,
          relationTypeCode: 'successor',
          isActive: true,
          memo: 'Synced from execution detail next project anchor',
          lastSource: PROJECT_RELATION_COMPAT_SOURCE,
          lastActivity: PROJECT_RELATION_COMPAT_ACTIVITY,
        },
      });
    }

    await tx.projectRelation.deleteMany({
      where: {
        sourceProjectId,
        relationTypeCode: 'successor',
        lastSource: PROJECT_RELATION_COMPAT_SOURCE,
        ...(targetProjectId
          ? {
              targetProjectId: {
                not: targetProjectId,
              },
            }
          : {}),
      },
    });
  }

  private async resolveTargetProjectId(
    sourceProjectId: bigint,
    targetProjectId: bigint | null,
    tx: TxClient,
    strict: boolean,
  ): Promise<bigint | null> {
    if (!targetProjectId) {
      return null;
    }

    if (sourceProjectId === targetProjectId) {
      if (strict) {
        throw new BadRequestException('후속 프로젝트는 자기 자신일 수 없습니다.');
      }
      return null;
    }

    const targetProject = await tx.project.findUnique({
      where: { id: targetProjectId },
      select: { id: true },
    });

    if (!targetProject) {
      if (strict) {
        throw new NotFoundException('후속 프로젝트를 찾을 수 없습니다.');
      }
      return null;
    }

    return targetProject.id;
  }

  private parseExplicitRelationTypeCode(
    relationTypeCodeValue: string,
  ): Extract<ProjectRelationTypeCode, 'linked'> {
    if (
      EXPLICIT_PROJECT_RELATION_TYPE_CODES.includes(
        relationTypeCodeValue as Extract<ProjectRelationTypeCode, 'linked'>,
      )
    ) {
      return relationTypeCodeValue as Extract<ProjectRelationTypeCode, 'linked'>;
    }

    throw new BadRequestException(
      'explicit 프로젝트 관계 authoring 은 linked relationTypeCode 만 지원합니다.',
    );
  }

  private parseProjectId(projectIdValue: string): bigint {
    try {
      return BigInt(projectIdValue);
    } catch {
      throw new BadRequestException('프로젝트 ID 형식이 올바르지 않습니다.');
    }
  }

  private async ensureProjectExists(
    projectId: bigint,
    tx: TxClient,
    notFoundMessage = '프로젝트를 찾을 수 없습니다.',
  ): Promise<void> {
    const project = await tx.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException(notFoundMessage);
    }
  }

  private async resolveExplicitTargetProjectId(
    sourceProjectId: bigint,
    targetProjectIdValue: string,
    tx: TxClient,
  ): Promise<bigint> {
    const targetProjectId = this.parseProjectId(targetProjectIdValue);

    if (sourceProjectId === targetProjectId) {
      throw new BadRequestException('linked 대상 프로젝트는 자기 자신일 수 없습니다.');
    }

    await this.ensureProjectExists(targetProjectId, tx, 'linked 대상 프로젝트를 찾을 수 없습니다.');
    return targetProjectId;
  }

  private normalizeMemo(memo?: string | null): string | null {
    const normalized = memo?.trim();
    return normalized ? normalized : null;
  }
}
