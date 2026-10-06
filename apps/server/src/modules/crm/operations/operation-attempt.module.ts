import { Module } from '@nestjs/common';
import { CrmAccessModule } from '../access/access.module.js';
import { DatabaseModule } from '../../../database/database.module.js';
import { CrmOperationAttemptService } from './operation-attempt.service.js';

@Module({
  imports: [DatabaseModule, CrmAccessModule],
  providers: [CrmOperationAttemptService],
  exports: [CrmOperationAttemptService],
})
export class CrmOperationAttemptModule {}
