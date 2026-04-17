import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { TemplatesController } from './templates.controller.js';

@Module({
  imports: [AccessModule],
  controllers: [TemplatesController],
})
export class TemplatesModule {}
