import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module.js';
import { GitController } from './git.controller.js';

@Module({
  imports: [AccessModule],
  controllers: [GitController],
})
export class GitModule {}
