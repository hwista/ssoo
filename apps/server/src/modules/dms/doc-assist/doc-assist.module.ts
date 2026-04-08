import { Module } from '@nestjs/common';
import { DocAssistController } from './doc-assist.controller.js';

@Module({
  controllers: [DocAssistController],
})
export class DocAssistModule {}
