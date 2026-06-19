import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { CommonSearchModule } from '../../common/search/search.module.js';
import { SnsCommonSearchProvider } from './sns-common-search.provider.js';

@Module({
  imports: [DatabaseModule, CommonSearchModule],
  providers: [SnsCommonSearchProvider],
})
export class SnsSearchModule {}
