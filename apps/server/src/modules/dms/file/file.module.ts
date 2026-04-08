import { Module } from '@nestjs/common';
import { SearchModule } from '../search/search.module.js';
import { FileController } from './file.controller.js';

@Module({
  imports: [SearchModule],
  controllers: [FileController],
})
export class FileModule {}
