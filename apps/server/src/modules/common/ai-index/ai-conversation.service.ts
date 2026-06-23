import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AiConversationCreateRequest,
  AiConversationScopeCode,
  AiConversationSnapshot,
  AiConversationStatusCode,
  AiConversationUpdateRequest,
  AiJsonValue,
  AiMessageAppendRequest,
  AiMessageRoleCode,
  AiMessageSnapshot,
  AiMessageStatusCode,
  AiReferenceInput,
  AiReferenceKindCode,
  AiReferenceSnapshot,
  AiRunCompleteRequest,
  AiRunSnapshot,
  AiRunSourceInput,
  AiRunSourceKindCode,
  AiRunSourceSnapshot,
  AiRunStartRequest,
  AiRunStatusCode,
  AiRunTypeCode,
  CommonSearchEntityType,
  CommonSearchSourceApp,
  CommonSearchTarget,
} from '@ssoo/types/common';
import { DatabaseService } from '../../../database/database.service.js';
import type { TokenPayload } from '../auth/interfaces/auth.interface.js';

const SOURCE_APPS = new Set<CommonSearchSourceApp>(['admin', 'crm', 'pms', 'dms', 'sns']);
const ENTITY_TYPES = new Set<CommonSearchEntityType>([
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
const CONVERSATION_SCOPES = new Set<AiConversationScopeCode>(['private', 'source', 'shared']);
const CONVERSATION_STATUSES = new Set<AiConversationStatusCode>(['active', 'archived', 'deleted']);
const MESSAGE_ROLES = new Set<AiMessageRoleCode>(['system', 'user', 'assistant', 'tool']);
const MESSAGE_STATUSES = new Set<AiMessageStatusCode>([
  'created',
  'streaming',
  'completed',
  'failed',
  'cancelled',
]);
const REFERENCE_KINDS = new Set<AiReferenceKindCode>(['retrieval', 'citation', 'attachment', 'manual']);
const RUN_TYPES = new Set<AiRunTypeCode>(['chat', 'search', 'task', 'summary', 'rewrite']);
const RUN_STATUSES = new Set<AiRunStatusCode>(['pending', 'running', 'succeeded', 'failed', 'cancelled']);
const RUN_TERMINAL_STATUSES = new Set<AiRunCompleteRequest['runStatusCode']>(['succeeded', 'failed', 'cancelled']);
const RUN_SOURCE_KINDS = new Set<AiRunSourceKindCode>(['retrieval', 'reference', 'attachment', 'manual']);
const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;

interface AiConversationDbClient {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
}

interface AiConversationRow {
  ai_conversation_id: bigint;
  owner_user_id: bigint | null;
  source_app_code: string | null;
  conversation_scope_code: string;
  conversation_status_code: string;
  title: string | null;
  summary: string | null;
  last_message_at: Date | null;
  metadata_jsonb: unknown;
  created_at: Date;
  updated_at: Date;
}

interface AiMessageRow {
  ai_message_id: bigint;
  ai_conversation_id: bigint;
  parent_message_id: bigint | null;
  message_seq: number;
  role_code: string;
  message_status_code: string;
  content_text: string | null;
  content_jsonb: unknown;
  token_count: number | null;
  metadata_jsonb: unknown;
  created_at: Date;
  updated_at: Date;
}

interface AiReferenceRow {
  ai_reference_id: bigint;
  ai_conversation_id: bigint;
  ai_message_id: bigint | null;
  ai_object_id: bigint | null;
  ai_chunk_id: bigint | null;
  source_app_code: string | null;
  entity_type_code: string | null;
  entity_id: string | null;
  reference_kind_code: string;
  citation_id: string | null;
  citation_label: string | null;
  target_jsonb: unknown;
  metadata_jsonb: unknown;
  created_at: Date;
}

interface AiRunRow {
  ai_run_id: bigint;
  ai_conversation_id: bigint;
  request_message_id: bigint | null;
  response_message_id: bigint | null;
  user_id: bigint | null;
  run_type_code: string;
  run_status_code: string;
  provider_code: string | null;
  model_name: string | null;
  deployment_name: string | null;
  started_at: Date | null;
  finished_at: Date | null;
  latency_ms: number | null;
  input_token_count: number | null;
  output_token_count: number | null;
  total_token_count: number | null;
  last_error_message: string | null;
  request_jsonb: unknown;
  response_jsonb: unknown;
  metadata_jsonb: unknown;
  created_at: Date;
  updated_at: Date;
}

interface AiRunSourceRow {
  ai_run_source_id: bigint;
  ai_run_id: bigint;
  ai_retrieval_log_id: bigint | null;
  ai_reference_id: bigint | null;
  ai_object_id: bigint | null;
  ai_chunk_id: bigint | null;
  source_kind_code: string;
  rank_no: number | null;
  included_in_prompt: boolean;
  citation_id: string | null;
  metadata_jsonb: unknown;
  created_at: Date;
}

interface MessageSeqRow {
  next_message_seq: number | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toJsonParam(value: unknown): string | null {
  return value === undefined || value === null ? null : JSON.stringify(value);
}

function toJsonValue(value: unknown): AiJsonValue | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as AiJsonValue;
}

function toJsonRecord(value: unknown): Record<string, AiJsonValue> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Record<string, AiJsonValue>;
}

function toTarget(value: unknown): CommonSearchTarget | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as CommonSearchTarget;
}

