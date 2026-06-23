#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

function readText(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf-8');
}

function assertIncludes(content, pattern, message) {
  if (!content.includes(pattern)) {
    throw new Error(message);
  }
}

function assertNotIncludes(content, pattern, message) {
  if (content.includes(pattern)) {
    throw new Error(message);
  }
}

const requiredFiles = [
  'packages/types/src/common/ai.ts',
  'packages/types/src/common/ai-index.ts',
  'packages/types/src/common/ai-retrieval.ts',
  'packages/database/prisma/migrations/20260623053000_add_common_ai_rag_platform/migration.sql',
  'packages/database/prisma/triggers/63_cm_ai_source_h_trigger.sql',
  'packages/database/prisma/triggers/64_cm_ai_object_h_trigger.sql',
  'packages/database/prisma/triggers/65_cm_ai_index_state_h_trigger.sql',
  'apps/server/src/modules/common/ai-index/ai-index.module.ts',
  'apps/server/src/modules/common/ai-index/ai-azure-provider.ts',
  'apps/server/src/modules/common/ai-index/ai-conversation.service.ts',
  'apps/server/src/modules/common/ai-index/ai-embedding-provider.service.ts',
  'apps/server/src/modules/common/ai-index/ai-indexing.service.ts',
  'apps/server/src/modules/common/ai-index/ai-model-gateway.service.ts',
  'apps/server/src/modules/common/ai-index/ai-retrieval.service.ts',
  'apps/server/src/modules/dms/ask/ask.module.ts',
  'apps/server/src/modules/dms/ask/ask.service.ts',
  'apps/server/src/modules/dms/search/dms-ai-index.adapter.ts',
  'docs/common/explanation/architecture/ai-rag-platform-roadmap.md',
];

for (const file of requiredFiles) {
  readText(file);
}

const commonTypesIndex = readText('packages/types/src/common/index.ts');
assertIncludes(commonTypesIndex, "from './ai'", 'common types index must export AI conversation contracts');
assertIncludes(commonTypesIndex, "from './ai-index'", 'common types index must export AI index contracts');
assertIncludes(commonTypesIndex, "from './ai-retrieval'", 'common types index must export AI retrieval contracts');

const rootTypesIndex = readText('packages/types/src/index.ts');
assertIncludes(rootTypesIndex, "from './common/ai-index'", 'root types index must export AI index contracts');

const aiIndexTypes = readText('packages/types/src/common/ai-index.ts');
assertIncludes(aiIndexTypes, 'AiIndexJobSafetySnapshot', 'AI index types must expose job safety policy snapshots');
assertIncludes(aiIndexTypes, 'AiIndexEmbeddingSyncSnapshot', 'AI index types must expose embedding sync snapshots');
assertIncludes(aiIndexTypes, 'embedding_runtime_failed', 'AI index types must distinguish embedding runtime failure');
assertIncludes(aiIndexTypes, 'embedding_provider_unavailable', 'AI index types must distinguish provider unavailable');

const aiTypes = readText('packages/types/src/common/ai.ts');
assertIncludes(aiTypes, 'AiConversationUpdateRequest', 'AI types must expose conversation update contracts');
assertIncludes(aiTypes, 'AiRunStartRequest', 'AI types must expose model run start audit contracts');
assertIncludes(aiTypes, 'AiRunCompleteRequest', 'AI types must expose model run completion audit contracts');

const schema = readText('packages/database/prisma/schema.prisma');
for (const model of [
  'model AiSource',
  'model AiObject',
  'model AiChunk',
  'model AiEmbedding',
  'model AiAclSnapshot',
  'model AiIndexJob',
  'model AiIndexState',
  'model AiRetrievalLog',
  'model AiConversation',
  '@@map("cm_ai_source_m")',
  '@@map("cm_ai_object_m")',
  '@@map("cm_ai_embedding_m")',
]) {
  assertIncludes(schema, model, `Prisma schema missing ${model}`);
}

