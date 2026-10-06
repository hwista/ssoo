import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { success } from '../../../common/index.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CrmDomainFeatureGuard } from '../access/crm-domain-feature.guard.js';
import { RequireCrmDomainFeature } from '../access/require-crm-domain-feature.decorator.js';
import { BusinessPlanService } from './business-plan.service.js';
import {
  CrmBusinessPlanCarryForwardDto,
  CrmBusinessPlanBulkRowsDto,
  CrmBusinessPlanCarryContractsDto,
  CrmBusinessPlanListQueryDto,
  CrmBusinessPlanMonthlyPlanInputDto,
  CrmBusinessPlanPerformanceActualInputDto,
  CrmBusinessPlanPerformanceQueryDto,
  CrmBusinessPlanPreviewQueryDto,
  CrmBusinessPlanRowUpsertDto,
  CrmBusinessPlanRowWbsUpdateDto,
  CrmBusinessPlanSnapshotDto,
} from './dto/business-plan.dto.js';

@ApiTags('crm-business-plan')
@ApiBearerAuth()
@Controller('crm/business-plan')
@UseGuards(RolesGuard, CrmDomainFeatureGuard)
export class BusinessPlanController {
  constructor(private readonly businessPlanService: BusinessPlanService) {}

  @Get('plans')
  @RequireCrmDomainFeature('canReadBusinessPlan')
  @ApiOperation({ summary: 'CRM 사업계획 차수 원장 목록' })
  @ApiOkResponse({ description: '저장된 사업계획 차수와 확정 상태' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 사업계획 조회 권한 없음' })
  async plans(@Query() query: CrmBusinessPlanListQueryDto, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.businessPlanService.listPlans(query, currentUser));
  }

  @Post('plans/snapshot')
  @RequireCrmDomainFeature('canWriteBusinessPlan')
  @ApiOperation({ summary: 'CRM 사업계획 preview를 차수 원장으로 저장' })
  @ApiBody({ type: CrmBusinessPlanSnapshotDto })
  @ApiOkResponse({ description: '저장된 사업계획 draft 차수' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 사업계획 저장 권한 없음' })
  async snapshot(@Body() body: CrmBusinessPlanSnapshotDto, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.businessPlanService.createPlanSnapshot(body, BigInt(currentUser.userId)));
  }

  @Post('plans/carry-forward')
  @RequireCrmDomainFeature('canWriteBusinessPlan')
  @ApiOperation({ summary: '전년도 확정 사업계획을 새 기준년도 draft 차수로 이월' })
  @ApiBody({ type: CrmBusinessPlanCarryForwardDto })
  @ApiOkResponse({ description: '전년 이월로 저장된 사업계획 draft 차수' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 사업계획 저장 권한 없음' })
  async carryForward(@Body() body: CrmBusinessPlanCarryForwardDto, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.businessPlanService.createCarryForwardSnapshot(body, BigInt(currentUser.userId)));
  }

  @Get('carry-contracts')
  @RequireCrmDomainFeature('canReadBusinessPlan')
  @ApiOperation({ summary: '전년부터 진행 중인 확정 계약의 사업계획 입력 후보' })
  @ApiOkResponse({ description: '청구계획 또는 진행률 기준 계약별 입력값 (미저장)' })
  async carryContracts(@Query() query: CrmBusinessPlanCarryContractsDto, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.businessPlanService.getCarryContracts(query, currentUser));
  }

  @Post('plans/:id/versions')
  @RequireCrmDomainFeature('canWriteBusinessPlan')
  @ApiOperation({ summary: '최신 CRM 사업계획을 다음 draft 차수로 복사' })
  @ApiOkResponse({ description: '복사 생성된 다음 사업계획 draft 차수' })
  async createVersion(@Param('id') id: string, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.businessPlanService.createPlanVersion(id, BigInt(currentUser.userId)));
  }

  @Post('plans/:id/rows')
  @RequireCrmDomainFeature('canWriteBusinessPlan')
  @ApiOperation({ summary: '최신 draft 사업계획 행 추가' })
  @ApiBody({ type: CrmBusinessPlanRowUpsertDto })
  @ApiOkResponse({ description: '행 추가가 반영된 사업계획 차수' })
  async createRow(
    @Param('id') id: string,
    @Body() body: CrmBusinessPlanRowUpsertDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.businessPlanService.createPlanRow(id, body, BigInt(currentUser.userId)));
  }