function toIsoString(value: Date | null): string | undefined {
  return value ? value.toISOString() : undefined;
}

function requireCurrentUserId(currentUser: TokenPayload): bigint {
  if (!/^\d+$/.test(currentUser.userId)) {
    throw new ForbiddenException('AI conversation requires a numeric authenticated user.');
  }

  return BigInt(currentUser.userId);
}

function parseBigIntId(value: string | undefined, fieldName: string): bigint {
  if (!value || !/^\d+$/.test(value)) {
    throw new BadRequestException(`${fieldName} must be a numeric string.`);
  }

  return BigInt(value);
}

function parseOptionalBigIntId(value: string | undefined, fieldName: string): bigint | null {
  return value === undefined ? null : parseBigIntId(value, fieldName);
}

function normalizeLimit(limit?: string): number {
  if (!limit) {
    return DEFAULT_LIST_LIMIT;
  }

  const parsed = Number(limit);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIST_LIMIT;
  }

  return Math.min(Math.floor(parsed), MAX_LIST_LIMIT);
}

function normalizeText(value: string | null | undefined, maxLength: number): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function normalizeOptionalCode<T extends string>(
  value: string | undefined,
  allowedValues: Set<T>,
  fieldName: string,
): T | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (allowedValues.has(value as T)) {
    return value as T;
  }

  throw new BadRequestException(`${fieldName} has an unsupported value.`);
}

function normalizeCode<T extends string>(
  value: string | undefined,
  allowedValues: Set<T>,
  fallback: T,
  fieldName: string,
): T {
  return normalizeOptionalCode(value, allowedValues, fieldName) ?? fallback;
}

function hasOwnField<T extends object, K extends PropertyKey>(
  value: T,
  fieldName: K,
): value is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(value, fieldName);
}

function mapConversationScope(value: string): AiConversationScopeCode {
  return CONVERSATION_SCOPES.has(value as AiConversationScopeCode)
    ? value as AiConversationScopeCode
    : 'private';
}

function mapConversationStatus(value: string): AiConversationStatusCode {
  return CONVERSATION_STATUSES.has(value as AiConversationStatusCode)
    ? value as AiConversationStatusCode
    : 'active';
}

function mapMessageRole(value: string): AiMessageRoleCode {
  return MESSAGE_ROLES.has(value as AiMessageRoleCode) ? value as AiMessageRoleCode : 'assistant';
}

function mapMessageStatus(value: string): AiMessageStatusCode {
  return MESSAGE_STATUSES.has(value as AiMessageStatusCode) ? value as AiMessageStatusCode : 'completed';
}

function mapReferenceKind(value: string): AiReferenceKindCode {
  return REFERENCE_KINDS.has(value as AiReferenceKindCode) ? value as AiReferenceKindCode : 'manual';
}

function mapRunType(value: string): AiRunTypeCode {
  return RUN_TYPES.has(value as AiRunTypeCode) ? value as AiRunTypeCode : 'chat';
}

function mapRunStatus(value: string): AiRunStatusCode {
  return RUN_STATUSES.has(value as AiRunStatusCode) ? value as AiRunStatusCode : 'failed';
}

function mapRunSourceKind(value: string): AiRunSourceKindCode {
  return RUN_SOURCE_KINDS.has(value as AiRunSourceKindCode) ? value as AiRunSourceKindCode : 'manual';
}

function normalizeSourceApp(value?: string): CommonSearchSourceApp | undefined {
  return normalizeOptionalCode(value, SOURCE_APPS, 'sourceApp');
}

function normalizeEntityType(value?: string): CommonSearchEntityType | undefined {
  return normalizeOptionalCode(value, ENTITY_TYPES, 'entityType');
}

@Injectable()
export class AiConversationService {
  constructor(private readonly db: DatabaseService) {}

