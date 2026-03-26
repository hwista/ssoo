import { Module } from '@nestjs/common';
import { CodeController } from './code.controller.js';
import { CodeService } from './code.service.js';
import { DatabaseModule } from '../../../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [CodeController],
  providers: [CodeService],
  exports: [CodeService],
})
export class CodeModule {}
