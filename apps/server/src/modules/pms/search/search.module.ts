import { ProjectAccessService } from '../project/project-access.service.js';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { CommonAiIndexModule } from '../../common/ai-index/ai-index.module.js';
import { CommonSearchModule } from '../../common/search/search.module.js';
import { PmsAiIndexAdapter } from './pms-ai-index.adapter.js';
import { PmsCommonSearchProvider } from './pms-common-search.provider.js';

@Module({
  imports: [DatabaseModule, CommonSearchModule, CommonAiIndexModule],
  providers: [ProjectAccessService, PmsCommonSearchProvider, PmsAiIndexAdapter],
})
export class PmsSearchModule {}
