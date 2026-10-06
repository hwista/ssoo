import { AccessModule } from '../access/access.module.js';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { CommonAiIndexModule } from '../../common/ai-index/ai-index.module.js';
import { CommonSearchModule } from '../../common/search/search.module.js';
import { SnsAiIndexAdapter } from './sns-ai-index.adapter.js';
import { SnsCommonSearchProvider } from './sns-common-search.provider.js';

@Module({
  imports: [AccessModule, DatabaseModule, CommonSearchModule, CommonAiIndexModule],
  providers: [SnsCommonSearchProvider, SnsAiIndexAdapter],
})
export class SnsSearchModule {}
