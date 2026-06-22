import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { CommonSearchModule } from '../../common/search/search.module.js';
import { AccessModule } from '../access/access.module.js';
import { DmsCommonSearchProvider } from './dms-common-search.provider.js';
import { SearchController } from './search.controller.js';
import { SearchHistoryService } from './search-history.service.js';
import { SearchRuntimeService } from './search-runtime.service.js';
import { SearchService } from './search.service.js';

@Module({
  imports: [DatabaseModule, AccessModule, CommonSearchModule],
  controllers: [SearchController],
  providers: [SearchRuntimeService, SearchHistoryService, SearchService, DmsCommonSearchProvider],
  exports: [SearchRuntimeService, SearchHistoryService, SearchService],
})
export class SearchModule {}
