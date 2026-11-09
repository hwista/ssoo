import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { AccessOperationsController } from './access-operations.controller.js';
import { AccessOperationsService } from './access-operations.service.js';
import { AccessFoundationService } from './access-foundation.service.js';
import { OrganizationOperationsController } from './organization-operations.controller.js';
import { OrganizationOperationsService } from './organization-operations.service.js';
import { CommonPermissionsController } from './common-permissions.controller.js';
import { CommonPermissionsService } from './common-permissions.service.js';
import { OperationHistoryController } from './operation-history.controller.js';
import { OperationHistoryService } from './operation-history.service.js';

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [AccessOperationsController, OrganizationOperationsController, CommonPermissionsController, OperationHistoryController],
  providers: [AccessFoundationService, AccessOperationsService, OrganizationOperationsService, CommonPermissionsService, OperationHistoryService],
  exports: [AccessFoundationService],
})
export class AccessFoundationModule {}
