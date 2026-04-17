import { Module } from '@nestjs/common';
import { UserModule } from '../../common/user/user.module.js';
import { AccessModule } from '../access/access.module.js';
import { CollaborationController } from './collaboration.controller.js';
import { CollaborationService } from './collaboration.service.js';

@Module({
  imports: [AccessModule, UserModule],
  controllers: [CollaborationController],
  providers: [CollaborationService],
  exports: [CollaborationService],
})
export class CollaborationModule {}
