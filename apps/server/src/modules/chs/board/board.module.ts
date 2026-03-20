import { Module } from '@nestjs/common';
import { BoardController } from './board.controller.js';
import { BoardService } from './board.service.js';
import { DatabaseModule } from '../../../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [BoardController],
  providers: [BoardService],
  exports: [BoardService],
})
export class BoardModule {}
