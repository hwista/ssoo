import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { SearchModule } from '../search/search.module.js';
import { AskController } from './ask.controller.js';
import { AskService } from './ask.service.js';

@Module({
  imports: [SearchModule, AccessModule],
  controllers: [AskController],
  providers: [AskService],
})
export class AskModule {}