const migration = readText('packages/database/prisma/migrations/20260623053000_add_common_ai_rag_platform/migration.sql');
for (const table of [
  '"common"."cm_ai_source_m"',
  '"common"."cm_ai_object_m"',
  '"common"."cm_ai_chunk_m"',
  '"common"."cm_ai_embedding_m"',
  '"common"."cm_ai_index_job_m"',
  '"common"."cm_ai_index_state_m"',
  '"common"."cm_ai_conversation_m"',
]) {
  assertIncludes(migration, table, `AI/RAG migration missing ${table}`);
}

const applyTriggers = readText('packages/database/scripts/apply-triggers.ts');
assertIncludes(applyTriggers, '63_cm_ai_source_h_trigger.sql', 'apply-triggers must include AI source history trigger');
assertIncludes(applyTriggers, '64_cm_ai_object_h_trigger.sql', 'apply-triggers must include AI object history trigger');
assertIncludes(applyTriggers, '65_cm_ai_index_state_h_trigger.sql', 'apply-triggers must include AI index state history trigger');

const commonModule = readText('apps/server/src/modules/common/common.module.ts');
assertIncludes(commonModule, 'CommonAiIndexModule', 'CommonModule must include CommonAiIndexModule');

const commonAiIndexModule = readText('apps/server/src/modules/common/ai-index/ai-index.module.ts');
assertIncludes(commonAiIndexModule, 'AiEmbeddingProviderService', 'CommonAiIndexModule must provide AiEmbeddingProviderService');
assertIncludes(commonAiIndexModule, 'AiRetrievalService', 'CommonAiIndexModule must provide AiRetrievalService');
assertIncludes(commonAiIndexModule, 'AiConversationService', 'CommonAiIndexModule must provide AiConversationService');
assertIncludes(commonAiIndexModule, 'AiModelGatewayService', 'CommonAiIndexModule must provide AiModelGatewayService');

const aiAzureProvider = readText('apps/server/src/modules/common/ai-index/ai-azure-provider.ts');
assertIncludes(aiAzureProvider, 'AiChatProviderStatus', 'Common Azure provider must expose chat provider status');
assertIncludes(aiAzureProvider, 'getAzureChatProviderStatus', 'Common Azure provider must expose chat readiness checks');
assertIncludes(aiAzureProvider, 'AZURE_OPENAI_CHAT_DEPLOYMENT', 'Common Azure provider must support explicit chat deployment env');

const aiEmbeddingProvider = readText('apps/server/src/modules/common/ai-index/ai-embedding-provider.service.ts');
assertIncludes(aiEmbeddingProvider, 'AiEmbeddingProviderUnavailableError', 'AI embedding provider must expose deterministic unavailable errors');
assertIncludes(aiEmbeddingProvider, 'embedTexts', 'AI embedding provider must expose batch embedding');

const aiModelGateway = readText('apps/server/src/modules/common/ai-index/ai-model-gateway.service.ts');
assertIncludes(aiModelGateway, 'AiModelGatewayService', 'AI model gateway service must exist');
assertIncludes(aiModelGateway, 'getAzureChatProviderStatus', 'AI model gateway must own provider readiness');
assertIncludes(aiModelGateway, 'generateText', 'AI model gateway must own non-stream text generation');
assertIncludes(aiModelGateway, 'streamText', 'AI model gateway must own streaming text generation');

