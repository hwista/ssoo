import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { SystemInstanceController } from './system-instance.controller.js';
import { SystemInstanceService } from './system-instance.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [SystemInstanceController],
  providers: [SystemInstanceService],
  exports: [SystemInstanceService],
})
export class SystemInstanceModule {}
