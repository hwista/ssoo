import { Module } from '@nestjs/common';
import { CommonAiIndexModule } from '../../common/ai-index/ai-index.module.js';
import { AccessModule } from '../access/access.module.js';
import { SearchModule } from '../search/search.module.js';
import { AskController } from './ask.controller.js';
import { AskService } from './ask.service.js';

@Module({
  imports: [SearchModule, AccessModule, CommonAiIndexModule],
  controllers: [AskController],
  providers: [AskService],
})
export class AskModule {}
