import { Module } from '@nestjs/common';
import { AccessFoundationModule } from '../../common/access/access-foundation.module.js';
import { DatabaseModule } from '../../../database/database.module.js';
import { AccessController } from './access.controller.js';
import { AccessService } from './access.service.js';
import { SnsFeatureGuard } from './sns-feature.guard.js';

@Module({
  imports: [DatabaseModule, AccessFoundationModule],
  controllers: [AccessController],
  providers: [AccessService, SnsFeatureGuard],
  exports: [AccessService, SnsFeatureGuard],
})
export class AccessModule {}
