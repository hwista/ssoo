import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { SiteController } from './site.controller.js';
import { SiteService } from './site.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [SiteController],
  providers: [SiteService],
  exports: [SiteService],
})
export class SiteModule {}
