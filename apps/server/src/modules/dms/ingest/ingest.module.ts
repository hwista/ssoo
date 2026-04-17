import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { IngestController } from './ingest.controller.js';

@Module({
  imports: [AccessModule],
  controllers: [IngestController],
})
export class IngestModule {}
