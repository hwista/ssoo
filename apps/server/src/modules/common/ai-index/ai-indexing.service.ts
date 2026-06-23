import { createHash } from 'crypto';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  AiIndexAdapterSyncRequest,
  AiIndexApplyResult,
  AiIndexChunkProjection,
  AiIndexEmbeddingSyncSnapshot,
  AiIndexJobErrorKind,
  AiIndexJobRequest,
  AiIndexJobRunResult,
  AiIndexJobRunSummary,
  AiIndexJobSafetyInput,
  AiIndexJobSafetySnapshot,
  AiIndexJobSnapshot,
  AiIndexJobStatus,
  AiIndexJobType,
  AiIndexJsonObject,
  AiIndexObjectProjection,
  AiIndexObjectStatus,
  AiIndexSourceApp,
  AiIndexSourceStatus,
} from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { TokenPayload } from '../auth/interfaces/auth.interface.js';
import { AiEmbeddingProviderService } from './ai-embedding-provider.service.js';
import type { AiIndexAdapter } from './ai-index-adapter.js';
import { AiIndexRegistryService } from './ai-index-registry.service.js';

const DEFAULT_JOB_PRIORITY = 100;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BATCH_LIMIT = 20;
const MAX_JOB_BATCH_LIMIT = 100;
const DEFAULT_EMBEDDING_BATCH_SIZE = 16;
const MAX_EMBEDDING_BATCH_SIZE = 64;
const DEFAULT_RETRY_DELAY_MS = 5 * 60 * 1000;
const DEFAULT_RETRY_BACKOFF_MULTIPLIER = 2;
const DEFAULT_MAX_RETRY_DELAY_MS = 60 * 60 * 1000;
const DEFAULT_PROFILE_CODE = 'default';

interface SourceIdRow {
  ai_source_id: bigint;
}

interface ObjectIdRow {
  ai_object_id: bigint;
}

interface ChunkIdRow {
  ai_chunk_id: bigint;
}

interface ActiveChunkRow {
  ai_chunk_id: bigint;
  chunk_key: string;
  chunk_seq: number;
  chunk_text: string;
  content_hash: string;
}

interface EmbeddingCandidateRow {
  ai_chunk_id: bigint;
  chunk_key: string;
  chunk_seq: number;
  chunk_text: string;
  content_hash: string;
  embedding_hash: string | null;
}

interface CountRow {
  count: bigint | number;
}

interface JobRow {
  ai_index_job_id: bigint;
  ai_object_id: bigint | null;
  source_app_code: string;
  entity_type_code: string;
  entity_id: string;
  job_type_code: string;
  job_status_code: string;
  priority_no: number;
  attempt_count: number;
  max_attempts: number;
  source_version: string | null;
  requested_at: Date;
  next_retry_at: Date | null;
  last_error_message: string | null;
  payload_jsonb: unknown;
  metadata_jsonb: unknown;
}

type AiEmbeddingSyncSummary = AiIndexEmbeddingSyncSnapshot;

class AiEmbeddingSyncError extends Error {
  readonly summary: AiEmbeddingSyncSummary;

  constructor(summary: AiEmbeddingSyncSummary) {
    super(summary.reasonMessage ?? 'AI embedding sync failed.');
    this.name = 'AiEmbeddingSyncError';
    this.summary = summary;
  }
}

interface SourceStatusRow {
  source_app_code: string;
  source_name: string;
  source_status_code: string;
  indexing_enabled: boolean;
  keyword_search_enabled: boolean;
  metadata_search_enabled: boolean;
  semantic_search_enabled: boolean;
  vector_search_enabled: boolean;
  rag_context_enabled: boolean;
  is_active: boolean;
  object_count: bigint | number;
  pending_count: bigint | number;
  indexed_count: bigint | number;
  skipped_count: bigint | number;
  failed_count: bigint | number;
  stale_count: bigint | number;
  deleted_count: bigint | number;
  last_indexed_at: Date | null;
  last_failed_at: Date | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toJsonObject(value: unknown): AiIndexJsonObject | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as AiIndexJsonObject;
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? {});
}

function hashText(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function toNumber(value: bigint | number): number {
  return typeof value === 'bigint' ? Number(value) : value;
}

function toIsoString(value: Date | null): string | undefined {
  return value ? value.toISOString() : undefined;
}

function normalizeJobType(jobType?: AiIndexJobType): AiIndexJobType {
  return jobType ?? 'upsert';
}

function normalizeJobStatus(status: string): AiIndexJobStatus {
  if (
    status === 'pending'
    || status === 'running'
    || status === 'indexed'
    || status === 'skipped'
    || status === 'failed'
    || status === 'cancelled'
  ) {
    return status;
  }

  return 'failed';
}

function vectorToSqlLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : undefined;
  }

  return undefined;
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number): number {
  const numericValue = readNumber(value);
  if (numericValue === undefined) {
    return fallback;
  }

  return Math.max(min, Math.min(Math.floor(numericValue), max));
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numericValue = readNumber(value);
  if (numericValue === undefined) {
    return fallback;
  }

  return Math.max(min, Math.min(numericValue, max));
}

function normalizeSafetyInput(value: unknown): AiIndexJobSafetyInput | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    embeddingBatchSize: readNumber(value.embeddingBatchSize),
    retryDelayMs: readNumber(value.retryDelayMs),
    retryBackoffMultiplier: readNumber(value.retryBackoffMultiplier),
    maxRetryDelayMs: readNumber(value.maxRetryDelayMs),
  };
}

