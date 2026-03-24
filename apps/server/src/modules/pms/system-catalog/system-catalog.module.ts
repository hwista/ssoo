import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { SystemCatalogController } from './system-catalog.controller.js';
import { SystemCatalogService } from './system-catalog.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [SystemCatalogController],
  providers: [SystemCatalogService],
  exports: [SystemCatalogService],
})
export class SystemCatalogModule {}
