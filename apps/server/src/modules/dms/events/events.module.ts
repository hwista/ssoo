import { Module } from '@nestjs/common';
import { DmsEventsGateway } from './dms-events.gateway.js';

@Module({
  providers: [DmsEventsGateway],
  exports: [DmsEventsGateway],
})
export class EventsModule {}
