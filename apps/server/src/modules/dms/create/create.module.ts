import { Module } from '@nestjs/common';
import { CreateController } from './create.controller.js';
import { CreateService } from './create.service.js';

@Module({
  controllers: [CreateController],
  providers: [CreateService],
})
export class CreateModule {}
