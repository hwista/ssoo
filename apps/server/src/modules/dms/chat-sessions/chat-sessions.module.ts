import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { ChatSessionsController } from './chat-sessions.controller.js';
import { ChatSessionsService } from './chat-sessions.service.js';

@Module({
  imports: [AccessModule],
  controllers: [ChatSessionsController],
  providers: [ChatSessionsService],
  exports: [ChatSessionsService],
})
export class ChatSessionsModule {}
