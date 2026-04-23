import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { CollaborationModule } from '../collaboration/collaboration.module.js';
import { StorageController } from './storage.controller.js';

@Module({
  imports: [AccessModule, CollaborationModule],
  controllers: [StorageController],
})
export class StorageModule {}