  async listConversations(
    currentUser: TokenPayload,
    query: { sourceApp?: string; status?: string; limit?: string },
  ): Promise<AiConversationSnapshot[]> {
    const ownerUserId = requireCurrentUserId(currentUser);
    const sourceApp = normalizeSourceApp(query.sourceApp);
    const status = normalizeOptionalCode(query.status, CONVERSATION_STATUSES, 'status');
    const limit = normalizeLimit(query.limit);
    const rows = await this.db.client.$queryRawUnsafe<AiConversationRow[]>(
      `
      SELECT
        ai_conversation_id,
        owner_user_id,
        source_app_code,
        conversation_scope_code,
        conversation_status_code,
        title,
        summary,
        last_message_at,
        metadata_jsonb,
        created_at,
        updated_at
      FROM common.cm_ai_conversation_m
      WHERE owner_user_id = $1
        AND is_active = true
        AND ($2::text IS NULL OR source_app_code = $2::text)
        AND ($3::text IS NULL OR conversation_status_code = $3::text)
      ORDER BY updated_at DESC, ai_conversation_id DESC
      LIMIT $4
      `,
      ownerUserId,
      sourceApp ?? null,
      status ?? null,
      limit,
    );

    return rows.map((row) => this.toConversationSnapshot(row));
  }

  async createConversation(
    request: AiConversationCreateRequest,
    currentUser: TokenPayload,
  ): Promise<AiConversationSnapshot> {
    const ownerUserId = requireCurrentUserId(currentUser);
    const sourceApp = normalizeSourceApp(request.sourceApp);
    const scopeCode = normalizeCode(
      request.conversationScopeCode,
      CONVERSATION_SCOPES,
      'private',
      'conversationScopeCode',
    );
    const title = normalizeText(request.title, 300) ?? null;
    const rows = await this.db.client.$queryRawUnsafe<AiConversationRow[]>(
      `
      INSERT INTO common.cm_ai_conversation_m (
        owner_user_id,
        source_app_code,
        conversation_scope_code,
        conversation_status_code,
        title,
        metadata_jsonb,
        created_by,
        updated_by,
        last_source,
        last_activity
      )
      VALUES ($1, $2, $3, 'active', $4, $5::jsonb, $1, $1, 'common-ai-conversation', 'create-conversation')
      RETURNING
        ai_conversation_id,
        owner_user_id,
        source_app_code,
        conversation_scope_code,
        conversation_status_code,
        title,
        summary,
        last_message_at,
        metadata_jsonb,
        created_at,
        updated_at
      `,
      ownerUserId,
      sourceApp ?? null,
      scopeCode,
      title,
      toJsonParam(request.metadata),
    );

    const row = rows[0];
    if (!row) {
      throw new BadRequestException('AI conversation could not be created.');
    }

    return this.toConversationSnapshot(row);
  }

  async getConversation(conversationId: string, currentUser: TokenPayload): Promise<AiConversationSnapshot> {
    const ownerUserId = requireCurrentUserId(currentUser);
    const parsedConversationId = parseBigIntId(conversationId, 'conversationId');
    const conversation = await this.findConversation(this.db.client, parsedConversationId, ownerUserId);
    const [messages, references, runs] = await Promise.all([
      this.findMessages(parsedConversationId),
      this.findReferences(parsedConversationId),
      this.findRuns(parsedConversationId),
    ]);

    const referencesByMessageId = new Map<string, AiReferenceSnapshot[]>();
    for (const reference of references) {
      if (!reference.aiMessageId) {
        continue;
      }
      const items = referencesByMessageId.get(reference.aiMessageId) ?? [];
      items.push(reference);
      referencesByMessageId.set(reference.aiMessageId, items);
    }

    const runsWithSources = await Promise.all(runs.map((run) => this.withRunSources(run)));

    return {
      ...this.toConversationSnapshot(conversation),
      messages: messages.map((message) => ({
        ...message,
        references: referencesByMessageId.get(message.aiMessageId),
      })),
      references,
      runs: runsWithSources,
    };
  }

  async updateConversation(
    conversationId: string,
    request: AiConversationUpdateRequest,
    currentUser: TokenPayload,
  ): Promise<AiConversationSnapshot> {
    const ownerUserId = requireCurrentUserId(currentUser);
    const parsedConversationId = parseBigIntId(conversationId, 'conversationId');
    const scopeCode = normalizeOptionalCode(
      request.conversationScopeCode,
      CONVERSATION_SCOPES,
      'conversationScopeCode',
    );
    const statusCode = normalizeOptionalCode(
      request.conversationStatusCode,
      CONVERSATION_STATUSES,
      'conversationStatusCode',
    );
    const hasTitle = hasOwnField(request, 'title');
    const title = hasTitle ? normalizeText(request.title, 300) ?? null : null;
    const hasSummary = hasOwnField(request, 'summary');
    const summary = hasSummary ? normalizeText(request.summary, 2000) ?? null : null;
    const hasMetadata = hasOwnField(request, 'metadata');
    const rows = await this.db.client.$queryRawUnsafe<AiConversationRow[]>(
      `
      UPDATE common.cm_ai_conversation_m
      SET
        conversation_scope_code = COALESCE($3::text, conversation_scope_code),
        conversation_status_code = COALESCE($4::text, conversation_status_code),
        title = CASE WHEN $5::boolean THEN $6::text ELSE title END,
        summary = CASE WHEN $7::boolean THEN $8::text ELSE summary END,
        metadata_jsonb = CASE WHEN $9::boolean THEN $10::jsonb ELSE metadata_jsonb END,
        updated_by = $2,
        updated_at = now(),
        last_source = 'common-ai-conversation',
        last_activity = 'update-conversation'
      WHERE ai_conversation_id = $1
        AND owner_user_id = $2
        AND is_active = true
      RETURNING
        ai_conversation_id,
        owner_user_id,
        source_app_code,
        conversation_scope_code,
        conversation_status_code,
        title,
        summary,
        last_message_at,
        metadata_jsonb,
        created_at,
        updated_at
      `,
      parsedConversationId,
      ownerUserId,
      scopeCode ?? null,
      statusCode ?? null,
      hasTitle,
      title,
      hasSummary,
      summary,
      hasMetadata,
      toJsonParam(request.metadata),
    );

    const row = rows[0];
    if (!row) {
      throw new NotFoundException('AI conversation not found.');
    }

    return this.toConversationSnapshot(row);
  }

