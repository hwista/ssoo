import { IntegrationSettingsModule } from '../integrations/integration-settings.module.js';
import { LocalEmbeddingService } from './local-embedding.service.js';
import { EmbeddingSettingsController } from './embedding-settings.controller.js';
import { EmbeddingReindexService } from './embedding-reindex.service.js';
import { AiJobOperationsService } from './ai-job-operations.service.js';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { AiIndexController } from './ai-index.controller.js';
import { AiConversationService } from './ai-conversation.service.js';
import { AiEmbeddingProviderService } from './ai-embedding-provider.service.js';
import { AiIndexRegistryService } from './ai-index-registry.service.js';
import { AiIndexSchedulerService } from './ai-index-scheduler.service.js';
import { AiIndexingService } from './ai-indexing.service.js';
import { AiIndexWorkerService } from './ai-index-worker.service.js';
import { AiModelGatewayService } from './ai-model-gateway.service.js';
import { AiRetrievalService } from './ai-retrieval.service.js';

@Module({
  imports: [DatabaseModule, IntegrationSettingsModule],
  controllers: [AiIndexController, EmbeddingSettingsController],
  providers: [
    LocalEmbeddingService,
    EmbeddingReindexService,
    AiJobOperationsService,
    AiConversationService,
    AiEmbeddingProviderService,
    AiIndexRegistryService,
    AiIndexSchedulerService,
    AiIndexingService,
    AiIndexWorkerService,
    AiModelGatewayService,
    AiRetrievalService,
  ],
  exports: [
    AiConversationService,
    AiEmbeddingProviderService,
    AiIndexRegistryService,
    AiIndexSchedulerService,
    AiIndexingService,
    AiIndexWorkerService,
    AiModelGatewayService,
    AiRetrievalService,
  ],
})
export class CommonAiIndexModule {}
