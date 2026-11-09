import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../../database/database.module.js';
import { IntegrationSettingsService } from './integration-settings.service.js';

@Module({ imports: [DatabaseModule, ConfigModule], providers: [IntegrationSettingsService], exports: [IntegrationSettingsService] })
export class IntegrationSettingsModule {}