  async appendMessage(
    conversationId: string,
    request: AiMessageAppendRequest,
    currentUser: TokenPayload,
  ): Promise<AiMessageSnapshot> {
    const ownerUserId = requireCurrentUserId(currentUser);
    const parsedConversationId = parseBigIntId(conversationId, 'conversationId');
    const roleCode = normalizeCode(request.roleCode, MESSAGE_ROLES, 'user', 'roleCode');
    const statusCode = normalizeCode(
      request.messageStatusCode,
      MESSAGE_STATUSES,
      'completed',
      'messageStatusCode',
    );
    const parentMessageId = parseOptionalBigIntId(request.parentMessageId, 'parentMessageId');
    const contentText = normalizeText(request.contentText, 50000) ?? null;
    const message = await this.db.client.$transaction(async (tx) => {
      await this.findConversation(tx, parsedConversationId, ownerUserId, true);
      if (parentMessageId) {
        await this.assertMessageBelongsToConversation(tx, parentMessageId, parsedConversationId);
      }

      const sequenceRows = await tx.$queryRawUnsafe<MessageSeqRow[]>(
        `
        SELECT COALESCE(MAX(message_seq), 0) + 1 AS next_message_seq
        FROM common.cm_ai_message_m
        WHERE ai_conversation_id = $1
          AND is_active = true
        `,
        parsedConversationId,
      );
      const messageSeq = sequenceRows[0]?.next_message_seq ?? 1;
      const rows = await tx.$queryRawUnsafe<AiMessageRow[]>(
        `
        INSERT INTO common.cm_ai_message_m (
          ai_conversation_id,
          parent_message_id,
          message_seq,
          role_code,
          message_status_code,
          content_text,
          content_jsonb,
          token_count,
          metadata_jsonb,
          created_by,
          updated_by,
          last_source,
          last_activity
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb, $10, $10, 'common-ai-conversation', 'append-message')
        RETURNING
          ai_message_id,
          ai_conversation_id,
          parent_message_id,
          message_seq,
          role_code,
          message_status_code,
          content_text,
          content_jsonb,
          token_count,
          metadata_jsonb,
          created_at,
          updated_at
        `,
        parsedConversationId,
        parentMessageId,
        messageSeq,
        roleCode,
        statusCode,
        contentText,
        toJsonParam(request.contentJson),
        request.tokenCount ?? null,
        toJsonParam(request.metadata),
        ownerUserId,
      );
      const row = rows[0];
      if (!row) {
        throw new BadRequestException('AI message could not be appended.');
      }

      await tx.$executeRawUnsafe(
        `
        UPDATE common.cm_ai_conversation_m
        SET
          last_message_at = now(),
          title = COALESCE(title, $3::text),
          updated_by = $2,
          updated_at = now(),
          last_source = 'common-ai-conversation',
          last_activity = 'append-message'
        WHERE ai_conversation_id = $1
          AND owner_user_id = $2
        `,
        parsedConversationId,
        ownerUserId,
        roleCode === 'user' && contentText ? contentText.slice(0, 120) : null,
      );

      const references: AiReferenceSnapshot[] = [];
      for (const reference of request.references ?? []) {
        references.push(await this.insertReference(tx, parsedConversationId, row.ai_message_id, reference));
      }

      return {
        ...this.toMessageSnapshot(row),
        references,
      };
    });

    return message;
  }

