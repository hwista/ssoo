import { Injectable, Logger } from '@nestjs/common';
import type {
  AiIndexJsonObject,
  AiRetrievalContextItem,
  AiRetrievalResultItem,
  CommonAiRetrievalCitation,
  CommonAiRetrievalRequest,
  CommonAiRetrievalResponse,
  CommonSearchCapabilities,
  CommonSearchEntityType,
  CommonSearchRanker,
  CommonSearchSourceApp,
  CommonSearchTarget,
} from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { TokenPayload } from '../auth/interfaces/auth.interface.js';
import { AiEmbeddingProviderService } from './ai-embedding-provider.service.js';

const DEFAULT_RETRIEVAL_LIMIT = 12;
const MAX_RETRIEVAL_LIMIT = 40;
const DEFAULT_CONTEXT_LIMIT = 6;
const MAX_CONTEXT_LIMIT = 12;
const DEFAULT_PROFILE_CODE = 'default';
const VECTOR_PREFETCH_MULTIPLIER = 4;
const KEYWORD_PREFETCH_MULTIPLIER = 3;
const VECTOR_SIMILARITY_THRESHOLD = 0.15;

const SEARCH_SOURCE_APPS = new Set<CommonSearchSourceApp>(['admin', 'crm', 'pms', 'dms', 'sns']);
const SEARCH_ENTITY_TYPES = new Set<CommonSearchEntityType>([
  'document',
  'person',
  'post',
  'project',
  'customer',
  'opportunity',
  'user',
  'setting',
  'menu',
  'unknown',
]);

const EMPTY_CAPABILITIES: CommonSearchCapabilities = {
  keyword: false,
  metadata: false,
  semantic: false,
  vector: false,
  ragContext: false,
};

interface RetrievalRow {
  ai_object_id: bigint;
  ai_chunk_id: bigint;
  source_app_code: string;
  entity_type_code: string;
  entity_id: string;
  title: string;
  summary_text: string | null;
  target_path: string | null;
  target_external_href: string | null;
  chunk_text: string;
  chunk_key: string;
  chunk_seq: number;
  citation_label: string | null;
  object_metadata_jsonb: unknown;
  chunk_metadata_jsonb: unknown;
  similarity: number | null;
  keyword_score: number | null;
}

interface Candidate {
  row: RetrievalRow;
  similarity?: number;
  keywordScore: number;
  vectorScore: number;
}

interface RetrievalLogIdRow {
  ai_retrieval_log_id: bigint;
}

