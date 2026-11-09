import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@ssoo/database';
import type { ManagedAiJob, ParticipationPage } from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import { PlatformAdmissionService } from '../onboarding/platform-admission.service.js';
import { participationId, assertParticipationReason } from '../onboarding/participation-write.service.js';
import type { AiJobListQuery, RetryAiJobDto } from './dto/ai-job-operations.dto.js';

type AiIndexJob = Prisma.AiIndexJobGetPayload<Record<string, never>>;

function metadata(value: Prisma.JsonValue | null): Prisma.JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

@Injectable()
export class AiJobOperationsService {
  constructor(private readonly db: DatabaseService, private readonly admission: PlatformAdmissionService) {}

  private item(job: AiIndexJob): ManagedAiJob {
    const info = metadata(job.metadataJson);
    const retryJobId = typeof info.manualRetryJobId === 'string' ? info.manualRetryJobId : null;
    const retryOfJobId = typeof info.manualRetryOfJobId === 'string' ? info.manualRetryOfJobId : null;
    return {
      id: job.aiIndexJobId.toString(), sourceApp: job.sourceAppCode, entityType: job.entityTypeCode, entityId: job.entityId,
      jobType: job.jobTypeCode, status: job.jobStatusCode, attemptCount: job.attemptCount, maxAttempts: job.maxAttempts,
      requestedAt: job.requestedAt.toISOString(), startedAt: job.startedAt?.toISOString() ?? null,
      finishedAt: job.finishedAt?.toISOString() ?? null, nextRetryAt: job.nextRetryAt?.toISOString() ?? null,
      lastError: job.lastErrorMessage, requestedBy: job.requestedBy?.toString() ?? null, reason: job.memo,
      retryJobId, retryOfJobId, canRetry: job.isActive && job.jobStatusCode === 'failed' && !retryJobId,
      revision: createHash('sha256').update(JSON.stringify([job.updatedAt.toISOString(), job.jobStatusCode, job.attemptCount, retryJobId])).digest('hex'),
    };
  }

  async list(query: AiJobListQuery): Promise<ParticipationPage<ManagedAiJob>> {
    const where: Prisma.AiIndexJobWhereInput = { isActive: true, ...(query.sourceApp ? { sourceAppCode: query.sourceApp } : {}), ...(query.status ? { jobStatusCode: query.status } : {}) };
    const [items, total] = await Promise.all([
      this.db.client.aiIndexJob.findMany({ where, orderBy: [{ requestedAt: 'desc' }, { aiIndexJobId: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.db.client.aiIndexJob.count({ where }),
    ]);
    return { items: items.map(job => this.item(job)), total, page: query.page, pageSize: query.pageSize };
  }

  async detail(id: string) {
    const job = await this.db.client.aiIndexJob.findUnique({ where: { aiIndexJobId: participationId(id) } });
    if (!job?.isActive) throw new NotFoundException('작업을 찾을 수 없습니다.');
    return this.item(job);
  }

  async retry(id: string, dto: RetryAiJobDto, actor: bigint) {
    const jobId = participationId(id);
    assertParticipationReason(dto.reason);
    try {
      return await this.db.client.$transaction(async tx => {
        if (!await this.admission.isPlatformAdmin(actor, tx)) throw new ForbiddenException('플랫폼 관리자만 AI 작업을 재시도할 수 있습니다.');
        const original = await tx.aiIndexJob.findUnique({ where: { aiIndexJobId: jobId } });
        if (!original?.isActive) throw new NotFoundException('작업을 찾을 수 없습니다.');
        const current = this.item(original);
        if (current.revision !== dto.expectedRevision) throw new ConflictException('작업 상태가 변경됐습니다. 다시 조회해 주세요.');
        if (!current.canRetry) throw new BadRequestException('재시도되지 않은 실패 작업만 다시 대기열에 등록할 수 있습니다.');
        // Keep the failed execution and its attempts intact; link a bounded new execution.
        const info = metadata(original.metadataJson);
        const retry = await tx.aiIndexJob.create({ data: {
          aiSourceId: original.aiSourceId, aiObjectId: original.aiObjectId, sourceAppCode: original.sourceAppCode,
          entityTypeCode: original.entityTypeCode, entityId: original.entityId, jobTypeCode: original.jobTypeCode,
          sourceVersion: original.sourceVersion, priorityNo: original.priorityNo, maxAttempts: Math.min(20, Math.max(1, original.maxAttempts)),
          ...(original.payloadJson !== null ? { payloadJson: original.payloadJson as Prisma.InputJsonValue } : {}),
          metadataJson: { ...(info.safety ? { safety: info.safety } : {}), manualRetryOfJobId: id } as Prisma.InputJsonObject,
          requestedBy: actor, createdBy: actor, updatedBy: actor, memo: dto.reason.trim(), lastSource: 'admin-ai-operations', lastActivity: 'job.retry.request',
        } });
        await tx.aiIndexJob.update({ where: { aiIndexJobId: jobId }, data: {
          metadataJson: { ...info, manualRetryJobId: retry.aiIndexJobId.toString() } as Prisma.InputJsonObject,
          updatedBy: actor, lastSource: 'admin-ai-operations', lastActivity: 'job.retry.link',
        } });
        return this.item(retry);
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2034') throw new ConflictException('다른 운영자가 작업을 변경했습니다. 다시 조회해 주세요.');
      throw error;
    }
  }
}
