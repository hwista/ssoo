import { Module } from '@nestjs/common';
import { CrmAccessModule } from '../../crm/access/access.module.js';
import { DatabaseModule } from '../../../database/database.module.js';
import { AccessModule } from '../access/access.module.js';
import { FileModule } from '../file/file.module.js';
import { storageAdapterService } from '../storage/storage-adapter.service.js';
import { TemplatesModule } from '../templates/templates.module.js';
import { DmsCrmContractLifecycleController } from './crm-contract-lifecycle.controller.js';
import {
  DMS_CRM_CONTRACT_LIFECYCLE_STORAGE,
  DmsCrmContractLifecycleService,
} from './crm-contract-lifecycle.service.js';

@Module({
  imports: [AccessModule, DatabaseModule, FileModule, TemplatesModule, CrmAccessModule],
  controllers: [DmsCrmContractLifecycleController],
  providers: [
    DmsCrmContractLifecycleService,
    {
      provide: DMS_CRM_CONTRACT_LIFECYCLE_STORAGE,
      useValue: storageAdapterService,
    },
  ],
  exports: [DmsCrmContractLifecycleService],
})
export class DmsCrmContractLifecycleModule {}