interface RetrievalLogDbClient {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
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

function normalizeQuery(query: string): string {
  return query.trim();
}

function normalizeLimit(limit?: number): number {
  if (!limit || !Number.isFinite(limit) || limit <= 0) {
    return DEFAULT_RETRIEVAL_LIMIT;
  }

  return Math.min(Math.floor(limit), MAX_RETRIEVAL_LIMIT);
}

function normalizeContextLimit(contextLimit: number | undefined, resultLimit: number): number {
  if (!contextLimit || !Number.isFinite(contextLimit) || contextLimit <= 0) {
    return Math.min(DEFAULT_CONTEXT_LIMIT, resultLimit);
  }

  return Math.min(Math.floor(contextLimit), MAX_CONTEXT_LIMIT, resultLimit);
}

function normalizeSourceApp(sourceApp?: CommonSearchSourceApp): CommonSearchSourceApp | undefined {
  return sourceApp && SEARCH_SOURCE_APPS.has(sourceApp) ? sourceApp : undefined;
}

function normalizeEntityTypes(entityTypes?: CommonSearchEntityType[]): CommonSearchEntityType[] | undefined {
  if (!entityTypes?.length) {
    return undefined;
  }

  const normalized = Array.from(new Set(
    entityTypes.filter((entityType): entityType is CommonSearchEntityType => SEARCH_ENTITY_TYPES.has(entityType)),
  ));

  return normalized.length > 0 ? normalized : undefined;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function createExcerpt(chunkText: string, query: string): string {
  const normalized = normalizeText(chunkText);
  const index = normalized.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) {
    return normalized.slice(0, 260);
  }

  const start = Math.max(0, index - 90);
  return normalized.slice(start, start + 260);
}

function createTarget(row: RetrievalRow): CommonSearchTarget | undefined {
  const sourceApp = normalizeSourceApp(row.source_app_code as CommonSearchSourceApp);
  if (!sourceApp || !row.target_path) {
    return undefined;
  }

  return {
    sourceApp,
    path: row.target_path,
    externalHref: row.target_external_href ?? undefined,
  };
}

function normalizeEntityType(value: string): CommonSearchEntityType {
  return SEARCH_ENTITY_TYPES.has(value as CommonSearchEntityType)
    ? value as CommonSearchEntityType
    : 'unknown';
}

function vectorToSqlLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

function toOptionalStringArray(values?: string[]): string[] {
  return values?.filter((value) => value.trim().length > 0) ?? [];
}

function resolveRanker(hasVector: boolean, hasKeyword: boolean): CommonSearchRanker {
  if (hasVector && hasKeyword) {
    return 'hybrid';
  }

  if (hasVector) {
    return 'semantic';
  }

  return 'keyword';
}

function resolveCandidateScore(candidate: Candidate): number {
  if (candidate.vectorScore > 0 && candidate.keywordScore > 0) {
    return (candidate.vectorScore * 0.72) + (candidate.keywordScore * 0.28);
  }

  return Math.max(candidate.vectorScore, candidate.keywordScore);
}

function buildCapabilities(hasVector: boolean, hasKeyword: boolean, hasRagContext: boolean): CommonSearchCapabilities {
  return {
    keyword: hasKeyword,
    metadata: hasKeyword,
    semantic: hasVector,
    vector: hasVector,
    ragContext: hasRagContext,
  };
}

function getUserId(currentUser: TokenPayload): string | null {
  return /^\d+$/.test(currentUser.userId) ? currentUser.userId : null;
}

function getBigIntUserId(currentUser: TokenPayload): bigint | null {
  return /^\d+$/.test(currentUser.userId) ? BigInt(currentUser.userId) : null;
}

function toNullableBigInt(value: string | undefined): bigint | null {
  return value && /^\d+$/.test(value) ? BigInt(value) : null;
}

function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? {});
}

@Injectable()
export class AiRetrievalService {
  private readonly logger = new Logger(AiRetrievalService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly embeddingProvider: AiEmbeddingProviderService,
  ) {}

  async retrieve(request: CommonAiRetrievalRequest, currentUser: TokenPayload): Promise<CommonAiRetrievalResponse> {
    const startedAt = Date.now();
    const query = normalizeQuery(request.query);
    const limit = normalizeLimit(request.limit);
    const contextLimit = normalizeContextLimit(request.contextLimit, limit);
    const shouldIncludeContext = request.includeContext !== false;
    const sourceApp = normalizeSourceApp(request.sourceApp);
    const entityTypes = normalizeEntityTypes(request.entityTypes);

    if (!query) {
      return {
        query,
        sourceApp,
        results: [],
        contextItems: [],
        citations: [],
        total: 0,
        ranker: 'keyword',
        capabilities: { ...EMPTY_CAPABILITIES },
        ragReady: false,
      };
    }

    const vectorRows = await this.findVectorRows(query, sourceApp, entityTypes, currentUser, limit);
    const keywordRows = await this.findKeywordRows(query, sourceApp, entityTypes, currentUser, limit);
    const candidates = this.mergeCandidates(vectorRows, keywordRows);
    const rankedCandidates = candidates
      .sort((left, right) => resolveCandidateScore(right) - resolveCandidateScore(left))
      .slice(0, limit);
    const hasVector = vectorRows.length > 0;
    const hasKeyword = keywordRows.length > 0;
    const ranker = resolveRanker(hasVector, hasKeyword);
    const initialResults = rankedCandidates.map((candidate, index) => this.toResultItem(candidate, query, index));
    const contextItems = shouldIncludeContext
      ? this.buildContextItems(initialResults, contextLimit)
      : [];
    const contextChunkIds = new Set(contextItems.map((item) => item.chunkId));
    const results = initialResults.map((item) => ({
      ...item,
      includedInContext: contextChunkIds.has(item.chunkId),
    }));
    const citations = contextItems.map((item): CommonAiRetrievalCitation => ({
      citationId: item.citationId,
      label: item.label,
      sourceApp: item.sourceApp,
      entityType: item.entityType,
      entityId: item.entityId,
      objectId: item.objectId,
      chunkId: item.chunkId,
      target: item.target,
    }));
    const retrievalLogId = await this.writeRetrievalLog({
      request,
      query,
      sourceApp,
      results,
      contextItems,
      ranker,
      latencyMs: Date.now() - startedAt,
      currentUser,
    });
    const ragReady = Boolean(retrievalLogId && contextItems.length > 0);

    return {
      query,
      sourceApp,
      results,
      contextItems,
      citations,
      total: candidates.length,
      ranker,
      capabilities: buildCapabilities(hasVector, hasKeyword, ragReady),
      ragReady,
      retrievalLogId,
    };
  }

