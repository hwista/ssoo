import { ContractApprovalController } from './contract-approval.controller.js';
import { ContractApprovalService } from './contract-approval.service.js';
import { AccessModule as DmsAccessModule } from '../../dms/access/access.module.js';
import { AccessFoundationModule } from '../../common/access/access-foundation.module.js';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { DmsCrmContractLifecycleModule } from '../../dms/crm-contract-lifecycle/crm-contract-lifecycle.module.js';
import { FileModule } from '../../dms/file/file.module.js';
import { TemplatesModule } from '../../dms/templates/templates.module.js';
import { CrmAccessModule } from '../access/access.module.js';
import { QuoteSettingsModule } from '../quote-settings/quote-settings.module.js';
import { CrmOperationAttemptModule } from '../operations/operation-attempt.module.js';
import { ContractController } from './contract.controller.js';
import { ContractService } from './contract.service.js';

@Module({
  imports: [DmsAccessModule, AccessFoundationModule, DatabaseModule, CrmAccessModule, QuoteSettingsModule, FileModule, TemplatesModule, DmsCrmContractLifecycleModule, CrmOperationAttemptModule],
  controllers: [ContractController, ContractApprovalController],
  providers: [ContractService, ContractApprovalService],
  exports: [ContractService],
})
export class ContractModule {}
