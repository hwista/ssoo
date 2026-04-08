import { Module } from '@nestjs/common';
import { GitController } from './git.controller.js';

@Module({
  controllers: [GitController],
})
export class GitModule {}
