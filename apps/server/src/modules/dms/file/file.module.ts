import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { CollaborationModule } from '../collaboration/collaboration.module.js';
import { SearchModule } from '../search/search.module.js';
import { FileController } from './file.controller.js';
import { FileCrudService } from './file-crud.service.js';

@Module({
  imports: [SearchModule, AccessModule, CollaborationModule],
  controllers: [FileController],
  providers: [FileCrudService],
})
export class FileModule {}
