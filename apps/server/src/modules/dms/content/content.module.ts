import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { CollaborationModule } from '../collaboration/collaboration.module.js';
import { SearchModule } from '../search/search.module.js';
import { ContentController } from './content.controller.js';

@Module({
  imports: [SearchModule, AccessModule, CollaborationModule],
  controllers: [ContentController],
})
export class ContentModule {}