  async startRun(
    conversationId: string,
    request: AiRunStartRequest,
    currentUser: TokenPayload,
  ): Promise<AiRunSnapshot> {
    const ownerUserId = requireCurrentUserId(currentUser);
    const parsedConversationId = parseBigIntId(conversationId, 'conversationId');
    const requestMessageId = parseOptionalBigIntId(request.requestMessageId, 'requestMessageId');
    const runTypeCode = normalizeCode(request.runTypeCode, RUN_TYPES, 'chat', 'runTypeCode');
    const run = await this.db.client.$transaction(async (tx) => {
      await this.findConversation(tx, parsedConversationId, ownerUserId, true);
      if (requestMessageId) {
        await this.assertMessageBelongsToConversation(tx, requestMessageId, parsedConversationId);
      }

      const rows = await tx.$queryRawUnsafe<AiRunRow[]>(
        `
        INSERT INTO common.cm_ai_run_m (
          ai_conversation_id,
          request_message_id,
          user_id,
          run_type_code,
          run_status_code,
          provider_code,
          model_name,
          deployment_name,
          started_at,
          request_jsonb,
          metadata_jsonb,
          created_by,
          updated_by,
          last_source,
          last_activity
        )
        VALUES ($1, $2, $3, $4, 'running', $5, $6, $7, now(), $8::jsonb, $9::jsonb, $3, $3, 'common-ai-conversation', 'start-run')
        RETURNING
          ai_run_id,
          ai_conversation_id,
          request_message_id,
          response_message_id,
          user_id,
          run_type_code,
          run_status_code,
          provider_code,
          model_name,
          deployment_name,
          started_at,
          finished_at,
          latency_ms,
          input_token_count,
          output_token_count,
          total_token_count,
          last_error_message,
          request_jsonb,
          response_jsonb,
          metadata_jsonb,
          created_at,
          updated_at
        `,
        parsedConversationId,
        requestMessageId,
        ownerUserId,
        runTypeCode,
        normalizeText(request.providerCode, 80) ?? null,
        normalizeText(request.modelName, 160) ?? null,
        normalizeText(request.deploymentName, 160) ?? null,
        toJsonParam(request.requestJson),
        toJsonParam(request.metadata),
      );
      const row = rows[0];
      if (!row) {
        throw new BadRequestException('AI run could not be started.');
      }

      const sources: AiRunSourceSnapshot[] = [];
      for (const source of request.sources ?? []) {
        sources.push(await this.insertRunSource(tx, row.ai_run_id, source));
      }

      return {
        ...this.toRunSnapshot(row),
        sources,
      };
    });

    return run;
  }

  async completeRun(
    conversationId: string,
    runId: string,
    request: AiRunCompleteRequest,
    currentUser: TokenPayload,
  ): Promise<AiRunSnapshot> {
    const ownerUserId = requireCurrentUserId(currentUser);
    const parsedConversationId = parseBigIntId(conversationId, 'conversationId');
    const parsedRunId = parseBigIntId(runId, 'runId');
    const responseMessageId = parseOptionalBigIntId(request.responseMessageId, 'responseMessageId');
    const statusCode = normalizeCode(request.runStatusCode, RUN_TERMINAL_STATUSES, 'succeeded', 'runStatusCode');
    const run = await this.db.client.$transaction(async (tx) => {
      await this.findConversation(tx, parsedConversationId, ownerUserId, true);
      await this.findRun(tx, parsedConversationId, parsedRunId);
      if (responseMessageId) {
        await this.assertMessageBelongsToConversation(tx, responseMessageId, parsedConversationId);
      }

      const rows = await tx.$queryRawUnsafe<AiRunRow[]>(
        `
        UPDATE common.cm_ai_run_m
        SET
          response_message_id = COALESCE($3::bigint, response_message_id),
          run_status_code = $4,
          finished_at = COALESCE($5::timestamptz, now()),
          latency_ms = COALESCE($6::integer, latency_ms),
          input_token_count = COALESCE($7::integer, input_token_count),
          output_token_count = COALESCE($8::integer, output_token_count),
          total_token_count = COALESCE($9::integer, total_token_count),
          last_error_message = $10,
          response_jsonb = COALESCE($11::jsonb, response_jsonb),
          metadata_jsonb = COALESCE($12::jsonb, metadata_jsonb),
          updated_by = $13,
          updated_at = now(),
          last_source = 'common-ai-conversation',
          last_activity = 'complete-run'
        WHERE ai_conversation_id = $1
          AND ai_run_id = $2
          AND is_active = true
        RETURNING
          ai_run_id,
          ai_conversation_id,
          request_message_id,
          response_message_id,
          user_id,
          run_type_code,
          run_status_code,
          provider_code,
          model_name,
          deployment_name,
          started_at,
          finished_at,
          latency_ms,
          input_token_count,
          output_token_count,
          total_token_count,
          last_error_message,
          request_jsonb,
          response_jsonb,
          metadata_jsonb,
          created_at,
          updated_at
        `,
        parsedConversationId,
        parsedRunId,
        responseMessageId,
        statusCode,
        request.finishedAt ? new Date(request.finishedAt) : null,
        request.latencyMs ?? null,
        request.inputTokenCount ?? null,
        request.outputTokenCount ?? null,
        request.totalTokenCount ?? null,
        normalizeText(request.lastErrorMessage, 1000) ?? null,
        toJsonParam(request.responseJson),
        toJsonParam(request.metadata),
        ownerUserId,
      );
      const row = rows[0];
      if (!row) {
        throw new NotFoundException('AI run not found.');
      }

      return {
        ...this.toRunSnapshot(row),
        sources: await this.findRunSources(row.ai_run_id, tx),
      };
    });

    return run;
  }

