import { Body, Controller, Delete, Get, Headers, Param, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { CrmOpportunityListQuery, CrmOpportunityOwnerLookupQuery } from '@ssoo/types/crm';
import type { Response as ExpressResponse } from 'express';
import { success } from '../../../common/index.js';
import { ApiOkObjectResponse } from '../../../common/swagger/api-response.decorator.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { formatContentDisposition } from '../../dms/file/file.constants.js';
import { CrmAccessService } from '../access/access.service.js';
import { CrmOpportunityFeatureGuard } from '../access/crm-opportunity-feature.guard.js';
import { RequireCrmOpportunityFeature } from '../access/require-crm-opportunity-feature.decorator.js';
import {
  CrmOpportunityContractConversionDto,
  CrmOpportunityContractDocumentDraftDto,
  CrmOpportunityContractDocumentLifecycleExecutionDto,
  CrmOpportunityQuoteWorkflowDto,
  CrmOpportunityUpsertDto,
  CrmQuoteDmsDocumentDraftDto,
  CrmQuoteDmsDocumentExecutionEvidenceDto,
  CrmQuoteDmsDocumentLifecycleExecutionDto,
} from './dto/opportunity.dto.js';
import { OpportunityService } from './opportunity.service.js';

@ApiTags('crm-opportunities')
@ApiBearerAuth()
@Controller('crm/opportunities')
@UseGuards(RolesGuard, CrmOpportunityFeatureGuard)
export class OpportunityController {
  constructor(
    private readonly opportunityService: OpportunityService,
    private readonly accessService: CrmAccessService,
  ) {}

  @Get()
  @RequireCrmOpportunityFeature('canViewOpportunity')
  @ApiOperation({ summary: 'CRM 영업기회 현황 데모 목록' })
  @ApiQuery({ name: 'view', required: false, enum: ['source-list'], description: '원천 현황의 표시 필드 검색·DC/절사 전 금액 정렬. 응답 원장 금액은 유지합니다.' })
  @ApiOkObjectResponse({ description: 'CRM 영업기회 목록과 요약' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 영업기회 조회 권한 없음' })
  async list(@Query() query: CrmOpportunityListQuery, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.opportunityService.listResponse(query, currentUser));
  }

  @Get('access/me')
  @ApiOperation({ summary: 'CRM 영업기회 전역 접근 스냅샷' })
  @ApiOkResponse({ description: 'CRM 영업기회 전역 접근 스냅샷' })
  async myAccess(@CurrentUser() currentUser: TokenPayload) {
    return success(await this.accessService.getGlobalOpportunityAccess(currentUser));
  }

  @Get('owners/lookup')
  @RequireCrmOpportunityFeature('canCreateOpportunity')
  @ApiOperation({ summary: 'CRM 영업기회 담당자 공용 사용자 조회' })
  @ApiOkResponse({ description: 'CRM 영업기회 담당자 후보 사용자 목록' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 영업기회 생성 권한 없음' })
  async ownerLookup(@Query() query: CrmOpportunityOwnerLookupQuery) {
    return success(await this.opportunityService.findOwnerLookup(query));
  }

  @Get(':id/access')
  @RequireCrmOpportunityFeature('canViewOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 접근 스냅샷' })
  @ApiOkResponse({ description: 'CRM 영업기회 접근 스냅샷' })
  async access(@Param('id') id: string, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.accessService.getOpportunityAccess(id, currentUser));
  }

  @Get(':id/quote-preview')
  @RequireCrmOpportunityFeature('canViewOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 견적 후보 미리보기' })
  @ApiOkResponse({ description: '영업기회 원장 기반 읽기 전용 견적 후보' })
  async quotePreview(@Param('id') id: string, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.opportunityService.getQuotePreview(id, currentUser));
  }

  @Get(':id/contract-document-preview')
  @RequireCrmOpportunityFeature('canViewOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: '확정 영업기회 원천 22개 변수 계약서 미리보기' })
  @ApiOkResponse({ description: '원천 데모 호환 계약서 변수·DMS 템플릿·lifecycle 준비 상태' })
  @ApiQuery({ name: 'templateKey', required: false, description: '선택한 DOCX 템플릿의 준비 상태와 파일명 확인' })
  async contractDocumentPreview(@Param('id') id: string, @CurrentUser() currentUser: TokenPayload, @Query('templateKey') templateKey?: string) {
    return success(await this.opportunityService.getOpportunityContractDocumentPreview(id, currentUser, templateKey));
  }

  @Get(':id/contract-document-sample')
  @RequireCrmOpportunityFeature('canViewOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 계약서 샘플 DOCX 템플릿 다운로드' })
  async downloadContractDocumentSample(@Res() response: ExpressResponse) {
    const artifact = await this.opportunityService.readOpportunityContractDocumentSample();
    response.setHeader('Content-Type', artifact.contentType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Length', String(artifact.buffer.length));
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Content-Disposition', formatContentDisposition('attachment', artifact.fileName));
    response.status(200).send(artifact.buffer);
  }

  @Post(':id/contract-document-draft')
  @RequireCrmOpportunityFeature('canConfirmOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: '확정 영업기회 원천 22개 변수 DMS 초안 저장' })
  @ApiBody({ type: CrmOpportunityContractDocumentDraftDto })
  @ApiOkResponse({ description: 'CRM 영업기회 계약서 DMS draft handoff snapshot' })
  async createContractDocumentDraft(
    @Param('id') id: string,
    @Body() body: CrmOpportunityContractDocumentDraftDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.opportunityService.createOpportunityContractDocumentDraft(id, body, currentUser));
  }

  @Post(':id/contract-document-lifecycle-execution')
  @RequireCrmOpportunityFeature('canConfirmOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'DMS 영업기회 계약서 DOCX lifecycle 실행' })
  @ApiBody({ type: CrmOpportunityContractDocumentLifecycleExecutionDto })
  @ApiOkResponse({ description: 'DMS DOCX 산출과 CRM artifact evidence handoff 결과' })
  async executeContractDocumentLifecycle(
    @Param('id') id: string,
    @Body() body: CrmOpportunityContractDocumentLifecycleExecutionDto,
    @CurrentUser() currentUser: TokenPayload,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return success(await this.opportunityService.executeOpportunityContractDocumentLifecycle(
      id,
      body,
      currentUser,
      { idempotencyKey },
    ));
  }

  @Get(':id/contract-document-artifact')
  @RequireCrmOpportunityFeature('canViewOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: '완료된 CRM 영업기회 계약서 DOCX 다운로드' })
  async downloadContractDocumentArtifact(
    @Param('id') id: string,
    @Res() response: ExpressResponse,
  ) {
    const artifact = await this.opportunityService.readOpportunityContractDocumentArtifact(id);
    response.setHeader('Content-Type', artifact.contentType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Length', String(artifact.buffer.length));
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Content-Disposition', formatContentDisposition('attachment', artifact.fileName));
    response.status(200).send(artifact.buffer);
  }

  @Post(':id/quote-dms-document-draft')
  @RequireCrmOpportunityFeature('canEditOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 견적 DMS markdown 초안 저장' })
  @ApiBody({ type: CrmQuoteDmsDocumentDraftDto })
  @ApiOkResponse({ description: '견적 DMS draft handoff snapshot' })
  async createQuoteDmsDocumentDraft(
    @Param('id') id: string,
    @Body() body: CrmQuoteDmsDocumentDraftDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.opportunityService.createQuoteDmsDocumentDraft(id, body, currentUser));
  }

  @Post(':id/quote-dms-document-execution-evidence')
  @RequireCrmOpportunityFeature('canEditOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 견적 DMS execution evidence 수신' })
  @ApiBody({ type: CrmQuoteDmsDocumentExecutionEvidenceDto })
  @ApiOkResponse({ description: '견적 DMS lifecycle evidence가 반영된 handoff snapshot' })
  async recordQuoteDmsDocumentExecutionEvidence(
    @Param('id') id: string,
    @Body() body: CrmQuoteDmsDocumentExecutionEvidenceDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.opportunityService.recordQuoteDmsDocumentExecutionEvidence(id, body, currentUser));
  }

  @Post(':id/quote-dms-document-lifecycle-execution')
  @RequireCrmOpportunityFeature('canEditOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 견적 handoff 기반 DMS lifecycle artifact 실행' })
  @ApiBody({ type: CrmQuoteDmsDocumentLifecycleExecutionDto })
  @ApiOkResponse({ description: 'DMS 견적 artifact 생성과 CRM evidence snapshot 반영 결과' })
  async executeQuoteDmsDocumentLifecycle(
    @Param('id') id: string,
    @Body() body: CrmQuoteDmsDocumentLifecycleExecutionDto,
    @CurrentUser() currentUser: TokenPayload,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return success(await this.opportunityService.executeQuoteDmsDocumentLifecycle(
      id,
      body,
      currentUser,
      { idempotencyKey },
    ));
  }

  @Get(':id/quote-dms-artifacts/:kind')
  @RequireCrmOpportunityFeature('canViewOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: '완료된 CRM 견적 DMS DOCX/PDF 산출물 다운로드' })
  async downloadQuoteDmsArtifact(
    @Param('id') id: string,
    @Param('kind') kind: string,
    @Res() response: ExpressResponse,
  ) {
    const artifact = await this.opportunityService.readQuoteDmsArtifact(id, kind);
    response.setHeader('Content-Type', artifact.contentType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Length', String(artifact.buffer.length));
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Content-Disposition', formatContentDisposition('attachment', artifact.fileName));
    response.status(200).send(artifact.buffer);
  }

  @Put(':id/quote-workflow')
  @RequireCrmOpportunityFeature('canEditOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 견적 상태 저장' })
  @ApiBody({ type: CrmOpportunityQuoteWorkflowDto })
  @ApiOkResponse({ description: '견적 상태가 반영된 영업기회 견적 후보' })
  async updateQuoteWorkflow(
    @Param('id') id: string,
    @Body() body: CrmOpportunityQuoteWorkflowDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.opportunityService.updateQuoteWorkflow(id, body, BigInt(currentUser.userId), currentUser));
  }

  @Get(':id')
  @RequireCrmOpportunityFeature('canViewOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 상세' })
  @ApiOkResponse({ description: 'CRM 영업기회 상세' })
  async detail(@Param('id') id: string) {
    return success(await this.opportunityService.getOpportunity(id));
  }

  @Post()
  @RequireCrmOpportunityFeature('canCreateOpportunity')
  @ApiOperation({ summary: 'CRM 영업기회 생성' })
  @ApiBody({ type: CrmOpportunityUpsertDto })
  @ApiOkResponse({ description: '생성된 CRM 영업기회' })
  async create(@Body() body: CrmOpportunityUpsertDto, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.opportunityService.createOpportunity(body, BigInt(currentUser.userId)));
  }

  @Put(':id')
  @RequireCrmOpportunityFeature('canEditOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 수정' })
  @ApiBody({ type: CrmOpportunityUpsertDto })
  @ApiOkResponse({ description: '수정된 CRM 영업기회' })
  async update(@Param('id') id: string, @Body() body: CrmOpportunityUpsertDto, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.opportunityService.updateOpportunity(id, body, BigInt(currentUser.userId)));
  }

  @Delete(':id')
  @RequireCrmOpportunityFeature('canEditOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 최신 미확정 영업기회 삭제' })
  @ApiOkResponse({ description: '삭제된 영업기회와 삭제 후 선택 가능한 이전 차수' })
  async delete(@Param('id') id: string) {
    return success(await this.opportunityService.deleteOpportunity(id));
  }

  @Post(':id/confirm')
  @RequireCrmOpportunityFeature('canConfirmOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 확정' })
  @ApiOkResponse({ description: '확정된 CRM 영업기회' })
  async confirm(@Param('id') id: string) {
    return success(await this.opportunityService.confirmOpportunity(id));
  }

  @Post(':id/reopen')
  @RequireCrmOpportunityFeature('canConfirmOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 확정 해제(연결 계약이 있으면 함께 회수)' })
  @ApiOkResponse({ description: '확정 해제된 CRM 영업기회' })
  async reopen(@Param('id') id: string, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.opportunityService.reopenOpportunity(id, BigInt(currentUser.userId)));
  }

  @Post(':id/revoke-contract')
  @RequireCrmOpportunityFeature('canConfirmOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 연결 계약 회수 후 확정 상태 복원' })
  @ApiOkResponse({ description: '연결 계약이 회수되고 확정 상태로 복원된 CRM 영업기회' })
  async revokeContract(@Param('id') id: string, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.opportunityService.revokeOpportunityContract(id, BigInt(currentUser.userId)));
  }

  @Post(':id/convert-contract')
  @RequireCrmOpportunityFeature('canConfirmOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 계약 전환' })
  @ApiBody({ type: CrmOpportunityContractConversionDto })
  @ApiOkResponse({ description: '계약으로 전환된 영업기회와 생성된 CRM 계약' })
  async convertContract(
    @Param('id') id: string,
    @Body() body: CrmOpportunityContractConversionDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.opportunityService.convertOpportunityToContract(id, body, BigInt(currentUser.userId)));
  }

  @Get(':id/versions')
  @RequireCrmOpportunityFeature('canViewOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 차수 목록' })
  @ApiOkResponse({ description: '영업기회 차수 목록' })
  async versions(@Param('id') id: string) {
    return success(await this.opportunityService.listOpportunityVersions(id));
  }

  @Get(':id/history')
  @RequireCrmOpportunityFeature('canViewOpportunity', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 변경 이력' })
  @ApiOkResponse({ description: '영업기회 변경 이력' })
  async history(@Param('id') id: string) {
    return success(await this.opportunityService.listOpportunityHistory(id));
  }

  @Post(':id/versions')
  @RequireCrmOpportunityFeature('canAddVersion', { opportunityIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 영업기회 차수 추가' })
  @ApiOkResponse({ description: '추가된 CRM 영업기회 차수' })
  async addVersion(@Param('id') id: string) {
    return success(await this.opportunityService.addOpportunityVersion(id));
  }
}
