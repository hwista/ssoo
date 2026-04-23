import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { AccessModule } from '../access/access.module.js';
import { TemplateConvertService } from './template-convert.service.js';
import { TemplateService } from './template.service.js';
import { TemplatesController } from './templates.controller.js';

@Module({
  imports: [DatabaseModule, AccessModule],
  controllers: [TemplatesController],
  providers: [TemplateService, TemplateConvertService],
})
export class TemplatesModule {}