  private async findConversation(
    client: AiConversationDbClient,
    conversationId: bigint,
    ownerUserId: bigint,
    forUpdate = false,
  ): Promise<AiConversationRow> {
    const rows = await client.$queryRawUnsafe<AiConversationRow[]>(
      `
      SELECT
        ai_conversation_id,
        owner_user_id,
        source_app_code,
        conversation_scope_code,
        conversation_status_code,
        title,
        summary,
        last_message_at,
        metadata_jsonb,
        created_at,
        updated_at
      FROM common.cm_ai_conversation_m
      WHERE ai_conversation_id = $1
        AND owner_user_id = $2
        AND is_active = true
      ${forUpdate ? 'FOR UPDATE' : ''}
      `,
      conversationId,
      ownerUserId,
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('AI conversation not found.');
    }

    return row;
  }

  private async findMessages(conversationId: bigint): Promise<AiMessageSnapshot[]> {
    const rows = await this.db.client.$queryRawUnsafe<AiMessageRow[]>(
      `
      SELECT
        ai_message_id,
        ai_conversation_id,
        parent_message_id,
        message_seq,
        role_code,
        message_status_code,
        content_text,
        content_jsonb,
        token_count,
        metadata_jsonb,
        created_at,
        updated_at
      FROM common.cm_ai_message_m
      WHERE ai_conversation_id = $1
        AND is_active = true
      ORDER BY message_seq ASC
      `,
      conversationId,
    );

    return rows.map((row) => this.toMessageSnapshot(row));
  }

  private async findReferences(conversationId: bigint): Promise<AiReferenceSnapshot[]> {
    const rows = await this.db.client.$queryRawUnsafe<AiReferenceRow[]>(
      `
      SELECT
        ai_reference_id,
        ai_conversation_id,
        ai_message_id,
        ai_object_id,
        ai_chunk_id,
        source_app_code,
        entity_type_code,
        entity_id,
        reference_kind_code,
        citation_id,
        citation_label,
        target_jsonb,
        metadata_jsonb,
        created_at
      FROM common.cm_ai_reference_m
      WHERE ai_conversation_id = $1
      ORDER BY created_at ASC, ai_reference_id ASC
      `,
      conversationId,
    );

    return rows.map((row) => this.toReferenceSnapshot(row));
  }

  private async findRuns(conversationId: bigint): Promise<AiRunSnapshot[]> {
    const rows = await this.db.client.$queryRawUnsafe<AiRunRow[]>(
      `
      SELECT
        ai_run_id,
        ai_conversation_id,
        request_message_id,
        response_message_id,
        user_id,
        run_type_code,
        run_status_code,
        provider_code,
        model_name,
        deployment_name,
        started_at,
        finished_at,
        latency_ms,
        input_token_count,
        output_token_count,
        total_token_count,
        last_error_message,
        request_jsonb,
        response_jsonb,
        metadata_jsonb,
        created_at,
        updated_at
      FROM common.cm_ai_run_m
      WHERE ai_conversation_id = $1
        AND is_active = true
      ORDER BY created_at ASC, ai_run_id ASC
      `,
      conversationId,
    );

    return rows.map((row) => this.toRunSnapshot(row));
  }

  private async withRunSources(run: AiRunSnapshot): Promise<AiRunSnapshot> {
    return {
      ...run,
      sources: await this.findRunSources(BigInt(run.aiRunId), this.db.client),
    };
  }

  private async findRun(
    client: AiConversationDbClient,
    conversationId: bigint,
    runId: bigint,
  ): Promise<AiRunRow> {
    const rows = await client.$queryRawUnsafe<AiRunRow[]>(
      `
      SELECT
        ai_run_id,
        ai_conversation_id,
        request_message_id,
        response_message_id,
        user_id,
        run_type_code,
        run_status_code,
        provider_code,
        model_name,
        deployment_name,
        started_at,
        finished_at,
        latency_ms,
        input_token_count,
        output_token_count,
        total_token_count,
        last_error_message,
        request_jsonb,
        response_jsonb,
        metadata_jsonb,
        created_at,
        updated_at
      FROM common.cm_ai_run_m
      WHERE ai_conversation_id = $1
        AND ai_run_id = $2
        AND is_active = true
      FOR UPDATE
      `,
      conversationId,
      runId,
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('AI run not found.');
    }

    return row;
  }