  @Put('plans/:id/rows')
  @RequireCrmDomainFeature('canWriteBusinessPlan')
  @ApiOperation({ summary: '최신 draft 사업계획 여러 행을 한 트랜잭션으로 저장' })
  @ApiBody({ type: CrmBusinessPlanBulkRowsDto })
  @ApiOkResponse({ description: '전체 행 저장이 반영된 사업계획 차수' })
  async saveRows(@Param('id') id: string, @Body() body: CrmBusinessPlanBulkRowsDto, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.businessPlanService.savePlanRows(id, body.rows, BigInt(currentUser.userId)));
  }

  @Put('plans/:id/rows/:rowCode')
  @RequireCrmDomainFeature('canWriteBusinessPlan')
  @ApiOperation({ summary: '최신 draft 사업계획 행 수정' })
  @ApiBody({ type: CrmBusinessPlanRowUpsertDto })
  @ApiOkResponse({ description: '행 수정이 반영된 사업계획 차수' })
  async updateRow(
    @Param('id') id: string,
    @Param('rowCode') rowCode: string,
    @Body() body: CrmBusinessPlanRowUpsertDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.businessPlanService.updatePlanRow(id, rowCode, body, BigInt(currentUser.userId)));
  }

  @Put('plans/:id/rows/:rowCode/wbs')
  @RequireCrmDomainFeature('canWriteBusinessPlan')
  @ApiOperation({ summary: 'CRM 사업계획 행 WBS 코드 수정. 확정·이전 차수에서도 허용' })
  @ApiBody({ type: CrmBusinessPlanRowWbsUpdateDto })
  @ApiOkResponse({ description: 'WBS 코드가 반영된 사업계획 차수' })
  async updateRowWbs(
    @Param('id') id: string,
    @Param('rowCode') rowCode: string,
    @Body() body: CrmBusinessPlanRowWbsUpdateDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.businessPlanService.updatePlanRowWbs(
      id,
      rowCode,
      body.wbsCode,
      BigInt(currentUser.userId),
    ));
  }

  @Delete('plans/:id/rows/:rowCode')
  @RequireCrmDomainFeature('canWriteBusinessPlan')
  @ApiOperation({ summary: '최신 draft 사업계획 행 삭제' })
  @ApiOkResponse({ description: '행 삭제가 반영된 사업계획 차수' })
  async deleteRow(
    @Param('id') id: string,
    @Param('rowCode') rowCode: string,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.businessPlanService.deletePlanRow(id, rowCode, BigInt(currentUser.userId)));
  }

  @Delete('plans/:id')
  @RequireCrmDomainFeature('canDeleteBusinessPlan')
  @ApiOperation({ summary: '관리자용 최신 미확정 CRM 사업계획 차수 삭제' })
  @ApiOkResponse({ description: '삭제된 차수와 이전 선택 후보' })
  async deletePlan(@Param('id') id: string, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.businessPlanService.deletePlan(id, BigInt(currentUser.userId)));
  }

  @Post('plans/:id/lines/:lineId/monthly-plan')
  @RequireCrmDomainFeature('canWriteBusinessPlan')
  @ApiOperation({ summary: 'CRM 사업계획 draft line 월별 계획 매출 직접 입력' })
  @ApiBody({ type: CrmBusinessPlanMonthlyPlanInputDto })
  @ApiOkResponse({ description: '월별 계획 입력이 반영된 사업계획 차수' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 사업계획 저장 권한 없음' })
  async updateMonthlyPlan(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @Body() body: CrmBusinessPlanMonthlyPlanInputDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.businessPlanService.updateMonthlyPlanLine(
      id,
      lineId,
      body,
      BigInt(currentUser.userId),
    ));
  }

  @Post('performance-actual/monthly')
  @RequireCrmDomainFeature('canWriteBusinessPlan')
  @ApiOperation({ summary: 'CRM 사업계획대비실적 월별 실적 직접 입력' })
  @ApiBody({ type: CrmBusinessPlanPerformanceActualInputDto })
  @ApiOkResponse({ description: '월별 실적 직접 입력이 반영된 조정 원장' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 사업계획대비실적 직접 입력 권한 없음' })
  async savePerformanceActual(
    @Body() body: CrmBusinessPlanPerformanceActualInputDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.businessPlanService.savePerformanceActualInput(
      body,
      BigInt(currentUser.userId),
    ));
  }

  @Post('plans/:id/confirm')
  @RequireCrmDomainFeature('canConfirmBusinessPlan')
  @ApiOperation({ summary: 'CRM 사업계획 차수 확정' })
  @ApiOkResponse({ description: '확정된 사업계획 차수' })
  async confirm(@Param('id') id: string, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.businessPlanService.confirmPlan(id, BigInt(currentUser.userId)));
  }

  @Post('plans/:id/reopen')
  @RequireCrmDomainFeature('canConfirmBusinessPlan')
  @ApiOperation({ summary: 'CRM 사업계획 차수 확정 해제' })
  @ApiOkResponse({ description: '확정 해제된 사업계획 차수' })
  async reopen(@Param('id') id: string, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.businessPlanService.reopenPlan(id, BigInt(currentUser.userId)));
  }

  @Get('preview')
  @RequireCrmDomainFeature('canReadBusinessPlan')
  @ApiOperation({ summary: 'CRM 사업계획 3개년 preview' })
  @ApiOkResponse({ description: '영업기회 pipeline과 확정 계약 청구계획/실적 기반 읽기용 사업계획 후보' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 사업계획 preview 조회 권한 없음' })
  async preview(@Query() query: CrmBusinessPlanPreviewQueryDto, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.businessPlanService.getPreview(query, currentUser));
  }

  @Get('performance-preview')
  @RequireCrmDomainFeature('canReadBusinessPlan')
  @ApiOperation({ summary: 'CRM 사업계획대비실적 월별 preview' })
  @ApiOkResponse({ description: '원천 호환 확정 사업계획 대 확정 계약 청구계획 또는 SSOO 확장 청구실적 기반 월별 사업계획대비실적' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 사업계획대비실적 preview 조회 권한 없음' })
  async performancePreview(@Query() query: CrmBusinessPlanPerformanceQueryDto, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.businessPlanService.getPerformancePreview(query, currentUser));
  }
}
