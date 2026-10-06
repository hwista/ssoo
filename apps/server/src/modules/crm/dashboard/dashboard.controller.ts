import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { success } from '../../../common/index.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { CrmOpportunityFeatureGuard } from '../access/crm-opportunity-feature.guard.js';
import { RequireCrmOpportunityFeature } from '../access/require-crm-opportunity-feature.decorator.js';
import { DashboardService } from './dashboard.service.js';

@ApiTags('crm-dashboard')
@ApiBearerAuth()
@Controller('crm/dashboard')
@UseGuards(RolesGuard, CrmOpportunityFeatureGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @RequireCrmOpportunityFeature('canViewOpportunity')
  @ApiOperation({ summary: 'CRM 홈 업무 요약' })
  @ApiOkResponse({ description: '영업기회, 계약, PMS/DMS 읽기용 준비 상태 요약' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 홈 조회 권한 없음' })
  async dashboard(@CurrentUser() currentUser: TokenPayload) {
    return success(await this.dashboardService.getDashboard(currentUser));
  }
}
