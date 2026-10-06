import { Body, Controller, Delete, Get, Headers, Param, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { CrmContractListQuery } from '@ssoo/types/crm';
import type { Response as ExpressResponse } from 'express';
import { success } from '../../../common/index.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { formatContentDisposition } from '../../dms/file/file.constants.js';
import { CrmDomainFeatureGuard } from '../access/crm-domain-feature.guard.js';
import { RequireCrmDomainFeature } from '../access/require-crm-domain-feature.decorator.js';
import { ContractService } from './contract.service.js';
import {
  CrmBillingSplitPreviewDto,
  CrmContractBillingActualUpsertDto,
  CrmContractDmsDocumentDraftDto,
  CrmContractDmsDocumentExecutionEvidenceDto,
  CrmContractDmsDocumentLifecycleExecutionDto,
  CrmContractPerformanceQueryDto,
  CrmContractUpsertDto,
} from './dto/contract.dto.js';

@ApiTags('crm-contracts')
@ApiBearerAuth()
@Controller('crm/contracts')
@UseGuards(RolesGuard, CrmDomainFeatureGuard)
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Get()
  @RequireCrmDomainFeature('canReadContract')
  @ApiOperation({ summary: 'CRM 계약 현황 목록' })
  @ApiQuery({ name: 'view', required: false, enum: ['source-list'], description: '원천 계약현황의 검색·원값 금액·정렬 기준' })
  @ApiQuery({ name: 'sort', required: false, enum: ['updated-desc', 'created-desc', 'customer-asc', 'revenue-desc', 'margin-desc', 'start-asc'] })
  @ApiOkResponse({ description: 'CRM 계약 목록과 요약' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 계약 조회 권한 없음' })
  async list(@Query() query: CrmContractListQuery, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.contractService.listResponse(query, currentUser));
  }

  @Post('billing-split-preview')
  @RequireCrmDomainFeature('canReadContract')
  @ApiOperation({ summary: 'CRM 계약 청구계획 자동 분할 미리보기' })
  @ApiBody({ type: CrmBillingSplitPreviewDto })
  @ApiOkResponse({ description: '계약 기간과 총액 기준 청구계획 분할 후보' })
  async billingSplitPreview(@Body() body: CrmBillingSplitPreviewDto) {
    return success(this.contractService.previewBillingSplit(body));
  }

  @Post()
  @RequireCrmDomainFeature('canWriteContract')
  @ApiOperation({ summary: 'CRM 계약 생성' })
  @ApiBody({ type: CrmContractUpsertDto })
  @ApiOkResponse({ description: '생성된 CRM 계약' })
  async create(@Body() body: CrmContractUpsertDto, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.contractService.createContract(body, BigInt(currentUser.userId)));
  }

  @Get('monthly-performance')
  @RequireCrmDomainFeature('canReadContract')
  @ApiOperation({ summary: 'CRM 계약대비실적 월별 조회' })
  @ApiOkResponse({ description: '확정 계약 기준 월별 청구계획/실적/차이' })
  async monthlyPerformance(@Query() query: CrmContractPerformanceQueryDto, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.contractService.getMonthlyPerformance(query, currentUser));
  }

  @Get(':id/billing-actual')
  @RequireCrmDomainFeature('canReadContract')
  @ApiOperation({ summary: 'CRM 계약 청구실적 조회' })
  @ApiOkResponse({ description: '계약 청구계획 대비 실적' })
  async billingActual(@Param('id') id: string) {
    return success(await this.contractService.getBillingActual(id));
  }

  @Put(':id/billing-actual')
  @RequireCrmDomainFeature('canWriteContract')
  @ApiOperation({ summary: 'CRM 계약 청구실적 저장' })
  @ApiBody({ type: CrmContractBillingActualUpsertDto })
  @ApiOkResponse({ description: '저장된 계약 청구실적' })
  async updateBillingActual(
    @Param('id') id: string,
    @Body() body: CrmContractBillingActualUpsertDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.contractService.replaceBillingActual(id, body, BigInt(currentUser.userId)));
  }

  @Get(':id/pms-handoff-preview')
  @RequireCrmDomainFeature('canReadContract')
  @ApiOperation({ summary: 'CRM 계약 기반 PMS 인계 후보 미리보기' })
  @ApiOkResponse({ description: 'PMS 실행 프로젝트 생성을 수행하지 않는 읽기용 계약 스냅샷' })
  async pmsHandoffPreview(@Param('id') id: string) {
    return success(await this.contractService.getPmsHandoffPreview(id));
  }

  @Get(':id/dms-document-preview')
  @RequireCrmDomainFeature('canReadContract')
  @ApiOperation({ summary: 'CRM 계약 기반 DMS 계약서 문서 패킷 미리보기' })
  @ApiOkResponse({ description: 'DMS 저장 전 계약서 입력 패킷' })
  async dmsDocumentPreview(@Param('id') id: string) {
    return success(await this.contractService.getDmsDocumentPreview(id));
  }

  @Post(':id/dms-document-draft')
  @RequireCrmDomainFeature('canWriteContract')
  @ApiOperation({ summary: 'CRM 계약 DMS markdown 초안 저장' })
  @ApiBody({ type: CrmContractDmsDocumentDraftDto })
  @ApiOkResponse({ description: 'DMS markdown 초안 저장 결과' })
  async createDmsDocumentDraft(
    @Param('id') id: string,
    @Body() body: CrmContractDmsDocumentDraftDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.contractService.createDmsDocumentDraft(id, body, currentUser));
  }

  @Post(':id/dms-document-execution-evidence')
  @RequireCrmDomainFeature('canWriteContract')
  @ApiOperation({ summary: 'CRM 계약 DMS lifecycle 실행 evidence 기록' })
  @ApiBody({ type: CrmContractDmsDocumentExecutionEvidenceDto })
  @ApiOkResponse({ description: 'DMS 실행 evidence가 반영된 계약 문서 handoff snapshot' })
  async recordDmsDocumentExecutionEvidence(
    @Param('id') id: string,
    @Body() body: CrmContractDmsDocumentExecutionEvidenceDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.contractService.recordDmsDocumentExecutionEvidence(id, body, currentUser));
  }

  @Post(':id/dms-document-lifecycle-execution')
  @RequireCrmDomainFeature('canWriteContract')
  @ApiOperation({ summary: 'CRM 계약 handoff 기반 DMS lifecycle artifact 실행' })
  @ApiBody({ type: CrmContractDmsDocumentLifecycleExecutionDto })
  @ApiOkResponse({ description: 'DMS artifact 생성과 CRM evidence snapshot 반영 결과' })
  async executeDmsDocumentLifecycle(
    @Param('id') id: string,
    @Body() body: CrmContractDmsDocumentLifecycleExecutionDto,
    @CurrentUser() currentUser: TokenPayload,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return success(await this.contractService.executeDmsDocumentLifecycle(
      id,
      body,
      currentUser,
      { idempotencyKey },
    ));
  }

  @Get(':id/dms-document-artifacts/:kind')
  @RequireCrmDomainFeature('canReadContract')
  @ApiOperation({ summary: '완료된 CRM 계약 DMS DOCX/PDF 산출물 다운로드' })
  async downloadDmsDocumentArtifact(
    @Param('id') id: string,
    @Param('kind') kind: string,
    @Res() response: ExpressResponse,
  ) {
    const artifact = await this.contractService.readDmsDocumentArtifact(id, kind);
    response.setHeader('Content-Type', artifact.contentType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Length', String(artifact.buffer.length));
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Content-Disposition', formatContentDisposition('attachment', artifact.fileName));
    response.status(200).send(artifact.buffer);
  }

  @Get(':id')
  @RequireCrmDomainFeature('canReadContract')
  @ApiOperation({ summary: 'CRM 계약 상세' })
  @ApiOkResponse({ description: 'CRM 계약 상세' })
  async detail(@Param('id') id: string) {
    return success(await this.contractService.getContract(id));
  }

  @Put(':id')
  @RequireCrmDomainFeature('canWriteContract')
  @ApiOperation({ summary: 'CRM 계약 수정' })
  @ApiBody({ type: CrmContractUpsertDto })
  @ApiOkResponse({ description: '수정된 CRM 계약' })
  async update(
    @Param('id') id: string,
    @Body() body: CrmContractUpsertDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.contractService.updateContract(id, body, BigInt(currentUser.userId)));
  }

  @Post(':id/confirm')
  @RequireCrmDomainFeature('canConfirmContract')
  @ApiOperation({ summary: 'CRM 계약 확정' })
  @ApiOkResponse({ description: '확정된 CRM 계약' })
  async confirm(@Param('id') id: string, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.contractService.confirmContract(id, BigInt(currentUser.userId)));
  }

  @Post(':id/reopen')
  @RequireCrmDomainFeature('canConfirmContract')
  @ApiOperation({ summary: 'CRM 계약 확정 해제' })
  @ApiOkResponse({ description: '확정 해제된 CRM 계약' })
  async reopen(@Param('id') id: string, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.contractService.reopenContract(id, BigInt(currentUser.userId)));
  }

  @Delete(':id')
  @RequireCrmDomainFeature('canWriteContract')
  @ApiOperation({ summary: 'CRM 계약 삭제' })
  @ApiOkResponse({ description: '삭제된 CRM 계약' })
  async delete(@Param('id') id: string, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.contractService.deleteContract(id, BigInt(currentUser.userId)));
  }
}
