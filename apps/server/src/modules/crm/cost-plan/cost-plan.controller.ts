import { Body, Controller, Delete, Get, Headers, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { success } from '../../../common/index.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CrmDomainFeatureGuard } from '../access/crm-domain-feature.guard.js';
import { RequireCrmDomainFeature } from '../access/require-crm-domain-feature.decorator.js';
import { CostPlanService } from './cost-plan.service.js';
import { CrmCostPlanAccountingPaymentExecutionDto, CrmCostPlanAccountingPaymentExecutionEvidenceDto, CrmCostPlanAccountingPaymentHandoffDto, CrmCostPlanAmsExternalMonthlyInputDto, CrmCostPlanAmsSourceExternalCostDto, CrmCostPlanAmsSourceVendorCreateDto, CrmCostPlanAmsSourceVendorWbsDto, CrmCostPlanAmsVendorWbsMappingDto, CrmCostPlanInternalMonthlyInputDto, CrmCostPlanInternalSourceGridDto, CrmCostPlanPreviewQueryDto } from './dto/cost-plan.dto.js';

@ApiTags('crm-cost-plan')
@ApiBearerAuth()
@Controller('crm/cost-plan')
@UseGuards(RolesGuard, CrmDomainFeatureGuard)
export class CostPlanController {
  constructor(private readonly costPlanService: CostPlanService) {}

  @Get('preview')
  @RequireCrmDomainFeature('canReadCostPlan')
  @ApiOperation({ summary: 'CRM 원가/AMS preview' })
  @ApiOkResponse({ description: '영업기회/계약 원가 라인과 확정 계약 외부원가 계획/실적 기반 읽기용 원가 후보' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 원가/AMS preview 조회 권한 없음' })
  async preview(@Query() query: CrmCostPlanPreviewQueryDto, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.costPlanService.getPreview(query, currentUser));
  }

  @Get('accounting-payment-preview')
  @RequireCrmDomainFeature('canReadCostPlan')
  @ApiOperation({ summary: 'CRM 원가 확정 row 회계·지급 handoff preview' })
  @ApiOkResponse({ description: '확정 내부원가와 AMS 정산 확정 row 기반 회계·지급 handoff 후보' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 원가/AMS handoff preview 조회 권한 없음' })
  async accountingPaymentPreview(@Query() query: CrmCostPlanPreviewQueryDto, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.costPlanService.getAccountingPaymentPreview(query, currentUser));
  }

  @Post('accounting-payment-handoff')
  @RequireCrmDomainFeature('canConfirmCostPlan')
  @ApiOperation({ summary: 'CRM 원가 확정 row 회계·지급 handoff snapshot 기록' })
  @ApiBody({ type: CrmCostPlanAccountingPaymentHandoffDto })
  @ApiOkResponse({ description: 'CRM 회계·지급 handoff snapshot 기록 결과' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 원가/AMS handoff 기록 권한 없음' })
  async createAccountingPaymentHandoff(
    @Body() body: CrmCostPlanAccountingPaymentHandoffDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.costPlanService.createAccountingPaymentHandoff(body, BigInt(currentUser.userId)));
  }

  @Post('accounting-payment-handoffs/:id/execute')
  @RequireCrmDomainFeature('canConfirmCostPlan')
  @ApiOperation({ summary: 'CRM 회계·지급 handoff 실행 evidence 생성' })
  @ApiBody({ type: CrmCostPlanAccountingPaymentExecutionDto })
  @ApiOkResponse({ description: '회계·지급 실행 evidence가 반영된 CRM handoff snapshot' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 원가/AMS handoff 실행 권한 없음' })
  async executeAccountingPayment(
    @Param('id') id: string,
    @Body() body: CrmCostPlanAccountingPaymentExecutionDto,
    @CurrentUser() currentUser: TokenPayload,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return success(await this.costPlanService.executeAccountingPayment(
      id,
      body,
      BigInt(currentUser.userId),
      { idempotencyKey },
    ));
  }

  @Post('accounting-payment-handoffs/:id/execution-evidence')
  @RequireCrmDomainFeature('canConfirmCostPlan')
  @ApiOperation({ summary: 'CRM 회계·지급 handoff 외부 실행 evidence 수신' })
  @ApiBody({ type: CrmCostPlanAccountingPaymentExecutionEvidenceDto })
  @ApiOkResponse({ description: '외부 회계·지급 실행 evidence가 반영된 CRM handoff snapshot' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 원가/AMS handoff 실행 evidence 기록 권한 없음' })
  async recordAccountingPaymentExecutionEvidence(
    @Param('id') id: string,
    @Body() body: CrmCostPlanAccountingPaymentExecutionEvidenceDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.costPlanService.recordAccountingPaymentExecutionEvidence(id, body, BigInt(currentUser.userId)));
  }

  @Post('internal-cost/monthly')
  @RequireCrmDomainFeature('canWriteCostPlan')
  @ApiOperation({ summary: 'CRM 내부원가 월별 계획/실적 입력 저장' })
  @ApiBody({ type: CrmCostPlanInternalMonthlyInputDto })
  @ApiOkResponse({ description: '저장된 내부원가 월별 계획/실적 입력' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 원가/AMS 저장 권한 없음' })
  async saveInternalMonthly(
    @Body() body: CrmCostPlanInternalMonthlyInputDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.costPlanService.saveInternalMonthlyInput(body, BigInt(currentUser.userId)));
  }

  @Post('internal-cost/source-grid')
  @RequireCrmDomainFeature('canWriteCostPlan')
  @ApiOperation({ summary: 'CRM 원본 호환 내부원가 5개 항목 계획/실적 저장' })
  @ApiBody({ type: CrmCostPlanInternalSourceGridDto })
  @ApiOkResponse({ description: '저장된 원본 호환 내부원가 5개 항목 그리드' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 원가/AMS 저장 권한 없음' })
  async saveInternalSourceGrid(
    @Body() body: CrmCostPlanInternalSourceGridDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.costPlanService.saveInternalSourceGrid(body, BigInt(currentUser.userId)));
  }

  @Post('internal-cost/monthly/:id/confirm')
  @RequireCrmDomainFeature('canConfirmCostPlan')
  @ApiOperation({ summary: 'CRM 내부원가 월별 입력 확정' })
  @ApiOkResponse({ description: '확정된 내부원가 월별 입력' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 원가/AMS 확정 권한 없음' })
  async confirmInternalMonthlyInput(
    @Param('id') id: string,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.costPlanService.confirmInternalMonthlyInput(id, BigInt(currentUser.userId)));
  }

  @Post('internal-cost/monthly/:id/reopen')
  @RequireCrmDomainFeature('canConfirmCostPlan')
  @ApiOperation({ summary: 'CRM 내부원가 월별 입력 확정 해제' })
  @ApiOkResponse({ description: '확정 해제된 내부원가 월별 입력' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 원가/AMS 확정 해제 권한 없음' })
  async reopenInternalMonthlyInput(
    @Param('id') id: string,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.costPlanService.reopenInternalMonthlyInput(id, BigInt(currentUser.userId)));
  }

  @Post('ams/source/vendors')
  @RequireCrmDomainFeature('canWriteCostPlan')
  @ApiOperation({ summary: 'CRM 원본 호환 AMS 공급업체 추가' })
  @ApiBody({ type: CrmCostPlanAmsSourceVendorCreateDto })
  async createAmsSourceVendor(
    @Body() body: CrmCostPlanAmsSourceVendorCreateDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.costPlanService.createAmsSourceVendor(body, BigInt(currentUser.userId)));
  }

  @Delete('ams/source/vendors/:id')
  @RequireCrmDomainFeature('canWriteCostPlan')
  @ApiOperation({ summary: 'CRM 원본 호환 AMS 공급업체와 연관 원가 삭제' })
  async deleteAmsSourceVendor(@Param('id') id: string, @Query('year') year: string, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.costPlanService.deleteAmsSourceVendor(id, Number(year), BigInt(currentUser.userId)));
  }

  @Put('ams/source/vendors/:id/wbs')
  @RequireCrmDomainFeature('canWriteCostPlan')
  @ApiOperation({ summary: 'CRM 원본 호환 AMS 공급업체 복수 WBS 매핑 전체 교체' })
  @ApiBody({ type: CrmCostPlanAmsSourceVendorWbsDto })
  async saveAmsSourceVendorWbs(
    @Param('id') id: string,
    @Body() body: CrmCostPlanAmsSourceVendorWbsDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.costPlanService.saveAmsSourceVendorWbs(id, body, BigInt(currentUser.userId)));
  }

  @Post('ams/source/external-cost')
  @RequireCrmDomainFeature('canWriteCostPlan')
  @ApiOperation({ summary: 'CRM 원본 호환 AMS 업체-WBS 연간 외부원가 저장' })
  @ApiBody({ type: CrmCostPlanAmsSourceExternalCostDto })
  async saveAmsSourceExternalCost(
    @Body() body: CrmCostPlanAmsSourceExternalCostDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.costPlanService.saveAmsSourceExternalCost(body, BigInt(currentUser.userId)));
  }

  @Post('ams/vendor-wbs')
  @RequireCrmDomainFeature('canWriteCostPlan')
  @ApiOperation({ summary: 'CRM AMS 업체-WBS 매핑 저장' })
  @ApiBody({ type: CrmCostPlanAmsVendorWbsMappingDto })
  @ApiOkResponse({ description: '저장된 AMS 업체-WBS 매핑' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 원가/AMS 저장 권한 없음' })
  async saveAmsVendorWbsMapping(
    @Body() body: CrmCostPlanAmsVendorWbsMappingDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.costPlanService.saveAmsVendorWbsMapping(body, BigInt(currentUser.userId)));
  }

  @Post('ams/external-cost/monthly')
  @RequireCrmDomainFeature('canWriteCostPlan')
  @ApiOperation({ summary: 'CRM AMS 외부원가 월별 계획/실적 입력 저장' })
  @ApiBody({ type: CrmCostPlanAmsExternalMonthlyInputDto })
  @ApiOkResponse({ description: '저장된 AMS 외부원가 월별 계획/실적 입력' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 원가/AMS 저장 권한 없음' })
  async saveAmsExternalMonthlyInput(
    @Body() body: CrmCostPlanAmsExternalMonthlyInputDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.costPlanService.saveAmsExternalMonthlyInput(body, BigInt(currentUser.userId)));
  }

  @Post('ams/external-cost/monthly/:id/confirm')
  @RequireCrmDomainFeature('canConfirmCostPlan')
  @ApiOperation({ summary: 'CRM AMS 외부원가 월별 입력 정산 확정' })
  @ApiOkResponse({ description: '정산 확정된 AMS 외부원가 월별 입력' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 원가/AMS 정산 확정 권한 없음' })
  async confirmAmsExternalMonthlyInput(
    @Param('id') id: string,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.costPlanService.confirmAmsExternalMonthlyInput(id, BigInt(currentUser.userId)));
  }

  @Post('ams/external-cost/monthly/:id/reopen')
  @RequireCrmDomainFeature('canConfirmCostPlan')
  @ApiOperation({ summary: 'CRM AMS 외부원가 월별 입력 정산 확정 해제' })
  @ApiOkResponse({ description: '정산 확정 해제된 AMS 외부원가 월별 입력' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 원가/AMS 정산 확정 해제 권한 없음' })
  async reopenAmsExternalMonthlyInput(
    @Param('id') id: string,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.costPlanService.reopenAmsExternalMonthlyInput(id, BigInt(currentUser.userId)));
  }
}
