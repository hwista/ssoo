import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { AccessModule } from '../access/access.module.js';
import { SearchController } from './search.controller.js';
import { SearchRuntimeService } from './search-runtime.service.js';
import { SearchService } from './search.service.js';

@Module({
  imports: [DatabaseModule, AccessModule],
  controllers: [SearchController],
  providers: [SearchRuntimeService, SearchService],
  exports: [SearchRuntimeService, SearchService],
})
export class SearchModule {}
