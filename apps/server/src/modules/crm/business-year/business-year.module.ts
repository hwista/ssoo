import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { CrmAccessModule } from '../access/access.module.js';
import { BusinessYearController } from './business-year.controller.js';
import { BusinessYearService } from './business-year.service.js';

@Module({
  imports: [DatabaseModule, CrmAccessModule],
  controllers: [BusinessYearController],
  providers: [BusinessYearService],
  exports: [BusinessYearService],
})
export class BusinessYearModule {}
