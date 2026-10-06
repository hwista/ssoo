import { Module } from '@nestjs/common';
import { BusinessYearModule } from './business-year/business-year.module.js';
import { BusinessPlanModule } from './business-plan/business-plan.module.js';
import { ContractModule } from './contract/contract.module.js';
import { CostPlanModule } from './cost-plan/cost-plan.module.js';
import { CustomerModule } from './customer/customer.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { OperationsModule } from './operations/operations.module.js';
import { OpportunityModule } from './opportunity/opportunity.module.js';
import { QuoteSettingsModule } from './quote-settings/quote-settings.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { CrmSearchModule } from './search/search.module.js';

@Module({
  imports: [BusinessYearModule, OpportunityModule, ContractModule, CustomerModule, QuoteSettingsModule, CrmSearchModule, DashboardModule, BusinessPlanModule, CostPlanModule, OperationsModule, ReportsModule],
  exports: [BusinessYearModule, OpportunityModule, ContractModule, CustomerModule, QuoteSettingsModule, CrmSearchModule, DashboardModule, BusinessPlanModule, CostPlanModule, OperationsModule, ReportsModule],
})
export class CrmModule {}
