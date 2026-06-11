import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { AccessFoundationModule } from '../../common/access/access-foundation.module.js';
import { ProjectModule } from '../project/project.module.js';
import { HomeController } from './home.controller.js';
import { HomeService } from './home.service.js';

@Module({
  imports: [DatabaseModule, AccessFoundationModule, ProjectModule],
  controllers: [HomeController],
  providers: [HomeService],
  exports: [HomeService],
})
export class HomeModule {}
