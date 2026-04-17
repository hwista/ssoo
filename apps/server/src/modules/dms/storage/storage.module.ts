import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { StorageController } from './storage.controller.js';

@Module({
  imports: [AccessModule],
  controllers: [StorageController],
})
export class StorageModule {}
