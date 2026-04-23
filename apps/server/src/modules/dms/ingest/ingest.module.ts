import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { IngestController } from './ingest.controller.js';
import { IngestQueueService } from './ingest-queue.service.js';

@Module({
  imports: [AccessModule],
  controllers: [IngestController],
  providers: [IngestQueueService],
})
export class IngestModule {}
