import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { CreateController } from './create.controller.js';
import { CreateService } from './create.service.js';

@Module({
  imports: [AccessModule],
  controllers: [CreateController],
  providers: [CreateService],
})
export class CreateModule {}