function normalizeJobSafety(
  input: AiIndexJobSafetyInput | undefined,
  maxAttempts: number,
): AiIndexJobSafetySnapshot {
  return {
    embeddingBatchSize: boundedInteger(
      input?.embeddingBatchSize,
      DEFAULT_EMBEDDING_BATCH_SIZE,
      1,
      MAX_EMBEDDING_BATCH_SIZE,
    ),
    maxAttempts,
    retryDelayMs: boundedInteger(input?.retryDelayMs, DEFAULT_RETRY_DELAY_MS, 1000, DEFAULT_MAX_RETRY_DELAY_MS),
    retryBackoffMultiplier: boundedNumber(
      input?.retryBackoffMultiplier,
      DEFAULT_RETRY_BACKOFF_MULTIPLIER,
      1,
      10,
    ),
    maxRetryDelayMs: boundedInteger(
      input?.maxRetryDelayMs,
      DEFAULT_MAX_RETRY_DELAY_MS,
      DEFAULT_RETRY_DELAY_MS,
      24 * 60 * 60 * 1000,
    ),
  };
}

function safetyWithRunLimit(limit: number): AiIndexJobSafetySnapshot {
  return {
    ...normalizeJobSafety(undefined, DEFAULT_MAX_ATTEMPTS),
    jobBatchLimit: limit,
    maxJobBatchLimit: MAX_JOB_BATCH_LIMIT,
  };
}

function extractJobSafety(row: JobRow): AiIndexJobSafetySnapshot {
  const metadata = isRecord(row.metadata_jsonb) ? row.metadata_jsonb : undefined;
  const metadataSafety = metadata ? normalizeSafetyInput(metadata.safety) : undefined;
  return normalizeJobSafety(metadataSafety, row.max_attempts);
}

function computeRetryDelayMs(safety: AiIndexJobSafetySnapshot, attemptCount: number): number {
  const retryIndex = Math.max(0, attemptCount - 1);
  const delay = safety.retryDelayMs * (safety.retryBackoffMultiplier ** retryIndex);
  return Math.min(Math.round(delay), safety.maxRetryDelayMs);
}

function mergeMetadata(metadata: unknown, patch: Record<string, unknown>): AiIndexJsonObject {
  const base = isRecord(metadata) ? metadata : {};
  return JSON.parse(JSON.stringify({ ...base, ...patch })) as AiIndexJsonObject;
}