  private async findVectorRows(
    query: string,
    sourceApp: CommonSearchSourceApp | undefined,
    entityTypes: CommonSearchEntityType[] | undefined,
    currentUser: TokenPayload,
    limit: number,
  ): Promise<RetrievalRow[]> {
    const providerStatus = this.embeddingProvider.getStatus(DEFAULT_PROFILE_CODE);
    if (!providerStatus.ready) {
      return [];
    }

    try {
      const { embedding } = await this.embeddingProvider.embedText(query, DEFAULT_PROFILE_CODE);
      const vector = vectorToSqlLiteral(embedding);
      return this.db.client.$queryRawUnsafe<RetrievalRow[]>(
        `
        SELECT
          o.ai_object_id,
          c.ai_chunk_id,
          o.source_app_code,
          o.entity_type_code,
          o.entity_id,
          o.title,
          o.summary_text,
          o.target_path,
          o.target_external_href,
          c.chunk_text,
          c.chunk_key,
          c.chunk_seq,
          c.citation_label,
          o.metadata_jsonb AS object_metadata_jsonb,
          c.metadata_jsonb AS chunk_metadata_jsonb,
          1 - (e.embedding <=> $1::vector) AS similarity,
          NULL::double precision AS keyword_score
        FROM common.cm_ai_embedding_m e
        INNER JOIN common.cm_ai_chunk_m c
          ON c.ai_chunk_id = e.ai_chunk_id
         AND c.is_active = true
        INNER JOIN common.cm_ai_object_m o
          ON o.ai_object_id = c.ai_object_id
         AND o.is_active = true
         AND o.search_eligible = true
         AND o.context_eligible = true
        INNER JOIN common.cm_ai_source_m s
          ON s.ai_source_id = o.ai_source_id
         AND s.is_active = true
         AND s.indexing_enabled = true
         AND s.vector_search_enabled = true
        INNER JOIN common.cm_ai_index_state_m st
          ON st.ai_object_id = o.ai_object_id
         AND st.profile_code = e.profile_code
         AND st.index_status_code = 'indexed'
         AND st.is_active = true
        INNER JOIN common.cm_ai_acl_snapshot_m a
          ON a.ai_object_id = o.ai_object_id
         AND a.is_active = true
         AND a.search_eligible = true
         AND a.context_eligible = true
        WHERE e.profile_code = $2
          AND e.is_active = true
          AND e.embedding IS NOT NULL
          AND e.embedding_hash = c.content_hash
          AND 1 - (e.embedding <=> $1::vector) >= $3
          AND ($4::text IS NULL OR o.source_app_code = $4::text)
          AND ($5::text[] IS NULL OR o.entity_type_code = ANY($5::text[]))
          AND ${this.aclPredicateSql()}
        ORDER BY e.embedding <=> $1::vector ASC, c.chunk_seq ASC
        LIMIT $10
        `,
        vector,
        DEFAULT_PROFILE_CODE,
        VECTOR_SIMILARITY_THRESHOLD,
        sourceApp ?? null,
        entityTypes ?? null,
        getUserId(currentUser),
        toOptionalStringArray(currentUser.organizationIds),
        toOptionalStringArray(currentUser.teamIds),
        toOptionalStringArray(currentUser.groupIds),
        limit * VECTOR_PREFETCH_MULTIPLIER,
      );
    } catch (error) {
      this.logger.warn(`Common AI vector retrieval failed: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  private async findKeywordRows(
    query: string,
    sourceApp: CommonSearchSourceApp | undefined,
    entityTypes: CommonSearchEntityType[] | undefined,
    currentUser: TokenPayload,
    limit: number,
  ): Promise<RetrievalRow[]> {
    const pattern = `%${query}%`;
    return this.db.client.$queryRawUnsafe<RetrievalRow[]>(
      `
      SELECT
        o.ai_object_id,
        c.ai_chunk_id,
        o.source_app_code,
        o.entity_type_code,
        o.entity_id,
        o.title,
        o.summary_text,
        o.target_path,
        o.target_external_href,
        c.chunk_text,
        c.chunk_key,
        c.chunk_seq,
        c.citation_label,
        o.metadata_jsonb AS object_metadata_jsonb,
        c.metadata_jsonb AS chunk_metadata_jsonb,
        NULL::double precision AS similarity,
        (
          CASE WHEN o.title ILIKE $1 THEN 1.0 ELSE 0 END
          + CASE WHEN COALESCE(o.summary_text, '') ILIKE $1 THEN 0.75 ELSE 0 END
          + CASE WHEN COALESCE(o.body_text, '') ILIKE $1 THEN 0.45 ELSE 0 END
          + CASE WHEN c.chunk_text ILIKE $1 THEN 0.85 ELSE 0 END
        ) AS keyword_score
      FROM common.cm_ai_chunk_m c
      INNER JOIN common.cm_ai_object_m o
        ON o.ai_object_id = c.ai_object_id
       AND o.is_active = true
       AND o.search_eligible = true
       AND o.context_eligible = true
      INNER JOIN common.cm_ai_source_m s
        ON s.ai_source_id = o.ai_source_id
       AND s.is_active = true
       AND s.indexing_enabled = true
       AND s.keyword_search_enabled = true
      INNER JOIN common.cm_ai_index_state_m st
        ON st.ai_object_id = o.ai_object_id
       AND st.index_status_code = 'indexed'
       AND st.is_active = true
      INNER JOIN common.cm_ai_acl_snapshot_m a
        ON a.ai_object_id = o.ai_object_id
       AND a.is_active = true
       AND a.search_eligible = true
       AND a.context_eligible = true
      WHERE c.is_active = true
        AND (
          o.title ILIKE $1
          OR COALESCE(o.summary_text, '') ILIKE $1
          OR COALESCE(o.body_text, '') ILIKE $1
          OR c.chunk_text ILIKE $1
        )
        AND ($2::text IS NULL OR o.source_app_code = $2::text)
        AND ($3::text[] IS NULL OR o.entity_type_code = ANY($3::text[]))
        AND ${this.aclPredicateSql(4)}
      ORDER BY keyword_score DESC, o.updated_at DESC, c.chunk_seq ASC
      LIMIT $8
      `,
      pattern,
      sourceApp ?? null,
      entityTypes ?? null,
      getUserId(currentUser),
      toOptionalStringArray(currentUser.organizationIds),
      toOptionalStringArray(currentUser.teamIds),
      toOptionalStringArray(currentUser.groupIds),
      limit * KEYWORD_PREFETCH_MULTIPLIER,
    );
  }

  private mergeCandidates(vectorRows: RetrievalRow[], keywordRows: RetrievalRow[]): Candidate[] {
    const candidates = new Map<string, Candidate>();

    for (const row of vectorRows) {
      const key = row.ai_chunk_id.toString();
      const similarity = typeof row.similarity === 'number' ? row.similarity : 0;
      candidates.set(key, {
        row,
        similarity,
        vectorScore: Math.max(0, similarity),
        keywordScore: 0,
      });
    }

    for (const row of keywordRows) {
      const key = row.ai_chunk_id.toString();
      const keywordScore = typeof row.keyword_score === 'number' ? row.keyword_score : 0;
      const existing = candidates.get(key);
      if (existing) {
        existing.keywordScore = Math.max(existing.keywordScore, keywordScore);
      } else {
        candidates.set(key, {
          row,
          vectorScore: 0,
          keywordScore,
        });
      }
    }

    return Array.from(candidates.values());
  }

  private toResultItem(candidate: Candidate, query: string, index: number): AiRetrievalResultItem {
    const row = candidate.row;
    const score = resolveCandidateScore(candidate);
    const citationId = `r${index + 1}`;
    const ranker = resolveRanker(candidate.vectorScore > 0, candidate.keywordScore > 0);
    const sourceApp = normalizeSourceApp(row.source_app_code as CommonSearchSourceApp) ?? 'dms';
    const entityType = normalizeEntityType(row.entity_type_code);
    const target = createTarget(row);
    const objectMetadata = toJsonObject(row.object_metadata_jsonb);
    const chunkMetadata = toJsonObject(row.chunk_metadata_jsonb);

    return {
      id: `${row.ai_object_id.toString()}:${row.ai_chunk_id.toString()}`,
      sourceApp,
      entityType,
      entityId: row.entity_id,
      objectId: row.ai_object_id.toString(),
      chunkId: row.ai_chunk_id.toString(),
      title: row.title,
      excerpt: createExcerpt(row.chunk_text, query),
      chunkText: row.chunk_text,
      score,
      similarity: candidate.similarity,
      ranker,
      target,
      permissionState: 'readable',
      includedInContext: false,
      citation: {
        citationId,
        label: row.citation_label ?? `${row.title} #${row.chunk_seq + 1}`,
        sourceApp,
        entityType,
        entityId: row.entity_id,
        objectId: row.ai_object_id.toString(),
        chunkId: row.ai_chunk_id.toString(),
        target,
      },
      metadata: {
        ...(objectMetadata ?? {}),
        ...(chunkMetadata ?? {}),
        retrievalRanker: ranker,
      },
    };
  }

