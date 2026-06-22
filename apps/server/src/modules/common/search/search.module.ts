import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { AccessFoundationModule } from '../access/access-foundation.module.js';
import { CommonSearchController } from './search.controller.js';
import { CommonSearchRegistryService } from './search-registry.service.js';
import { CommonSearchService } from './search.service.js';
import { AdminCommonSearchProvider } from './providers/admin-common-search.provider.js';

@Module({
  imports: [DatabaseModule, AccessFoundationModule],
  controllers: [CommonSearchController],
  providers: [CommonSearchRegistryService, CommonSearchService, AdminCommonSearchProvider],
  exports: [CommonSearchRegistryService, CommonSearchService],
})
export class CommonSearchModule {}