function isEmbeddingSyncError(error: unknown): error is AiEmbeddingSyncError {
  return error instanceof AiEmbeddingSyncError;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function resolveErrorKind(error: unknown): AiIndexJobErrorKind {
  if (isEmbeddingSyncError(error)) {
    return error.summary.errorKind ?? 'embedding_runtime_failed';
  }

  return 'adapter_failed';
}

@Injectable()
export class AiIndexingService {
  private readonly logger = new Logger(AiIndexingService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly registry: AiIndexRegistryService,
    private readonly embeddingProvider: AiEmbeddingProviderService,
  ) {}

  async getSourceStatuses(sourceApp?: AiIndexSourceApp): Promise<AiIndexSourceStatus[]> {
    await this.ensureRegisteredSources();

    const rows = await this.db.client.$queryRawUnsafe<SourceStatusRow[]>(
      `
      SELECT
        s.source_app_code,
        s.source_name,
        s.source_status_code,
        s.indexing_enabled,
        s.keyword_search_enabled,
        s.metadata_search_enabled,
        s.semantic_search_enabled,
        s.vector_search_enabled,
        s.rag_context_enabled,
        s.is_active,
        COUNT(DISTINCT o.ai_object_id) AS object_count,
        COUNT(DISTINCT CASE WHEN st.index_status_code = 'pending' THEN st.ai_index_state_id END) AS pending_count,
        COUNT(DISTINCT CASE WHEN st.index_status_code = 'indexed' THEN st.ai_index_state_id END) AS indexed_count,
        COUNT(DISTINCT CASE WHEN st.index_status_code = 'skipped' THEN st.ai_index_state_id END) AS skipped_count,
        COUNT(DISTINCT CASE WHEN st.index_status_code = 'failed' THEN st.ai_index_state_id END) AS failed_count,
        COUNT(DISTINCT CASE WHEN st.index_status_code = 'stale' THEN st.ai_index_state_id END) AS stale_count,
        COUNT(DISTINCT CASE WHEN st.index_status_code = 'deleted' THEN st.ai_index_state_id END) AS deleted_count,
        MAX(st.last_indexed_at) AS last_indexed_at,
        MAX(st.last_failed_at) AS last_failed_at
      FROM common.cm_ai_source_m s
      LEFT JOIN common.cm_ai_object_m o
        ON o.ai_source_id = s.ai_source_id
       AND o.is_active = true
      LEFT JOIN common.cm_ai_index_state_m st
        ON st.ai_source_id = s.ai_source_id
       AND st.is_active = true
      WHERE ($1::text IS NULL OR s.source_app_code = $1::text)
      GROUP BY s.ai_source_id
      ORDER BY s.source_app_code
      `,
      sourceApp ?? null,
    );

    return rows.map((row) => ({
      sourceApp: row.source_app_code as AiIndexSourceApp,
      label: row.source_name,
      registered: true,
      active: row.is_active && row.source_status_code === 'active',
      indexingEnabled: row.indexing_enabled,
      keywordSearchEnabled: row.keyword_search_enabled,
      metadataSearchEnabled: row.metadata_search_enabled,
      semanticSearchEnabled: row.semantic_search_enabled,
      vectorSearchEnabled: row.vector_search_enabled,
      ragContextEnabled: row.rag_context_enabled,
      objectCount: toNumber(row.object_count),
      pendingCount: toNumber(row.pending_count),
      indexedCount: toNumber(row.indexed_count),
      skippedCount: toNumber(row.skipped_count),
      failedCount: toNumber(row.failed_count),
      staleCount: toNumber(row.stale_count),
      deletedCount: toNumber(row.deleted_count),
      lastIndexedAt: toIsoString(row.last_indexed_at),
      lastFailedAt: toIsoString(row.last_failed_at),
    }));
  }

  async queueJob(request: AiIndexJobRequest, currentUser?: TokenPayload): Promise<AiIndexJobSnapshot> {
    const adapter = this.requireAdapter(request.sourceApp);
    const sourceId = await this.ensureSource(adapter);
    const jobType = normalizeJobType(request.jobType);
    const payload = stringifyJson(request.payload);
    const maxAttempts = boundedInteger(request.maxAttempts, DEFAULT_MAX_ATTEMPTS, 1, 20);
    const safety = normalizeJobSafety(request.safety, maxAttempts);
    const metadata = stringifyJson({
      safety,
      safetyVersion: 1,
      queuedAt: new Date().toISOString(),
    });
    const requestedBy = currentUser?.userId && /^\d+$/.test(currentUser.userId)
      ? BigInt(currentUser.userId)
      : null;

    const rows = await this.db.client.$queryRawUnsafe<JobRow[]>(
      `
      INSERT INTO common.cm_ai_index_job_m (
        ai_source_id,
        source_app_code,
        entity_type_code,
        entity_id,
        job_type_code,
        job_status_code,
        priority_no,
        max_attempts,
        source_version,
        requested_by,
        payload_jsonb,
        metadata_jsonb,
        last_source,
        last_activity
      )
      VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9, $10::jsonb, $11::jsonb, 'common.ai-index', 'queue-job')
      RETURNING
        ai_index_job_id,
        ai_object_id,
        source_app_code,
        entity_type_code,
        entity_id,
        job_type_code,
        job_status_code,
        priority_no,
        attempt_count,
        max_attempts,
        source_version,
        requested_at,
        next_retry_at,
        last_error_message,
        payload_jsonb,
        metadata_jsonb
      `,
      sourceId,
      request.sourceApp,
      request.entityType,
      request.entityId,
      jobType,
      request.priority ?? DEFAULT_JOB_PRIORITY,
      maxAttempts,
      request.sourceVersion ?? null,
      requestedBy,
      payload,
      metadata,
    );

    return this.toJobSnapshot(rows[0]);
  }

  async runPendingJobs(limit = DEFAULT_BATCH_LIMIT): Promise<AiIndexJobRunSummary> {
    const normalizedLimit = boundedInteger(limit, DEFAULT_BATCH_LIMIT, 1, MAX_JOB_BATCH_LIMIT);
    const rows = await this.db.client.$queryRawUnsafe<JobRow[]>(
      `
      SELECT
        ai_index_job_id,
        ai_object_id,
        source_app_code,
        entity_type_code,
        entity_id,
        job_type_code,
        job_status_code,
        priority_no,
        attempt_count,
        max_attempts,
        source_version,
        requested_at,
        next_retry_at,
        last_error_message,
        payload_jsonb,
        metadata_jsonb
      FROM common.cm_ai_index_job_m
      WHERE job_status_code = 'pending'
        AND is_active = true
        AND (next_retry_at IS NULL OR next_retry_at <= NOW())
      ORDER BY priority_no ASC, requested_at ASC
      LIMIT $1
      `,
      normalizedLimit,
    );

    const results: AiIndexJobRunResult[] = [];
    for (const row of rows) {
      results.push(await this.runJob(row));
    }

    return {
      requestedCount: rows.length,
      processedCount: results.length,
      indexedCount: results.filter((result) => result.jobStatus === 'indexed').length,
      skippedCount: results.filter((result) => result.jobStatus === 'skipped').length,
      failedCount: results.filter((result) => result.jobStatus === 'failed').length,
      retriedCount: results.filter((result) => Boolean(result.nextRetryAt)).length,
      safety: safetyWithRunLimit(normalizedLimit),
      results,
    };
  }

  async syncObject(
    request: AiIndexAdapterSyncRequest,
    safety = normalizeJobSafety(undefined, DEFAULT_MAX_ATTEMPTS),
  ): Promise<AiIndexApplyResult> {
    const adapter = this.requireAdapter(request.sourceApp);
    await this.ensureSource(adapter);

    const result = await adapter.syncObject(request);
    if (result.status === 'deleted') {
      return this.markDeleted(request, result.reasonCode, result.reasonMessage);
    }

    if (!result.projection) {
      return this.markSkipped(request, result.status, result.reasonCode, result.reasonMessage);
    }

    return this.applyProjection(result.projection, result.status, safety);
  }

  private async runJob(row: JobRow): Promise<AiIndexJobRunResult> {
    const safety = extractJobSafety(row);
    const startedAt = new Date().toISOString();
    await this.db.client.$executeRawUnsafe(
      `
      UPDATE common.cm_ai_index_job_m
      SET job_status_code = 'running',
          started_at = NOW(),
          attempt_count = attempt_count + 1,
          metadata_jsonb = $2::jsonb,
          updated_at = NOW(),
          last_activity = 'run-job'
      WHERE ai_index_job_id = $1
      `,
      row.ai_index_job_id,
      stringifyJson(mergeMetadata(row.metadata_jsonb, {
        safety,
        lastRun: {
          status: 'running',
          startedAt,
          attemptCount: row.attempt_count + 1,
        },
      })),
    );

    try {
      const applyResult = await this.syncObject({
        sourceApp: row.source_app_code as AiIndexSourceApp,
        entityType: row.entity_type_code,
        entityId: row.entity_id,
        jobType: row.job_type_code as AiIndexJobType,
        sourceVersion: row.source_version ?? undefined,
        payload: toJsonObject(row.payload_jsonb),
      }, safety);
      const jobStatus = applyResult.status === 'indexed' || applyResult.status === 'deleted'
        ? 'indexed'
        : applyResult.status === 'skipped'
          ? 'skipped'
          : 'failed';
      const finishedAt = new Date().toISOString();
      const metadata = mergeMetadata(row.metadata_jsonb, {
        safety,
        embedding: applyResult.embedding,
        lastRun: {
          status: jobStatus,
          finishedAt,
          attemptCount: row.attempt_count + 1,
          embeddingStatus: applyResult.embedding?.status,
          embeddingErrorKind: applyResult.embedding?.errorKind,
        },
      });

      await this.db.client.$executeRawUnsafe(
        `
        UPDATE common.cm_ai_index_job_m
        SET ai_object_id = NULLIF($2, '')::bigint,
            job_status_code = $3,
            finished_at = NOW(),
            last_error_message = $4,
            metadata_jsonb = $5::jsonb,
            updated_at = NOW(),
            last_activity = 'run-job.complete'
        WHERE ai_index_job_id = $1
        `,
        row.ai_index_job_id,
        applyResult.objectId === '0' ? '' : applyResult.objectId,
        jobStatus,
        applyResult.reasonMessage ?? null,
        stringifyJson(metadata),
      );

      return {
        sourceApp: row.source_app_code as AiIndexSourceApp,
        entityType: row.entity_type_code,
        entityId: row.entity_id,
        jobId: row.ai_index_job_id.toString(),
        objectId: applyResult.objectId !== '0' ? applyResult.objectId : undefined,
        jobType: row.job_type_code as AiIndexJobType,
        jobStatus,
        attemptCount: row.attempt_count + 1,
        lastErrorMessage: applyResult.reasonMessage,
        safety,
        embedding: applyResult.embedding,
      };
    } catch (error) {
      const message = errorMessage(error);
      const errorKind = resolveErrorKind(error);
      const nextAttemptCount = row.attempt_count + 1;
      const shouldRetry = nextAttemptCount < safety.maxAttempts;
      const nextRetryDelayMs = shouldRetry ? computeRetryDelayMs(safety, nextAttemptCount) : undefined;
      const nextRetryAt = nextRetryDelayMs ? new Date(Date.now() + nextRetryDelayMs) : undefined;
      const failureSafety = {
        ...safety,
        nextRetryDelayMs,
        errorKind,
        partial: isEmbeddingSyncError(error) ? error.summary.embeddedChunkCount > 0 : undefined,
      };
      const embeddingSummary = isEmbeddingSyncError(error) ? error.summary : undefined;
      const failedAt = new Date().toISOString();
      const metadata = mergeMetadata(row.metadata_jsonb, {
        safety: failureSafety,
        embedding: embeddingSummary,
        lastRun: {
          status: shouldRetry ? 'pending' : 'failed',
          failedAt,
          attemptCount: nextAttemptCount,
          errorKind,
          nextRetryAt: nextRetryAt?.toISOString(),
          nextRetryDelayMs,
        },
      });
      await this.db.client.$executeRawUnsafe(
        `
        UPDATE common.cm_ai_index_job_m
        SET job_status_code = $2,
            finished_at = CASE WHEN $2 = 'failed' THEN NOW() ELSE finished_at END,
            next_retry_at = $4,
            last_error_message = $3,
            metadata_jsonb = $5::jsonb,
            updated_at = NOW(),
            last_activity = $6
        WHERE ai_index_job_id = $1
        `,
        row.ai_index_job_id,
        shouldRetry ? 'pending' : 'failed',
        message,
        nextRetryAt ?? null,
        stringifyJson(metadata),
        shouldRetry ? 'run-job.retry' : 'run-job.failed',
      );

      this.logger.warn(`AI index job failed (${row.ai_index_job_id.toString()}): ${message}`);
      return {
        sourceApp: row.source_app_code as AiIndexSourceApp,
        entityType: row.entity_type_code,
        entityId: row.entity_id,
        jobId: row.ai_index_job_id.toString(),
        objectId: row.ai_object_id?.toString(),
        jobType: row.job_type_code as AiIndexJobType,
        jobStatus: shouldRetry ? 'pending' : 'failed',
        attemptCount: nextAttemptCount,
        nextRetryAt: nextRetryAt?.toISOString(),
        lastErrorMessage: message,
        safety: failureSafety,
        embedding: embeddingSummary,
      };
    }
  }

  private async applyProjection(
    projection: AiIndexObjectProjection,
    status: AiIndexObjectStatus,
    safety: AiIndexJobSafetySnapshot,
  ): Promise<AiIndexApplyResult> {
    const adapter = this.requireAdapter(projection.sourceApp);
    const sourceId = await this.ensureSource(adapter, projection);
    const objectId = await this.upsertObject(sourceId, projection);
    const chunks = projection.chunks?.length
      ? projection.chunks
      : [this.createFallbackChunk(projection)];

    await this.replaceObjectAclSnapshot(objectId, projection);
    const activeChunks = await this.syncObjectChunks(objectId, chunks);
    let embeddingSummary: AiEmbeddingSyncSummary;
    try {
      embeddingSummary = await this.upsertChunkEmbeddings(projection, objectId, activeChunks, safety);
    } catch (error) {
      if (isEmbeddingSyncError(error)) {
        await this.upsertIndexState(
          sourceId,
          objectId,
          projection,
          activeChunks.length,
          'failed',
          error.summary,
        );
      }

      throw error;
    }

    const stateStatus = this.resolveIndexStateStatus(status, embeddingSummary);
    await this.upsertIndexState(sourceId, objectId, projection, activeChunks.length, stateStatus, embeddingSummary);

    return {
      sourceApp: projection.sourceApp,
      entityType: projection.entityType,
      entityId: projection.entityId,
      objectId: objectId.toString(),
      status,
      chunkCount: activeChunks.length,
      indexedChunkCount: status === 'indexed' ? embeddingSummary.embeddedChunkCount : 0,
      contentHash: projection.contentHash,
      embedding: embeddingSummary,
    };
  }

  private async markDeleted(
    request: AiIndexAdapterSyncRequest,
    reasonCode?: string,
    reasonMessage?: string,
  ): Promise<AiIndexApplyResult> {
    const objectRows = await this.db.client.$queryRawUnsafe<ObjectIdRow[]>(
      `
      UPDATE common.cm_ai_object_m
      SET is_active = false,
          indexed_at = NOW(),
          updated_at = NOW(),
          last_activity = 'mark-deleted'
      WHERE source_app_code = $1
        AND entity_type_code = $2
        AND entity_id = $3
      RETURNING ai_object_id
      `,
      request.sourceApp,
      request.entityType,
      request.entityId,
    );

    const objectId = objectRows[0]?.ai_object_id;
    if (objectId) {
      await this.db.client.$executeRawUnsafe(
        `
        UPDATE common.cm_ai_index_state_m
        SET index_status_code = 'deleted',
            last_indexed_at = NOW(),
            updated_at = NOW(),
            last_activity = 'mark-deleted'
        WHERE ai_object_id = $1
        `,
        objectId,
      );
    }

    return {
      sourceApp: request.sourceApp,
      entityType: request.entityType,
      entityId: request.entityId,
      objectId: objectId?.toString() ?? '0',
      status: 'deleted',
      chunkCount: 0,
      indexedChunkCount: 0,
      reasonCode,
      reasonMessage,
    };
  }

  private async markSkipped(
    request: AiIndexAdapterSyncRequest,
    status: AiIndexObjectStatus,
    reasonCode?: string,
    reasonMessage?: string,
  ): Promise<AiIndexApplyResult> {
    return {
      sourceApp: request.sourceApp,
      entityType: request.entityType,
      entityId: request.entityId,
      objectId: '0',
      status: status === 'failed' ? 'failed' : 'skipped',
      chunkCount: 0,
      indexedChunkCount: 0,
      reasonCode,
      reasonMessage,
    };
  }

  private async ensureRegisteredSources(): Promise<void> {
    await Promise.all(this.registry.list().map((adapter) => this.ensureSource(adapter)));
  }

  private async ensureSource(
    adapter: AiIndexAdapter,
    projection?: AiIndexObjectProjection,
  ): Promise<bigint> {
    const capabilities = projection?.capabilities ?? adapter.capabilities;
    const rows = await this.db.client.$queryRawUnsafe<SourceIdRow[]>(
      `
      INSERT INTO common.cm_ai_source_m (
        source_app_code,
        source_name,
        source_kind_code,
        adapter_code,
        embedding_profile_code,
        indexing_enabled,
        keyword_search_enabled,
        metadata_search_enabled,
        semantic_search_enabled,
        vector_search_enabled,
        rag_context_enabled,
        metadata_jsonb,
        last_source,
        last_activity
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, 'common.ai-index', 'ensure-source')
      ON CONFLICT (source_app_code)
      DO UPDATE SET
        source_name = EXCLUDED.source_name,
        source_kind_code = EXCLUDED.source_kind_code,
        adapter_code = EXCLUDED.adapter_code,
        embedding_profile_code = EXCLUDED.embedding_profile_code,
        indexing_enabled = EXCLUDED.indexing_enabled,
        keyword_search_enabled = EXCLUDED.keyword_search_enabled,
        metadata_search_enabled = EXCLUDED.metadata_search_enabled,
        semantic_search_enabled = EXCLUDED.semantic_search_enabled,
        vector_search_enabled = EXCLUDED.vector_search_enabled,
        rag_context_enabled = EXCLUDED.rag_context_enabled,
        metadata_jsonb = EXCLUDED.metadata_jsonb,
        updated_at = NOW(),
        last_activity = 'ensure-source'
      RETURNING ai_source_id
      `,
      adapter.sourceApp,
      projection?.sourceName ?? adapter.label,
      projection?.sourceKind ?? adapter.sourceKind,
      projection?.adapterCode ?? adapter.adapterCode,
      projection?.embeddingProfileCode ?? DEFAULT_PROFILE_CODE,
      Boolean(capabilities.indexing),
      Boolean(capabilities.keyword),
      Boolean(capabilities.metadata),
      Boolean(capabilities.semantic),
      Boolean(capabilities.vector),
      Boolean(capabilities.ragContext),
      stringifyJson({
        registeredBy: adapter.adapterCode,
        capabilities,
        embeddingProvider: this.embeddingProvider.getStatus(projection?.embeddingProfileCode ?? DEFAULT_PROFILE_CODE),
      }),
    );

    return rows[0].ai_source_id;
  }

  private async upsertObject(
    sourceId: bigint,
    projection: AiIndexObjectProjection,
  ): Promise<bigint> {
    const rows = await this.db.client.$queryRawUnsafe<ObjectIdRow[]>(
      `
      INSERT INTO common.cm_ai_object_m (
        ai_source_id,
        source_app_code,
        entity_type_code,
        entity_id,
        source_version,
        title,
        body_text,
        summary_text,
        target_path,
        target_external_href,
        sensitivity_code,
        acl_policy_code,
        search_eligible,
        context_eligible,
        content_hash,
        indexed_at,
        metadata_jsonb,
        last_source,
        last_activity
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), $16::jsonb, 'common.ai-index', 'upsert-object')
      ON CONFLICT (source_app_code, entity_type_code, entity_id)
      DO UPDATE SET
        ai_source_id = EXCLUDED.ai_source_id,
        source_version = EXCLUDED.source_version,
        title = EXCLUDED.title,
        body_text = EXCLUDED.body_text,
        summary_text = EXCLUDED.summary_text,
        target_path = EXCLUDED.target_path,
        target_external_href = EXCLUDED.target_external_href,
        sensitivity_code = EXCLUDED.sensitivity_code,
        acl_policy_code = EXCLUDED.acl_policy_code,
        search_eligible = EXCLUDED.search_eligible,
        context_eligible = EXCLUDED.context_eligible,
        content_hash = EXCLUDED.content_hash,
        indexed_at = NOW(),
        metadata_jsonb = EXCLUDED.metadata_jsonb,
        is_active = true,
        updated_at = NOW(),
        last_activity = 'upsert-object'
      RETURNING ai_object_id
      `,
      sourceId,
      projection.sourceApp,
      projection.entityType,
      projection.entityId,
      projection.sourceVersion ?? null,
      projection.title,
      projection.bodyText,
      projection.summary ?? null,
      projection.target?.path ?? null,
      projection.target?.externalHref ?? null,
      projection.sensitivity,
      projection.acl.accessScope,
      projection.acl.searchEligible,
      projection.acl.contextEligible,
      projection.contentHash ?? null,
      stringifyJson(projection.metadata),
    );

    return rows[0].ai_object_id;
  }

  private async replaceObjectAclSnapshot(
    objectId: bigint,
    projection: AiIndexObjectProjection,
  ): Promise<void> {
    await this.db.client.$executeRawUnsafe(
      'DELETE FROM common.cm_ai_acl_snapshot_m WHERE ai_object_id = $1',
      objectId,
    );
    await this.db.client.$executeRawUnsafe(
      `
      INSERT INTO common.cm_ai_acl_snapshot_m (
        ai_object_id,
        access_scope_code,
        policy_hash,
        sensitivity_code,
        search_eligible,
        context_eligible,
        acl_snapshot_jsonb,
        metadata_jsonb,
        last_source,
        last_activity
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, 'common.ai-index', 'replace-acl')
      `,
      objectId,
      projection.acl.accessScope,
      projection.acl.policyHash ?? null,
      projection.acl.sensitivity,
      projection.acl.searchEligible,
      projection.acl.contextEligible,
      stringifyJson(projection.acl.snapshot),
      stringifyJson(projection.metadata),
    );
  }

  private async syncObjectChunks(
    objectId: bigint,
    chunks: AiIndexChunkProjection[],
  ): Promise<ActiveChunkRow[]> {
    await this.db.client.$executeRawUnsafe(
      `
      UPDATE common.cm_ai_chunk_m
      SET is_active = false,
          updated_at = NOW(),
          last_activity = 'sync-chunk.deactivate'
      WHERE ai_object_id = $1
      `,
      objectId,
    );

    for (const chunk of chunks) {
      const contentHash = chunk.chunkHash ?? hashText(chunk.chunkText);
      const rows = await this.db.client.$queryRawUnsafe<ChunkIdRow[]>(
        `
        INSERT INTO common.cm_ai_chunk_m (
          ai_object_id,
          chunk_seq,
          chunk_key,
          chunk_text,
          token_count,
          char_start,
          char_end,
          citation_label,
          content_hash,
          metadata_jsonb,
          last_source,
          last_activity
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, 'common.ai-index', 'replace-chunk')
        ON CONFLICT (ai_object_id, chunk_key)
        DO UPDATE SET
          chunk_seq = EXCLUDED.chunk_seq,
          chunk_text = EXCLUDED.chunk_text,
          token_count = EXCLUDED.token_count,
          char_start = EXCLUDED.char_start,
          char_end = EXCLUDED.char_end,
          citation_label = EXCLUDED.citation_label,
          content_hash = EXCLUDED.content_hash,
          metadata_jsonb = EXCLUDED.metadata_jsonb,
          is_active = true,
          updated_at = NOW(),
          last_activity = 'sync-chunk.upsert'
        RETURNING ai_chunk_id
        `,
        objectId,
        chunk.chunkSeq,
        chunk.chunkKey,
        chunk.chunkText,
        chunk.tokenCount ?? null,
        chunk.charStart ?? null,
        chunk.charEnd ?? null,
        chunk.citationLabel ?? null,
        contentHash,
        stringifyJson(chunk.metadata),
      );

      if (!rows[0]?.ai_chunk_id) {
        throw new Error(`AI chunk insert failed: ${chunk.chunkKey}`);
      }
    }

    return this.db.client.$queryRawUnsafe<ActiveChunkRow[]>(
      `
      SELECT
        ai_chunk_id,
        chunk_key,
        chunk_seq,
        chunk_text,
        content_hash
      FROM common.cm_ai_chunk_m
      WHERE ai_object_id = $1
        AND is_active = true
      ORDER BY chunk_seq ASC, chunk_key ASC
      `,
      objectId,
    );
  }

  private async upsertChunkEmbeddings(
    projection: AiIndexObjectProjection,
    objectId: bigint,
    activeChunks: ActiveChunkRow[],
    safety: AiIndexJobSafetySnapshot,
  ): Promise<AiEmbeddingSyncSummary> {
    const profileCode = projection.embeddingProfileCode ?? DEFAULT_PROFILE_CODE;
    const providerStatus = this.embeddingProvider.getStatus(profileCode);
    const activeChunkCount = activeChunks.length;
    const batchSize = safety.embeddingBatchSize;

    const profileMismatchReindex = await this.deactivateProfileMismatchEmbeddings(objectId, profileCode);
    await this.deactivateStaleEmbeddings(objectId, profileCode);

    if (!providerStatus.ready) {
      const embeddedChunkCount = await this.countActiveEmbeddings(objectId, profileCode);
      return {
        profileCode,
        providerCode: providerStatus.providerCode,
        modelName: providerStatus.modelName,
        deploymentName: providerStatus.deploymentName,
        dimension: providerStatus.dimension,
        status: 'unavailable',
        activeChunkCount,
        embeddedChunkCount,
        changedChunkCount: 0,
        skippedChunkCount: Math.max(0, activeChunkCount - embeddedChunkCount),
        batchSize,
        batchCount: 0,
        profileMismatchReindex,
        reasonCode: providerStatus.reasonCode,
        reasonMessage: providerStatus.reasonMessage,
        errorKind: 'embedding_provider_unavailable',
      };
    }

    const rows = await this.db.client.$queryRawUnsafe<EmbeddingCandidateRow[]>(
      `
      SELECT
        c.ai_chunk_id,
        c.chunk_key,
        c.chunk_seq,
        c.chunk_text,
        c.content_hash,
        e.embedding_hash
      FROM common.cm_ai_chunk_m c
      LEFT JOIN common.cm_ai_embedding_m e
        ON e.ai_chunk_id = c.ai_chunk_id
       AND e.profile_code = $2
       AND e.is_active = true
      WHERE c.ai_object_id = $1
        AND c.is_active = true
      ORDER BY c.chunk_seq ASC, c.chunk_key ASC
      `,
      objectId,
      profileCode,
    );
    const changedChunks = rows.filter((row) => row.embedding_hash !== row.content_hash);
    const batchCount = Math.ceil(changedChunks.length / batchSize);

    if (changedChunks.length > 0) {
      let completedChunkCount = 0;
      try {
        for (let offset = 0; offset < changedChunks.length; offset += batchSize) {
          const batch = changedChunks.slice(offset, offset + batchSize);
          const { embeddings } = await this.embeddingProvider.embedTexts(
            batch.map((row) => row.chunk_text),
            profileCode,
          );

          for (let index = 0; index < batch.length; index += 1) {
            const chunk = batch[index];
            const embedding = embeddings[index];
            if (!embedding) {
              throw new Error(`Missing embedding result for AI chunk ${chunk.ai_chunk_id.toString()}`);
            }

            await this.upsertEmbedding(projection, chunk, embedding, providerStatus);
            completedChunkCount += 1;
          }
        }
      } catch (error) {
        const embeddedChunkCount = await this.countActiveEmbeddings(objectId, profileCode);
        throw new AiEmbeddingSyncError({
          profileCode,
          providerCode: providerStatus.providerCode,
          modelName: providerStatus.modelName,
          deploymentName: providerStatus.deploymentName,
          dimension: providerStatus.dimension,
          status: 'failed',
          activeChunkCount,
          embeddedChunkCount,
          changedChunkCount: changedChunks.length,
          skippedChunkCount: Math.max(0, activeChunkCount - embeddedChunkCount),
          failedChunkCount: Math.max(0, changedChunks.length - completedChunkCount),
          batchSize,
          batchCount,
          profileMismatchReindex,
          reasonCode: 'embedding_runtime_failed',
          reasonMessage: errorMessage(error),
          errorKind: 'embedding_runtime_failed',
        });
      }
    }

    const embeddedChunkCount = await this.countActiveEmbeddings(objectId, profileCode);
    return {
      profileCode,
      providerCode: providerStatus.providerCode,
      modelName: providerStatus.modelName,
      deploymentName: providerStatus.deploymentName,
      dimension: providerStatus.dimension,
      status: changedChunks.length > 0 ? 'embedded' : 'unchanged',
      activeChunkCount,
      embeddedChunkCount,
      changedChunkCount: changedChunks.length,
      skippedChunkCount: Math.max(0, activeChunkCount - embeddedChunkCount),
      batchSize,
      batchCount,
      profileMismatchReindex,
    };
  }

  private async deactivateProfileMismatchEmbeddings(objectId: bigint, profileCode: string): Promise<boolean> {
    const rows = await this.db.client.$queryRawUnsafe<CountRow[]>(
      `
      WITH updated AS (
        UPDATE common.cm_ai_embedding_m e
        SET is_active = false,
            updated_at = NOW(),
            last_activity = 'embedding.profile-mismatch'
        FROM common.cm_ai_chunk_m c
        WHERE e.ai_chunk_id = c.ai_chunk_id
          AND c.ai_object_id = $1
          AND c.is_active = true
          AND e.profile_code <> $2
          AND e.is_active = true
        RETURNING e.ai_embedding_id
      )
      SELECT COUNT(*) AS count
      FROM updated
      `,
      objectId,
      profileCode,
    );

    return rows[0] ? toNumber(rows[0].count) > 0 : false;
  }

  private async deactivateStaleEmbeddings(objectId: bigint, profileCode: string): Promise<void> {
    await this.db.client.$executeRawUnsafe(
      `
      UPDATE common.cm_ai_embedding_m e
      SET is_active = false,
          updated_at = NOW(),
          last_activity = 'embedding.stale'
      FROM common.cm_ai_chunk_m c
      WHERE e.ai_chunk_id = c.ai_chunk_id
        AND c.ai_object_id = $1
        AND c.is_active = true
        AND e.profile_code = $2
        AND e.is_active = true
        AND e.embedding_hash IS DISTINCT FROM c.content_hash
      `,
      objectId,
      profileCode,
    );
  }

  private resolveIndexStateStatus(
    status: AiIndexObjectStatus,
    embeddingSummary: AiEmbeddingSyncSummary,
  ): AiIndexObjectStatus {
    if (status !== 'indexed') {
      return status;
    }

    if (
      embeddingSummary.status === 'unavailable'
      || embeddingSummary.status === 'failed'
      || embeddingSummary.embeddedChunkCount < embeddingSummary.activeChunkCount
    ) {
      return 'stale';
    }

    return status;
  }

  private async upsertEmbedding(
    projection: AiIndexObjectProjection,
    chunk: EmbeddingCandidateRow,
    embedding: number[],
    providerStatus: ReturnType<AiEmbeddingProviderService['getStatus']>,
  ): Promise<void> {
    await this.db.client.$executeRawUnsafe(
      `
      INSERT INTO common.cm_ai_embedding_m (
        ai_chunk_id,
        profile_code,
        provider_code,
        model_name,
        deployment_name,
        embedding_dimension,
        embedding,
        embedding_hash,
        metadata_jsonb,
        last_source,
        last_activity
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::vector, $8, $9::jsonb, 'common.ai-index', 'embedding.upsert')
      ON CONFLICT (ai_chunk_id, profile_code)
      DO UPDATE SET
        provider_code = EXCLUDED.provider_code,
        model_name = EXCLUDED.model_name,
        deployment_name = EXCLUDED.deployment_name,
        embedding_dimension = EXCLUDED.embedding_dimension,
        embedding = EXCLUDED.embedding,
        embedding_hash = EXCLUDED.embedding_hash,
        metadata_jsonb = EXCLUDED.metadata_jsonb,
        is_active = true,
        updated_at = NOW(),
        last_activity = 'embedding.upsert'
      `,
      chunk.ai_chunk_id,
      providerStatus.profileCode,
      providerStatus.providerCode,
      providerStatus.modelName ?? null,
      providerStatus.deploymentName ?? null,
      providerStatus.dimension,
      vectorToSqlLiteral(embedding),
      chunk.content_hash,
      stringifyJson({
        sourceApp: projection.sourceApp,
        entityType: projection.entityType,
        entityId: projection.entityId,
        chunkKey: chunk.chunk_key,
        chunkSeq: chunk.chunk_seq,
        chunkHash: chunk.content_hash,
        provider: providerStatus,
      }),
    );
  }

  private async countActiveEmbeddings(objectId: bigint, profileCode: string): Promise<number> {
    const rows = await this.db.client.$queryRawUnsafe<CountRow[]>(
      `
      SELECT COUNT(*) AS count
      FROM common.cm_ai_embedding_m e
      INNER JOIN common.cm_ai_chunk_m c
        ON c.ai_chunk_id = e.ai_chunk_id
      WHERE c.ai_object_id = $1
        AND c.is_active = true
        AND e.profile_code = $2
        AND e.is_active = true
        AND e.embedding_hash = c.content_hash
      `,
      objectId,
      profileCode,
    );

    return rows[0] ? toNumber(rows[0].count) : 0;
  }

  private async upsertIndexState(
    sourceId: bigint,
    objectId: bigint,
    projection: AiIndexObjectProjection,
    chunkCount: number,
    status: AiIndexObjectStatus,
    embeddingSummary: AiEmbeddingSyncSummary,
  ): Promise<void> {
    await this.db.client.$executeRawUnsafe(
      `
      INSERT INTO common.cm_ai_index_state_m (
        ai_source_id,
        ai_object_id,
        profile_code,
        index_status_code,
        chunk_count,
        indexed_chunk_count,
        last_indexed_source_version,
        last_requested_at,
        last_indexed_at,
        last_failed_at,
        last_error_message,
        metadata_jsonb,
        last_source,
        last_activity
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, $11::jsonb, 'common.ai-index', 'upsert-state')
      ON CONFLICT (ai_object_id, profile_code)
      DO UPDATE SET
        ai_source_id = EXCLUDED.ai_source_id,
        index_status_code = EXCLUDED.index_status_code,
        chunk_count = EXCLUDED.chunk_count,
        indexed_chunk_count = EXCLUDED.indexed_chunk_count,
        last_indexed_source_version = EXCLUDED.last_indexed_source_version,
        last_requested_at = NOW(),
        last_indexed_at = COALESCE(EXCLUDED.last_indexed_at, cm_ai_index_state_m.last_indexed_at),
        last_failed_at = COALESCE(EXCLUDED.last_failed_at, cm_ai_index_state_m.last_failed_at),
        last_error_message = EXCLUDED.last_error_message,
        metadata_jsonb = EXCLUDED.metadata_jsonb,
        updated_at = NOW(),
        last_activity = 'upsert-state'
      `,
      sourceId,
      objectId,
      projection.embeddingProfileCode ?? DEFAULT_PROFILE_CODE,
      status,
      chunkCount,
      status === 'indexed' || status === 'stale' ? embeddingSummary.embeddedChunkCount : 0,
      projection.sourceVersion ?? null,
      status === 'indexed' || status === 'stale' ? new Date() : null,
      status === 'failed' ? new Date() : null,
      status === 'failed'
        ? embeddingSummary.reasonMessage ?? 'Adapter returned failed state'
        : embeddingSummary.status === 'unavailable'
          ? embeddingSummary.reasonMessage ?? embeddingSummary.reasonCode ?? null
          : null,
      stringifyJson({
        contentHash: projection.contentHash,
        sourceApp: projection.sourceApp,
        entityType: projection.entityType,
        entityId: projection.entityId,
        embeddingProvider: this.embeddingProvider.getStatus(projection.embeddingProfileCode ?? DEFAULT_PROFILE_CODE),
        embedding: embeddingSummary,
        safety: {
          embeddingBatchSize: embeddingSummary.batchSize,
          profileMismatchReindex: embeddingSummary.profileMismatchReindex,
          errorKind: embeddingSummary.errorKind,
        },
      }),
    );
  }

  private createFallbackChunk(projection: AiIndexObjectProjection): AiIndexChunkProjection {
    return {
      chunkKey: `${projection.entityType}:${projection.entityId}:body`,
      chunkSeq: 0,
      chunkText: projection.bodyText,
      chunkHash: projection.contentHash,
      citationLabel: projection.title,
      metadata: projection.metadata,
      acl: projection.acl,
    };
  }

  private requireAdapter(sourceApp: AiIndexSourceApp): AiIndexAdapter {
    const adapter = this.registry.get(sourceApp);
    if (!adapter) {
      throw new NotFoundException(`AI index adapter not registered: ${sourceApp}`);
    }
    return adapter;
  }

  private toJobSnapshot(row: JobRow): AiIndexJobSnapshot {
    const safety = extractJobSafety(row);
    return {
      sourceApp: row.source_app_code as AiIndexSourceApp,
      entityType: row.entity_type_code,
      entityId: row.entity_id,
      jobId: row.ai_index_job_id.toString(),
      objectId: row.ai_object_id?.toString(),
      jobType: row.job_type_code as AiIndexJobType,
      jobStatus: normalizeJobStatus(row.job_status_code),
      priority: row.priority_no,
      attemptCount: row.attempt_count,
      maxAttempts: row.max_attempts,
      requestedAt: row.requested_at.toISOString(),
      nextRetryAt: toIsoString(row.next_retry_at),
      lastErrorMessage: row.last_error_message ?? undefined,
      safety,
    };
  }
}
