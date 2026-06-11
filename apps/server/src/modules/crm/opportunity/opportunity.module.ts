import { Module } from '@nestjs/common';
import { OpportunityController } from './opportunity.controller.js';
import { OpportunityService } from './opportunity.service.js';

@Module({ controllers: [OpportunityController], providers: [OpportunityService], exports: [OpportunityService] })
export class OpportunityModule {}