  private async findRunSources(
    runId: bigint,
    client: AiConversationDbClient,
  ): Promise<AiRunSourceSnapshot[]> {
    const rows = await client.$queryRawUnsafe<AiRunSourceRow[]>(
      `
      SELECT
        ai_run_source_id,
        ai_run_id,
        ai_retrieval_log_id,
        ai_reference_id,
        ai_object_id,
        ai_chunk_id,
        source_kind_code,
        rank_no,
        included_in_prompt,
        citation_id,
        metadata_jsonb,
        created_at
      FROM common.cm_ai_run_source_r
      WHERE ai_run_id = $1
      ORDER BY rank_no ASC NULLS LAST, ai_run_source_id ASC
      `,
      runId,
    );

    return rows.map((row) => this.toRunSourceSnapshot(row));
  }

  private async assertMessageBelongsToConversation(
    client: AiConversationDbClient,
    messageId: bigint,
    conversationId: bigint,
  ): Promise<void> {
    const rows = await client.$queryRawUnsafe<Array<{ ai_message_id: bigint }>>(
      `
      SELECT ai_message_id
      FROM common.cm_ai_message_m
      WHERE ai_message_id = $1
        AND ai_conversation_id = $2
        AND is_active = true
      LIMIT 1
      `,
      messageId,
      conversationId,
    );

    if (!rows[0]) {
      throw new BadRequestException('messageId must belong to the target AI conversation.');
    }
  }

  private async insertReference(
    client: AiConversationDbClient,
    conversationId: bigint,
    messageId: bigint | null,
    reference: AiReferenceInput,
  ): Promise<AiReferenceSnapshot> {
    const sourceApp = normalizeSourceApp(reference.sourceApp);
    const entityType = normalizeEntityType(reference.entityType);
    const referenceKindCode = normalizeCode(
      reference.referenceKindCode,
      REFERENCE_KINDS,
      'manual',
      'referenceKindCode',
    );
    const rows = await client.$queryRawUnsafe<AiReferenceRow[]>(
      `
      INSERT INTO common.cm_ai_reference_m (
        ai_conversation_id,
        ai_message_id,
        ai_object_id,
        ai_chunk_id,
        source_app_code,
        entity_type_code,
        entity_id,
        reference_kind_code,
        citation_id,
        citation_label,
        target_jsonb,
        metadata_jsonb
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb)
      RETURNING
        ai_reference_id,
        ai_conversation_id,
        ai_message_id,
        ai_object_id,
        ai_chunk_id,
        source_app_code,
        entity_type_code,
        entity_id,
        reference_kind_code,
        citation_id,
        citation_label,
        target_jsonb,
        metadata_jsonb,
        created_at
      `,
      conversationId,
      messageId,
      parseOptionalBigIntId(reference.aiObjectId, 'aiObjectId'),
      parseOptionalBigIntId(reference.aiChunkId, 'aiChunkId'),
      sourceApp ?? null,
      entityType ?? null,
      normalizeText(reference.entityId, 200) ?? null,
      referenceKindCode,
      normalizeText(reference.citationId, 120) ?? null,
      normalizeText(reference.citationLabel, 120) ?? null,
      toJsonParam(reference.target),
      toJsonParam(reference.metadata),
    );
    const row = rows[0];
    if (!row) {
      throw new BadRequestException('AI reference could not be created.');
    }

    return this.toReferenceSnapshot(row);
  }

  private async insertRunSource(
    client: AiConversationDbClient,
    runId: bigint,
    source: AiRunSourceInput,
  ): Promise<AiRunSourceSnapshot> {
    const sourceKindCode = normalizeCode(
      source.sourceKindCode,
      RUN_SOURCE_KINDS,
      'manual',
      'sourceKindCode',
    );
    const rows = await client.$queryRawUnsafe<AiRunSourceRow[]>(
      `
      INSERT INTO common.cm_ai_run_source_r (
        ai_run_id,
        ai_retrieval_log_id,
        ai_reference_id,
        ai_object_id,
        ai_chunk_id,
        source_kind_code,
        rank_no,
        included_in_prompt,
        citation_id,
        metadata_jsonb
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::boolean, false), $9, $10::jsonb)
      RETURNING
        ai_run_source_id,
        ai_run_id,
        ai_retrieval_log_id,
        ai_reference_id,
        ai_object_id,
        ai_chunk_id,
        source_kind_code,
        rank_no,
        included_in_prompt,
        citation_id,
        metadata_jsonb,
        created_at
      `,
      runId,
      parseOptionalBigIntId(source.aiRetrievalLogId, 'aiRetrievalLogId'),
      parseOptionalBigIntId(source.aiReferenceId, 'aiReferenceId'),
      parseOptionalBigIntId(source.aiObjectId, 'aiObjectId'),
      parseOptionalBigIntId(source.aiChunkId, 'aiChunkId'),
      sourceKindCode,
      source.rankNo ?? null,
      source.includedInPrompt ?? null,
      normalizeText(source.citationId, 120) ?? null,
      toJsonParam(source.metadata),
    );
    const row = rows[0];
    if (!row) {
      throw new BadRequestException('AI run source could not be created.');
    }

    return this.toRunSourceSnapshot(row);
  }

