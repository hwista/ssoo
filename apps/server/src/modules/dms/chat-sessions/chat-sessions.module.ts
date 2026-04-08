import { Module } from '@nestjs/common';
import { ChatSessionsController } from './chat-sessions.controller.js';
import { ChatSessionsService } from './chat-sessions.service.js';

@Module({
  controllers: [ChatSessionsController],
  providers: [ChatSessionsService],
  exports: [ChatSessionsService],
})
export class ChatSessionsModule {}
