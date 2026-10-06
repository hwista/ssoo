import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { CommonAiIndexModule } from '../../common/ai-index/ai-index.module.js';
import { UserModule } from '../../common/user/user.module.js';
import { CodeModule } from '../../common/code/code.module.js';
import { FileModule } from '../../dms/file/file.module.js';
import { DmsCrmQuoteLifecycleModule } from '../../dms/crm-quote-lifecycle/crm-quote-lifecycle.module.js';
import { DmsCrmOpportunityContractLifecycleModule } from '../../dms/crm-opportunity-contract-lifecycle/crm-opportunity-contract-lifecycle.module.js';
import { TemplatesModule } from '../../dms/templates/templates.module.js';
import { CrmAccessModule } from '../access/access.module.js';
import { ContractModule } from '../contract/contract.module.js';
import { QuoteSettingsModule } from '../quote-settings/quote-settings.module.js';
import { CrmOperationAttemptModule } from '../operations/operation-attempt.module.js';
import { OpportunityController } from './opportunity.controller.js';
import { OpportunityService } from './opportunity.service.js';

@Module({
  imports: [DatabaseModule, CommonAiIndexModule, UserModule, CodeModule, FileModule, TemplatesModule, DmsCrmQuoteLifecycleModule, DmsCrmOpportunityContractLifecycleModule, CrmAccessModule, ContractModule, QuoteSettingsModule, CrmOperationAttemptModule],
  controllers: [OpportunityController],
  providers: [OpportunityService],
  exports: [OpportunityService],
})
export class OpportunityModule {}
