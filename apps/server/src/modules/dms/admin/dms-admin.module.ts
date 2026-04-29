import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { DmsAdminController } from './dms-admin.controller.js';
import { DmsAdminService } from './dms-admin.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [DmsAdminController],
  providers: [DmsAdminService],
})
export class DmsAdminModule {}
