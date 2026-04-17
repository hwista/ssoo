import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { SettingsController } from './settings.controller.js';

@Module({
  imports: [AccessModule],
  controllers: [SettingsController],
})
export class SettingsModule {}
