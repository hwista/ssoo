import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags } from '@nestjs/swagger';
import { success } from '../../../common/responses.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { DmsFeatureGuard } from './dms-feature.guard.js';
import { RequireDmsFeature } from './require-dms-feature.decorator.js';
import {
  ApproveReadAccessRequestDto,
  CreateReadAccessRequestDto,
  ListAccessRequestsDto,
  RejectReadAccessRequestDto,
  UpdateDocumentVisibilityDto } from './dto/access-request.dto.js';
import { AccessRequestService } from './access-request.service.js';

@ApiTags('dms-access')
@ApiBearerAuth()
@Controller('dms/access/requests')
@UseGuards(DmsFeatureGuard)
export class AccessRequestController {
  constructor(private readonly accessRequestService: AccessRequestService) {}

  @Post()
  @RequireDmsFeature('canUseSearch')
  @ApiOperation({ summary: '문서 읽기 권한 요청 생성' })
  @ApiOkResponse({ description: '생성된 권한 요청 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async create(
    @CurrentUser() currentUser: TokenPayload,
    @Body() dto: CreateReadAccessRequestDto,
  ) {
    return success(await this.accessRequestService.createReadRequest(currentUser, dto));
  }

  @Get('me')
  @RequireDmsFeature('canUseSearch')
  @ApiOperation({ summary: '내 문서 읽기 권한 요청 목록 조회' })
  @ApiOkResponse({ description: '내 권한 요청 목록 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async listMyRequests(
    @CurrentUser() currentUser: TokenPayload,
    @Query() query: ListAccessRequestsDto,
  ) {
    return success(await this.accessRequestService.listMyReadRequests(currentUser, query));
  }

  @Get('inbox')
  @RequireDmsFeature('canReadDocuments')
  @ApiOperation({ summary: '내가 처리할 수 있는 문서 권한 요청 inbox 조회' })
  @ApiOkResponse({ description: '승인/거절 가능한 요청 목록 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async listInbox(
    @CurrentUser() currentUser: TokenPayload,
    @Query() query: ListAccessRequestsDto,
  ) {
    return success(await this.accessRequestService.listManageableReadRequests(currentUser, query));
  }

  @Get('documents/manageable')
  @RequireDmsFeature('canReadDocuments')
  @ApiOperation({ summary: '내가 관리 가능한 문서 목록 조회' })
  @ApiOkResponse({ description: '문서별 권한 관리 목록 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async listManageableDocuments(
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.accessRequestService.listManageableDocuments(currentUser));
  }

  @Post(':accessRequestId/approve')
  @RequireDmsFeature('canReadDocuments')
  @ApiOperation({ summary: '문서 읽기 권한 요청 승인' })
  @ApiOkResponse({ description: '승인된 권한 요청 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async approve(
    @CurrentUser() currentUser: TokenPayload,
    @Param('accessRequestId') accessRequestId: string,
    @Body() dto: ApproveReadAccessRequestDto,
  ) {
    return success(await this.accessRequestService.approveReadRequest(currentUser, accessRequestId, dto));
  }

  @Post(':accessRequestId/reject')
  @RequireDmsFeature('canReadDocuments')
  @ApiOperation({ summary: '문서 읽기 권한 요청 거절' })
  @ApiOkResponse({ description: '거절된 권한 요청 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async reject(
    @CurrentUser() currentUser: TokenPayload,
    @Param('accessRequestId') accessRequestId: string,
    @Body() dto: RejectReadAccessRequestDto,
  ) {
    return success(await this.accessRequestService.rejectReadRequest(currentUser, accessRequestId, dto));
  }

  @Patch('documents/:documentId/visibility')
  @RequireDmsFeature('canReadDocuments')
  @ApiOperation({ summary: '문서 공개범위 변경 (소유자 전용)' })
  @ApiOkResponse({ description: '변경된 공개범위 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async updateVisibility(
    @CurrentUser() currentUser: TokenPayload,
    @Param('documentId') documentId: string,
    @Body() dto: UpdateDocumentVisibilityDto,
  ) {
    return success(
      await this.accessRequestService.updateDocumentVisibility(currentUser, documentId, dto.visibilityScope),
    );
  }
}