const aiIndexingService = readText('apps/server/src/modules/common/ai-index/ai-indexing.service.ts');
assertIncludes(aiIndexingService, 'syncObjectChunks', 'AI indexer must sync chunks without deleting stable chunk identities');
assertIncludes(aiIndexingService, 'upsertChunkEmbeddings', 'AI indexer must upsert common chunk embeddings');
assertIncludes(aiIndexingService, 'common.cm_ai_embedding_m', 'AI indexer must write to common AI embedding table');
assertIncludes(aiIndexingService, 'embedding_hash', 'AI indexer must diff embeddings by chunk hash');
assertIncludes(aiIndexingService, 'DEFAULT_EMBEDDING_BATCH_SIZE', 'AI indexer must define an embedding batch policy');
assertIncludes(aiIndexingService, 'computeRetryDelayMs', 'AI indexer must compute retry backoff from job safety policy');
assertIncludes(aiIndexingService, 'metadata_jsonb', 'AI index jobs/states must persist safety metadata');
assertIncludes(aiIndexingService, 'AiEmbeddingSyncError', 'AI indexer must persist failed embedding sync state before retry');
assertIncludes(aiIndexingService, 'deactivateProfileMismatchEmbeddings', 'AI indexer must deactivate profile-mismatch embeddings');
assertIncludes(aiIndexingService, 'profileMismatchReindex', 'AI indexer must record profile mismatch reindex metadata');

const aiRetrievalService = readText('apps/server/src/modules/common/ai-index/ai-retrieval.service.ts');
assertIncludes(aiRetrievalService, 'embedText(query', 'AI retrieval service must embed query text for vector retrieval');
assertIncludes(aiRetrievalService, 'e.embedding <=> $1::vector', 'AI retrieval service must query common pgvector embeddings');
assertIncludes(aiRetrievalService, 'findKeywordRows', 'AI retrieval service must provide keyword fallback');
assertIncludes(aiRetrievalService, 'aclPredicateSql', 'AI retrieval service must apply ACL pre-filter');
assertIncludes(aiRetrievalService, "st.index_status_code = 'indexed'", 'AI retrieval service must exclude stale/partial index states');
assertIncludes(aiRetrievalService, 'e.embedding_hash = c.content_hash', 'AI retrieval service must exclude stale embeddings');
assertIncludes(aiRetrievalService, 'buildContextItems', 'AI retrieval service must assemble response context items');
assertIncludes(aiRetrievalService, 'writeRetrievalLog', 'AI retrieval service must persist retrieval logs');
assertIncludes(aiRetrievalService, '$transaction', 'AI retrieval service must write retrieval logs transactionally');
assertIncludes(aiRetrievalService, 'common.cm_ai_retrieval_log_m', 'AI retrieval service must write retrieval log header');
assertIncludes(aiRetrievalService, 'common.cm_ai_retrieval_log_item_m', 'AI retrieval service must write retrieval log items');
assertIncludes(aiRetrievalService, 'retrievalLogId && contextItems.length > 0', 'AI retrieval service must gate ragReady on logged context assembly');

const aiIndexController = readText('apps/server/src/modules/common/ai-index/ai-index.controller.ts');
assertIncludes(aiIndexController, "Post('retrieval/query')", 'AI index controller must expose common retrieval query endpoint');
assertIncludes(aiIndexController, "Post('conversations')", 'AI index controller must expose common conversation creation endpoint');
assertIncludes(aiIndexController, "Post('conversations/:conversationId/messages')", 'AI index controller must expose common message append endpoint');
assertIncludes(aiIndexController, "Post('conversations/:conversationId/runs')", 'AI index controller must expose model run start endpoint');
assertIncludes(aiIndexController, "Post('conversations/:conversationId/runs/:runId/complete')", 'AI index controller must expose model run completion endpoint');

const aiConversationService = readText('apps/server/src/modules/common/ai-index/ai-conversation.service.ts');
assertIncludes(aiConversationService, 'common.cm_ai_conversation_m', 'AI conversation service must write common conversation records');
assertIncludes(aiConversationService, 'common.cm_ai_message_m', 'AI conversation service must write common message records');
assertIncludes(aiConversationService, 'common.cm_ai_reference_m', 'AI conversation service must write common reference records');
assertIncludes(aiConversationService, 'common.cm_ai_run_m', 'AI conversation service must write common model run records');
assertIncludes(aiConversationService, 'common.cm_ai_run_source_r', 'AI conversation service must write common model run source records');
assertIncludes(aiConversationService, '$transaction', 'AI conversation service must write message/run audit records transactionally');
assertIncludes(aiConversationService, 'owner_user_id = $2', 'AI conversation service must scope reads and writes to the current owner user');

