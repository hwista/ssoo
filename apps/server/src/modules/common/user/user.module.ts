import { Module } from '@nestjs/common';
import { AccessFoundationModule } from '../access/access-foundation.module.js';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { DatabaseModule } from '../../../database/database.module.js';

@Module({
  imports: [AccessFoundationModule, DatabaseModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
