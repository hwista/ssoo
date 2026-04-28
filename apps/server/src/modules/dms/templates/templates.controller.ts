import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiBearerAuth,
  ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import type { TemplateItem, TemplateScope } from '@ssoo/types/dms';
import { success } from '../../../common/responses.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { DmsFeatureGuard } from '../access/dms-feature.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { AccessRequestService } from '../access/access-request.service.js';
import { DocumentAclService } from '../access/document-acl.service.js';
import { RequireDmsFeature } from '../access/require-dms-feature.decorator.js';
import { contentService } from '../runtime/content.service.js';
import { TemplateConvertService } from './template-convert.service.js';
import { TemplateService } from './template.service.js';

function getRequestUserId(request: ExpressRequest): string {
  const user = request.user as Partial<TokenPayload> | undefined;
  if (typeof user?.userId === 'string' && user.userId.length > 0) {
    return user.userId;
  }

  const headerValue = request.headers['x-dms-user-id'];
  if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
    return headerValue.trim();
  }

  return 'anonymous';
}

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/templates')
@UseGuards(DmsFeatureGuard)
@RequireDmsFeature('canManageTemplates')
export class TemplatesController {
  constructor(
    private readonly documentAclService: DocumentAclService,
    private readonly accessRequestService: AccessRequestService,
    private readonly templateService: TemplateService,
    private readonly templateConvertService: TemplateConvertService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'DMS 템플릿 목록 조회' })
  @ApiOkResponse({ description: '템플릿 목록 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async list(
    @CurrentUser() currentUser: TokenPayload,
    @Req() request: ExpressRequest,
    @Query('sourceDocumentPath') sourceDocumentPath?: string,
    @Query('originType') originType?: string,
  ) {
    const userId = getRequestUserId(request);
    await this.accessRequestService.ensureRepoControlPlaneSynced();

    if (sourceDocumentPath?.trim()) {
      this.assertReadableDocumentPath(sourceDocumentPath.trim(), currentUser);
      const templates = await this.templateService.listByReferenceDocument(sourceDocumentPath.trim(), userId);
      return success(
        templates.map((item) => this.sanitizeTemplate(item, currentUser)),
      );
    }

    const templates = await this.templateService.list(userId);
    if (originType === 'referenced' || originType === 'generated') {
      return success({
        global: templates.global
          .filter((item) => item.originType === originType)
          .map((item) => this.sanitizeTemplate(item, currentUser)),
        personal: templates.personal
          .filter((item) => item.originType === originType)
          .map((item) => this.sanitizeTemplate(item, currentUser)) });
    }

    return success({
      global: templates.global.map((item) => this.sanitizeTemplate(item, currentUser)),
      personal: templates.personal.map((item) => this.sanitizeTemplate(item, currentUser)) });
  }

  @Get(':id')
  @ApiOperation({ summary: 'DMS 템플릿 상세 조회' })
  @ApiOkResponse({ description: '템플릿 상세 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async get(
    @Param('id') id: string,
    @Query('scope') scope: string | undefined,
    @CurrentUser() currentUser: TokenPayload,
    @Req() request: ExpressRequest,
  ) {
    await this.accessRequestService.ensureRepoControlPlaneSynced();
    const template = await this.templateService.get(
      id,
      scope === 'global' ? 'global' : 'personal',
      getRequestUserId(request),
    );
    if (!template) {
      throw new NotFoundException('템플릿을 찾을 수 없습니다.');
    }

    return success(this.sanitizeTemplate(template, currentUser));
  }

  @Post()
  @ApiOperation({ summary: 'DMS 템플릿 저장' })
  @ApiOkResponse({ description: '저장된 템플릿 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async upsert(
    @Body() body: Partial<TemplateItem> & Record<string, unknown>,
    @CurrentUser() currentUser: TokenPayload,
    @Req() request: ExpressRequest,
  ) {
    if (
      typeof body.name !== 'string'
      || (body.scope !== 'global' && body.scope !== 'personal')
      || (body.kind !== 'document' && body.kind !== 'folder')
      || typeof body.content !== 'string'
    ) {
      throw new BadRequestException('name/scope/kind/content는 필수입니다.');
    }

    const userId = getRequestUserId(request);
    await this.accessRequestService.ensureRepoControlPlaneSynced();
    const referenceDocuments = Array.isArray(body.referenceDocuments)
      ? this.filterReferenceDocuments(body.referenceDocuments, currentUser)
      : undefined;
    const saved = await this.templateService.save({
      id: typeof body.id === 'string' ? body.id : undefined,
      name: body.name,
      description: typeof body.description === 'string' ? body.description : undefined,
      summary: typeof body.summary === 'string' ? body.summary : undefined,
      tags: Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === 'string') : undefined,
      createdAt: typeof body.createdAt === 'string' ? body.createdAt : undefined,
      scope: body.scope,
      kind: body.kind,
      content: body.content,
      originType: body.originType === 'generated' || body.originType === 'referenced'
        ? body.originType
        : undefined,
      referenceDocuments,
      generation: body.generation && typeof body.generation === 'object'
        ? body.generation as TemplateItem['generation']
        : undefined }, userId, currentUser.loginId);

    return success(this.sanitizeTemplate(saved, currentUser));
  }

  @Delete()
  @ApiOperation({ summary: 'DMS 템플릿 삭제' })
  @ApiOkResponse({ description: '삭제 결과 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async remove(
    @Body() body: Record<string, unknown>,
    @Req() request: ExpressRequest,
  ) {
    const id = typeof body.id === 'string' ? body.id : '';
    const scope = body.scope === 'global' ? 'global' : body.scope === 'personal' ? 'personal' : null;
    if (!id || !scope) {
      throw new BadRequestException('id/scope는 필수입니다.');
    }

    const removed = await this.templateService.remove(id, scope as TemplateScope, getRequestUserId(request));
    if (!removed) {
      throw new NotFoundException('삭제 대상 템플릿을 찾을 수 없습니다.');
    }

    return success({ id });
  }

  @Post('convert')
  @ApiOperation({ summary: 'DMS 문서를 템플릿으로 변환' })
  @ApiProduces('text/event-stream')
  @ApiOkResponse({ description: '변환 스트림 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async convert(
    @Body() body: Record<string, unknown>,
    @CurrentUser() currentUser: TokenPayload,
    @Req() request: ExpressRequest,
    @Res() response: ExpressResponse,
  ) {
    const documentContent = typeof body.documentContent === 'string' ? body.documentContent : '';
    const documentPath = typeof body.documentPath === 'string' ? body.documentPath : undefined;
    if (!documentContent.trim()) {
      throw new BadRequestException('documentContent는 필수입니다.');
    }
    if (documentPath?.trim()) {
      await this.accessRequestService.ensureRepoControlPlaneSynced();
      this.assertReadableDocumentPath(documentPath.trim(), currentUser);
    }

    const abortController = new AbortController();
    request.once('close', () => abortController.abort());

    const userId = getRequestUserId(request);
    const { stream } = await this.templateConvertService.convertToTemplateStream(
      { documentContent, documentPath },
      userId,
      abortController.signal,
    );

    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');

    const reader = stream.getReader();
    try {
      while (true) {
        if (abortController.signal.aborted) {
          break;
        }

        const { done, value } = await reader.read();
        if (done || abortController.signal.aborted) {
          break;
        }

        response.write(`data: ${JSON.stringify({ type: 'text-delta', delta: value })}\n\n`);
      }

      if (!abortController.signal.aborted) {
        response.write('data: [DONE]\n\n');
      }
    } finally {
      response.end();
    }
  }

  private sanitizeTemplate(template: TemplateItem, currentUser: TokenPayload): TemplateItem {
    return {
      ...template,
      referenceDocuments: this.filterReferenceDocuments(template.referenceDocuments, currentUser) };
  }

  private filterReferenceDocuments(
    referenceDocuments: TemplateItem['referenceDocuments'],
    currentUser: TokenPayload,
  ) {
    return (referenceDocuments ?? []).filter((reference) => {
      if (!reference?.path?.trim()) {
        return false;
      }

      const { targetPath, valid } = contentService.resolveContentPath(reference.path.trim());
      return valid && this.documentAclService.isReadableAbsolutePath(currentUser, targetPath);
    });
  }

  private assertReadableDocumentPath(documentPath: string, currentUser: TokenPayload): void {
    const { targetPath, valid } = contentService.resolveContentPath(documentPath);
    if (!valid) {
      throw new BadRequestException('Invalid source document path');
    }

    this.documentAclService.assertCanReadAbsolutePath(currentUser, targetPath);
  }
}
