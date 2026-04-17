import { Module } from '@nestjs/common';
import { MemberController } from './member.controller.js';
import { MemberService } from './member.service.js';
import { DatabaseModule } from '../../../database/database.module.js';
import { ProjectModule } from '../project/project.module.js';

@Module({
  imports: [DatabaseModule, ProjectModule],
  controllers: [MemberController],
  providers: [MemberService],
  exports: [MemberService],
})
export class MemberModule {}
