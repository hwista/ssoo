import { Module } from '@nestjs/common';
import { CommonSearchModule } from '../../common/search/search.module.js';
import { OpportunityModule } from '../opportunity/opportunity.module.js';
import { CrmCommonSearchProvider } from './crm-common-search.provider.js';

@Module({
  imports: [CommonSearchModule, OpportunityModule],
  providers: [CrmCommonSearchProvider],
})
export class CrmSearchModule {}
