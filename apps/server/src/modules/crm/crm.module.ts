import { Module } from '@nestjs/common';
import { OpportunityModule } from './opportunity/opportunity.module.js';

@Module({ imports: [OpportunityModule], exports: [OpportunityModule] })
export class CrmModule {}
