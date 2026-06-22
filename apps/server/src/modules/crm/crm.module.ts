import { Module } from '@nestjs/common';
import { OpportunityModule } from './opportunity/opportunity.module.js';
import { CrmSearchModule } from './search/search.module.js';

@Module({ imports: [OpportunityModule, CrmSearchModule], exports: [OpportunityModule, CrmSearchModule] })
export class CrmModule {}
