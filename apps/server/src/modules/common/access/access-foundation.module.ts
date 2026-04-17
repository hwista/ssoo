import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { AccessOperationsController } from './access-operations.controller.js';
import { AccessOperationsService } from './access-operations.service.js';
import { AccessFoundationService } from './access-foundation.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [AccessOperationsController],
  providers: [AccessFoundationService, AccessOperationsService],
  exports: [AccessFoundationService],
})
export class AccessFoundationModule {}