const dmsSearchProvider = readText('apps/server/src/modules/dms/search/search.provider.ts');
assertIncludes(dmsSearchProvider, '../../common/ai-index/ai-azure-provider.js', 'DMS provider must delegate Azure provider creation to common AI provider');

const dmsSearchModule = readText('apps/server/src/modules/dms/search/search.module.ts');
assertIncludes(dmsSearchModule, 'CommonAiIndexModule', 'DMS search module must import CommonAiIndexModule');
assertIncludes(dmsSearchModule, 'DmsAiIndexAdapter', 'DMS search module must provide DmsAiIndexAdapter');

const dmsSearchService = readText('apps/server/src/modules/dms/search/search.service.ts');
assertIncludes(dmsSearchService, 'syncCommonAiIndex', 'DMS search sync must also update the common AI index');
assertIncludes(dmsSearchService, 'AiEmbeddingProviderService', 'DMS search service must use the common AI embedding provider');

const dmsAskModule = readText('apps/server/src/modules/dms/ask/ask.module.ts');
assertIncludes(dmsAskModule, 'CommonAiIndexModule', 'DMS Ask module must import CommonAiIndexModule');

const dmsAskService = readText('apps/server/src/modules/dms/ask/ask.service.ts');
assertIncludes(dmsAskService, 'AiRetrievalService', 'DMS Ask service must use common AI retrieval');
assertIncludes(dmsAskService, 'AiConversationService', 'DMS Ask service must use common conversation/run audit');
assertIncludes(dmsAskService, 'AiModelGatewayService', 'DMS Ask service must use common model gateway');
assertIncludes(dmsAskService, "sourceApp: 'dms'", 'DMS Ask common retrieval must be scoped to DMS source app');
assertIncludes(dmsAskService, "entityTypes: ['document']", 'DMS Ask common retrieval must request document projections');
assertIncludes(dmsAskService, 'retrievalLogId', 'DMS Ask must connect retrieval logs to run audit');
assertIncludes(dmsAskService, 'contextItems', 'DMS Ask must consume common retrieval context items');
assertIncludes(dmsAskService, 'modelStatus.providerCode', 'DMS Ask run audit must record gateway provider metadata');
assertIncludes(dmsAskService, 'deploymentName: modelStatus.deploymentName', 'DMS Ask run audit must record gateway deployment metadata');
assertIncludes(dmsAskService, 'safeStartAskAudit', 'DMS Ask must start common conversation/run audit');
assertIncludes(dmsAskService, 'safeCompleteAskAuditSuccess', 'DMS Ask must complete successful runs');
assertIncludes(dmsAskService, 'safeCompleteAskAuditFailure', 'DMS Ask must complete failed runs');
assertIncludes(dmsAskService, 'loadLegacySearchContext', 'DMS Ask must preserve legacy DMS search fallback during migration');
assertNotIncludes(dmsAskService, 'getChatModel', 'DMS Ask must not call the DMS chat model provider directly');
assertNotIncludes(dmsAskService, 'generateText, streamText', 'DMS Ask must not import AI SDK generation primitives directly');

const roadmap = readText('docs/common/explanation/architecture/ai-rag-platform-roadmap.md');
assertIncludes(roadmap, 'AI-RAG-06. Retrieval Service', 'AI/RAG roadmap must keep retrieval phase');
assertIncludes(roadmap, 'AI-RAG-07. Conversation and Run Service', 'AI/RAG roadmap must keep conversation/run phase');
assertIncludes(roadmap, 'AI-RAG-07B', 'AI/RAG roadmap must track DMS Ask migration status');
assertIncludes(roadmap, 'AI-RAG-07C', 'AI/RAG roadmap must track model gateway integration status');

console.log('✓ AI/RAG platform verification passed');
