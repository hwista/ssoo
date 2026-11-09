import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { AiEmbeddingProviderService } from './ai-embedding-provider.service.js';
import { AiIndexRegistryService } from './ai-index-registry.service.js';
import type { AiIndexSourceApp } from '@ssoo/types/common';

@Injectable()
export class EmbeddingReindexService {
  constructor(private readonly db: DatabaseService, private readonly provider: AiEmbeddingProviderService, private readonly registry: AiIndexRegistryService) {}

  async enqueue(sourceApp: AiIndexSourceApp, reason: string, actor: bigint) {
    if (!reason.trim()) throw new BadRequestException('재색인 사유를 입력해 주세요.');
    if (!this.registry.get(sourceApp)) throw new BadRequestException('등록된 색인 어댑터가 없는 애플리케이션입니다.');
    const status = this.provider.getStatus();
    if (!status.ready) throw new BadRequestException('임베딩을 활성화하고 실제 생성 확인을 먼저 완료하세요.');
    return this.db.client.$transaction(async tx => {
      await tx.$queryRawUnsafe("SELECT pg_advisory_xact_lock(hashtext('ssoo.embedding-reindex'))::text");
      const rows = await tx.$queryRawUnsafe<Array<{ ai_object_id: bigint; ai_source_id: bigint; entity_type_code: string; entity_id: string }>>(`
        SELECT o.ai_object_id, o.ai_source_id, o.entity_type_code, o.entity_id
        FROM common.cm_ai_object_m o
        WHERE o.source_app_code=$1 AND o.is_active AND o.search_eligible
          AND EXISTS (SELECT 1 FROM common.cm_ai_chunk_m c WHERE c.ai_object_id=o.ai_object_id AND c.is_active
            AND NOT EXISTS (SELECT 1 FROM common.cm_ai_embedding_m e WHERE e.ai_chunk_id=c.ai_chunk_id AND e.is_active
              AND e.profile_code=$2 AND e.provider_code=$3 AND e.model_name IS NOT DISTINCT FROM $4
              AND e.deployment_name IS NOT DISTINCT FROM $5 AND e.embedding_dimension=$6 AND e.embedding_hash=c.content_hash))
          AND NOT EXISTS (SELECT 1 FROM common.cm_ai_index_job_m j WHERE j.source_app_code=o.source_app_code
            AND j.entity_type_code=o.entity_type_code AND j.entity_id=o.entity_id AND j.is_active AND j.job_status_code IN ('pending','running'))
        ORDER BY o.ai_object_id LIMIT 20`, sourceApp, status.profileCode, status.providerCode, status.modelName ?? null, status.deploymentName ?? null, status.dimension);
      if (rows.length) await tx.aiIndexJob.createMany({ data: rows.map(row => ({
        aiSourceId: row.ai_source_id, aiObjectId: row.ai_object_id, sourceAppCode: sourceApp,
        entityTypeCode: row.entity_type_code, entityId: row.entity_id, jobTypeCode: 'refresh', requestedBy: actor,
        memo: reason.trim(), payloadJson: { source: 'admin.embedding-reindex' },
        createdBy: actor, updatedBy: actor, lastSource: 'admin.embedding-reindex', lastActivity: 'queue-model-mismatch',
      })) });
      return { queuedCount: rows.length, message: rows.length ? `${rows.length}건을 대기열에 등록했습니다. 대기 job 실행 후 다시 등록하면 나머지를 이어서 처리합니다.` : '재색인이 필요한 등록 문서가 없거나 이미 대기·실행 중입니다.' };
    });
  }
}
