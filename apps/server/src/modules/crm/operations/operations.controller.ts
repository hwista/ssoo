import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { success } from '../../../common/index.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CrmAccessService } from '../access/access.service.js';
import { CrmOperationsFeatureGuard } from '../access/crm-operations-feature.guard.js';
import { CrmOpportunityFeatureGuard } from '../access/crm-opportunity-feature.guard.js';
import { RequireCrmOperationsFeature } from '../access/require-crm-operations-feature.decorator.js';
import { RequireCrmOpportunityFeature } from '../access/require-crm-opportunity-feature.decorator.js';
import { CrmDataQualityService } from './data-quality.service.js';
import { CrmOperationAttemptListQueryDto } from './dto/attempts.dto.js';
import { CrmOperationsPreviewQueryDto } from './dto/operations.dto.js';
import { OperationsService } from './operations.service.js';
import { CrmOperationAttemptService } from './operation-attempt.service.js';
import { CrmOperationRetryService } from './operation-retry.service.js';
import { CrmLaunchReadinessService } from './launch-readiness.service.js';
import { CrmReadinessService } from './readiness.service.js';
import { CrmSettingsService } from './settings.service.js';

@ApiTags('crm-operations')
@ApiBearerAuth()
@Controller('crm/operations')
@UseGuards(RolesGuard, CrmOpportunityFeatureGuard, CrmOperationsFeatureGuard)
export class OperationsController {
  constructor(
    private readonly operationsService: OperationsService,
    private readonly accessService: CrmAccessService,
    private readonly settingsService: CrmSettingsService,
    private readonly readinessService: CrmReadinessService,
    private readonly launchReadinessService: CrmLaunchReadinessService,
    private readonly dataQualityService: CrmDataQualityService,
    private readonly attemptService: CrmOperationAttemptService,
    private readonly retryService: CrmOperationRetryService,
  ) {}

  @Get('preview')
  @RequireCrmOpportunityFeature('canViewOpportunity')
  @ApiOperation({ summary: 'CRM 운영 기준 preview' })
  @ApiOkResponse({ description: '원천 데모 시스템 관리 항목을 SSOO 공용 Admin/Auth/DMS 경계로 재해석한 읽기용 preview' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 운영 기준 preview 조회 권한 없음' })
  async preview(@Query() query: CrmOperationsPreviewQueryDto, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.operationsService.getPreview(query, currentUser));
  }

  @Get('access')
  @ApiOperation({ summary: 'CRM 운영 권한 snapshot' })
  async access(@CurrentUser() currentUser: TokenPayload) {
    return success(await this.accessService.getOperationsAccess(currentUser));
  }

  @Get('overview')
  @RequireCrmOperationsFeature('canReadOperations')
  @ApiOperation({ summary: 'CRM 런칭 운영 overview' })
  async overview(
    @CurrentUser() currentUser: TokenPayload,
    @Query() query: CrmOperationsPreviewQueryDto,
  ) {
    const [access, preview, settings, readiness, dataQuality] = await Promise.all([
      this.accessService.getOperationsAccess(currentUser),
      this.operationsService.getPreview(query, currentUser),
      this.settingsService.getDefault(),
      this.readinessService.getReadiness(),
      this.dataQualityService.getReport(currentUser),
    ]);
    return success({ access, preview, settings, readiness, dataQuality });
  }

  @Get('readiness')
  @RequireCrmOperationsFeature('canReadOperations')
  @ApiOperation({ summary: 'CRM live launch readiness' })
  async readiness() {
    return success(await this.readinessService.getReadiness());
  }

  @Get('launch-readiness')
  @RequireCrmOperationsFeature('canReadOperations')
  @ApiOperation({ summary: 'CRM owner launch readiness snapshot' })
  async launchReadiness(@CurrentUser() currentUser: TokenPayload) {
    return success(await this.launchReadinessService.getSnapshot(currentUser));
  }

  @Get('data-quality')
  @RequireCrmOperationsFeature('canReadOperations')
  @ApiOperation({ summary: 'CRM 원장 데이터 품질 진단' })
  async dataQuality(@CurrentUser() currentUser: TokenPayload) {
    return success(await this.dataQualityService.getReport(currentUser));
  }

  @Get('attempts')
  @RequireCrmOperationsFeature('canReadOperations')
  @ApiOperation({ summary: 'CRM 운영 attempt 원장 조회' })
  async attempts(@Query() query: CrmOperationAttemptListQueryDto, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.attemptService.list(query, currentUser));
  }

  @Get('attempts/:id')
  @RequireCrmOperationsFeature('canReadOperations')
  @ApiOperation({ summary: 'CRM 운영 attempt 상세 조회' })
  async attempt(@Param('id') id: string, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.attemptService.get(id, currentUser));
  }

  @Post('attempts/:id/retry')
  @RequireCrmOperationsFeature('canExecuteOperations')
  @ApiOperation({ summary: '실패한 CRM 운영 attempt 안전 재시도' })
  async retryAttempt(
    @Param('id') id: string,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const result = await this.retryService.retry(id, currentUser);
    this.launchReadinessService.invalidate();
    return success(result);
  }
}