  private buildContextItems(
    results: AiRetrievalResultItem[],
    contextLimit: number,
  ): AiRetrievalContextItem[] {
    return results.slice(0, contextLimit).map((item, index) => {
      const citationId = item.citation?.citationId ?? `r${index + 1}`;
      return {
        citationId,
        label: item.citation?.label ?? `${item.title} #${index + 1}`,
        text: item.chunkText,
        sourceApp: item.sourceApp,
        entityType: item.entityType,
        entityId: item.entityId,
        objectId: item.objectId,
        chunkId: item.chunkId,
        score: item.score,
        target: item.target,
      };
    });
  }

  private async writeRetrievalLog({
    request,
    query,
    sourceApp,
    results,
    contextItems,
    ranker,
    latencyMs,
    currentUser,
  }: {
    request: CommonAiRetrievalRequest;
    query: string;
    sourceApp: CommonSearchSourceApp | undefined;
    results: AiRetrievalResultItem[];
    contextItems: AiRetrievalContextItem[];
    ranker: CommonSearchRanker;
    latencyMs: number;
    currentUser: TokenPayload;
  }): Promise<string | undefined> {
    try {
      return await this.db.client.$transaction(async (tx) => {
        const rows = await tx.$queryRawUnsafe<RetrievalLogIdRow[]>(
          `
          INSERT INTO common.cm_ai_retrieval_log_m (
            request_id,
            conversation_id,
            source_app_code,
            query_text,
            retrieval_mode_code,
            result_count,
            context_count,
            blocked_count,
            status_code,
            latency_ms,
            user_id,
            metadata_jsonb
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 'succeeded', $8, $9, $10::jsonb)
          RETURNING ai_retrieval_log_id
          `,
          request.requestId ?? null,
          toNullableBigInt(request.conversationId),
          sourceApp ?? null,
          query,
          ranker === 'semantic' ? 'vector' : ranker,
          results.length,
          contextItems.length,
          latencyMs,
          getBigIntUserId(currentUser),
          stringifyJson({
            requestedLimit: request.limit,
            contextLimit: request.contextLimit,
            includeContext: request.includeContext !== false,
            ranker,
            resultChunkIds: results.map((item) => item.chunkId),
            contextChunkIds: contextItems.map((item) => item.chunkId),
          }),
        );
        const logId = rows[0]?.ai_retrieval_log_id;
        if (!logId) {
          return undefined;
        }

        for (const [index, item] of results.entries()) {
          await this.insertRetrievalLogItem(tx, logId, item, index + 1);
        }

        return logId.toString();
      });
    } catch (error) {
      this.logger.warn(`Common AI retrieval log write failed: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }

  private async insertRetrievalLogItem(
    client: RetrievalLogDbClient,
    logId: bigint,
    item: AiRetrievalResultItem,
    rankNo: number,
  ): Promise<void> {
    await client.$executeRawUnsafe(
      `
      INSERT INTO common.cm_ai_retrieval_log_item_m (
        ai_retrieval_log_id,
        ai_object_id,
        ai_chunk_id,
        rank_no,
        score,
        similarity,
        included_in_context,
        permission_state_code,
        citation_id,
        metadata_jsonb
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
      `,
      logId,
      BigInt(item.objectId),
      BigInt(item.chunkId),
      rankNo,
      item.score,
      item.similarity ?? null,
      item.includedInContext,
      item.permissionState,
      item.includedInContext ? item.citation?.citationId ?? null : null,
      stringifyJson({
        sourceApp: item.sourceApp,
        entityType: item.entityType,
        entityId: item.entityId,
        title: item.title,
        ranker: item.ranker,
        target: item.target,
      }),
    );
  }

  private aclPredicateSql(parameterOffset = 6): string {
    const userParam = `$${parameterOffset}`;
    const orgParam = `$${parameterOffset + 1}`;
    const teamParam = `$${parameterOffset + 2}`;
    const groupParam = `$${parameterOffset + 3}`;

    return `
      (
        a.access_scope_code = 'public'
        OR (a.access_scope_code = 'organization' AND ${userParam}::text IS NOT NULL)
        OR (a.access_scope_code = 'owner' AND a.acl_snapshot_jsonb->>'ownerUserId' = ${userParam}::text)
        OR COALESCE(a.acl_snapshot_jsonb->'readableUserIds', '[]'::jsonb) ? ${userParam}::text
        OR COALESCE(a.acl_snapshot_jsonb->'userIds', '[]'::jsonb) ? ${userParam}::text
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(COALESCE(a.acl_snapshot_jsonb->'organizationIds', '[]'::jsonb)) AS org_id(value)
          WHERE org_id.value = ANY(${orgParam}::text[])
        )
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(COALESCE(a.acl_snapshot_jsonb->'teamIds', '[]'::jsonb)) AS team_id(value)
          WHERE team_id.value = ANY(${teamParam}::text[])
        )
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(COALESCE(a.acl_snapshot_jsonb->'groupIds', '[]'::jsonb)) AS group_id(value)
          WHERE group_id.value = ANY(${groupParam}::text[])
        )
      )
    `;
  }
}
