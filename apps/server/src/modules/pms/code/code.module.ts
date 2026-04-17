import { Module } from '@nestjs/common';
import { AccessFoundationModule } from '../../common/access/access-foundation.module.js';
import { CodeController } from './code.controller.js';
import { CodeService } from './code.service.js';
import { DatabaseModule } from '../../../database/database.module.js';

@Module({
  imports: [AccessFoundationModule, DatabaseModule],
  controllers: [CodeController],
  providers: [CodeService],
  exports: [CodeService],
})
export class CodeModule {}
