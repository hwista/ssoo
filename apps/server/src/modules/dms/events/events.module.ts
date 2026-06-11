import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { DmsEventsGateway } from './dms-events.gateway.js';

@Module({
  imports: [AccessModule],
  providers: [DmsEventsGateway],
  exports: [DmsEventsGateway],
})
export class EventsModule {}
