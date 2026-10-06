import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { success } from '../../../common/index.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CrmDomainFeatureGuard } from '../access/crm-domain-feature.guard.js';
import { RequireCrmDomainFeature } from '../access/require-crm-domain-feature.decorator.js';
import { CrmReportsConfirmDto, CrmReportsPreviewQueryDto } from './dto/reports.dto.js';
import { ReportsService } from './reports.service.js';

@ApiTags('crm-reports')
@ApiBearerAuth()
@Controller('crm/reports')
@UseGuards(RolesGuard, CrmDomainFeatureGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('preview')
  @RequireCrmDomainFeature('canReadReport')
  @ApiOperation({ summary: 'CRM 보고 지표 Preview' })
  @ApiOkResponse({ description: '사업구분/담당자/WBS별 pipeline과 계약 계획/실적 요약' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 보고 조회 권한 없음' })
  async preview(@Query() query: CrmReportsPreviewQueryDto, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.reportsService.getPreview(query, currentUser));
  }

  @Post('confirm')
  @RequireCrmDomainFeature('canConfirmReport')
  @ApiOperation({ summary: 'CRM 보고 Preview snapshot 확정' })
  @ApiBody({ type: CrmReportsConfirmDto })
  @ApiOkResponse({ description: '확정된 CRM 보고 snapshot' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 보고 확정 권한 없음' })
  async confirm(@Body() body: CrmReportsConfirmDto, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.reportsService.confirmReport(body, BigInt(currentUser.userId)));
  }

  @Post('confirmations/:id/reopen')
  @RequireCrmDomainFeature('canConfirmReport')
  @ApiOperation({ summary: 'CRM 보고 snapshot 확정 해제' })
  @ApiOkResponse({ description: '확정 해제된 CRM 보고 snapshot' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 보고 확정 해제 권한 없음' })
  async reopen(@Param('id') id: string, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.reportsService.reopenReportConfirmation(id, BigInt(currentUser.userId)));
  }
}
