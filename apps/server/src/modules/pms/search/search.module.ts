import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { CommonSearchModule } from '../../common/search/search.module.js';
import { PmsCommonSearchProvider } from './pms-common-search.provider.js';

@Module({
  imports: [DatabaseModule, CommonSearchModule],
  providers: [PmsCommonSearchProvider],
})
export class PmsSearchModule {}
