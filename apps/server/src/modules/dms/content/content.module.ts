import { Module } from '@nestjs/common';
import { SearchModule } from '../search/search.module.js';
import { ContentController } from './content.controller.js';

@Module({
  imports: [SearchModule],
  controllers: [ContentController],
})
export class ContentModule {}
