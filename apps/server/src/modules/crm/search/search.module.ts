import { CrmAccessModule } from '../access/access.module.js';
import { Module } from '@nestjs/common';
import { CommonAiIndexModule } from '../../common/ai-index/ai-index.module.js';
import { CommonSearchModule } from '../../common/search/search.module.js';
import { CustomerModule } from '../customer/customer.module.js';
import { OpportunityModule } from '../opportunity/opportunity.module.js';
import { CrmAiIndexAdapter } from './crm-ai-index.adapter.js';
import { CrmCommonSearchProvider } from './crm-common-search.provider.js';

@Module({
  imports: [CrmAccessModule, CommonSearchModule, CommonAiIndexModule, OpportunityModule, CustomerModule],
  providers: [CrmCommonSearchProvider, CrmAiIndexAdapter],
})
export class CrmSearchModule {}
