import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { FilesController } from './files.controller.js';

@Module({
  imports: [AccessModule],
  controllers: [FilesController],
})
export class FilesModule {}
