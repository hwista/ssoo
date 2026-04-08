import { Module } from '@nestjs/common';
import { SearchModule } from '../search/search.module.js';
import { AskController } from './ask.controller.js';
import { AskService } from './ask.service.js';

@Module({
  imports: [SearchModule],
  controllers: [AskController],
  providers: [AskService],
})
export class AskModule {}
