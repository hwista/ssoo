import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { DocAssistController } from './doc-assist.controller.js';

@Module({
  imports: [AccessModule],
  controllers: [DocAssistController],
})
export class DocAssistModule {}