  private toConversationSnapshot(row: AiConversationRow): AiConversationSnapshot {
    return {
      aiConversationId: row.ai_conversation_id.toString(),
      ownerUserId: row.owner_user_id?.toString(),
      sourceApp: row.source_app_code ? normalizeSourceApp(row.source_app_code) : undefined,
      conversationScopeCode: mapConversationScope(row.conversation_scope_code),
      conversationStatusCode: mapConversationStatus(row.conversation_status_code),
      title: row.title ?? undefined,
      summary: row.summary ?? undefined,
      lastMessageAt: toIsoString(row.last_message_at),
      metadata: toJsonRecord(row.metadata_jsonb),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private toMessageSnapshot(row: AiMessageRow): AiMessageSnapshot {
    return {
      aiMessageId: row.ai_message_id.toString(),
      aiConversationId: row.ai_conversation_id.toString(),
      parentMessageId: row.parent_message_id?.toString(),
      messageSeq: row.message_seq,
      roleCode: mapMessageRole(row.role_code),
      messageStatusCode: mapMessageStatus(row.message_status_code),
      contentText: row.content_text ?? undefined,
      contentJson: toJsonValue(row.content_jsonb),
      tokenCount: row.token_count ?? undefined,
      metadata: toJsonRecord(row.metadata_jsonb),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private toReferenceSnapshot(row: AiReferenceRow): AiReferenceSnapshot {
    return {
      aiReferenceId: row.ai_reference_id.toString(),
      aiConversationId: row.ai_conversation_id.toString(),
      aiMessageId: row.ai_message_id?.toString(),
      aiObjectId: row.ai_object_id?.toString(),
      aiChunkId: row.ai_chunk_id?.toString(),
      sourceApp: row.source_app_code ? normalizeSourceApp(row.source_app_code) : undefined,
      entityType: row.entity_type_code ? normalizeEntityType(row.entity_type_code) : undefined,
      entityId: row.entity_id ?? undefined,
      referenceKindCode: mapReferenceKind(row.reference_kind_code),
      citationId: row.citation_id ?? undefined,
      citationLabel: row.citation_label ?? undefined,
      target: toTarget(row.target_jsonb),
      metadata: toJsonRecord(row.metadata_jsonb),
      createdAt: row.created_at.toISOString(),
    };
  }

  private toRunSnapshot(row: AiRunRow): AiRunSnapshot {
    return {
      aiRunId: row.ai_run_id.toString(),
      aiConversationId: row.ai_conversation_id.toString(),
      requestMessageId: row.request_message_id?.toString(),
      responseMessageId: row.response_message_id?.toString(),
      userId: row.user_id?.toString(),
      runTypeCode: mapRunType(row.run_type_code),
      runStatusCode: mapRunStatus(row.run_status_code),
      providerCode: row.provider_code ?? undefined,
      modelName: row.model_name ?? undefined,
      deploymentName: row.deployment_name ?? undefined,
      startedAt: toIsoString(row.started_at),
      finishedAt: toIsoString(row.finished_at),
      latencyMs: row.latency_ms ?? undefined,
      inputTokenCount: row.input_token_count ?? undefined,
      outputTokenCount: row.output_token_count ?? undefined,
      totalTokenCount: row.total_token_count ?? undefined,
      lastErrorMessage: row.last_error_message ?? undefined,
      requestJson: toJsonValue(row.request_jsonb),
      responseJson: toJsonValue(row.response_jsonb),
      metadata: toJsonRecord(row.metadata_jsonb),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  private toRunSourceSnapshot(row: AiRunSourceRow): AiRunSourceSnapshot {
    return {
      aiRunSourceId: row.ai_run_source_id.toString(),
      aiRunId: row.ai_run_id.toString(),
      aiRetrievalLogId: row.ai_retrieval_log_id?.toString(),
      aiReferenceId: row.ai_reference_id?.toString(),
      aiObjectId: row.ai_object_id?.toString(),
      aiChunkId: row.ai_chunk_id?.toString(),
      sourceKindCode: mapRunSourceKind(row.source_kind_code),
      rankNo: row.rank_no ?? undefined,
      includedInPrompt: row.included_in_prompt,
      citationId: row.citation_id ?? undefined,
      metadata: toJsonRecord(row.metadata_jsonb),
      createdAt: row.created_at.toISOString(),
    };
  }
}
