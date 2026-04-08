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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import type { TemplateItem, TemplateScope } from '@ssoo/types/dms';
import { success } from '../../../common/responses.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { templateConvertService } from './template-convert.service.js';
import { templateService } from './template.service.js';

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
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  @Get()
  @ApiOperation({ summary: 'DMS 템플릿 목록 조회' })
  @ApiOkResponse({ description: '템플릿 목록 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  list(
    @Req() request: ExpressRequest,
    @Query('sourceDocumentPath') sourceDocumentPath?: string,
    @Query('originType') originType?: string,
  ) {
    const userId = getRequestUserId(request);

    if (sourceDocumentPath?.trim()) {
      return success(templateService.listByReferenceDocument(sourceDocumentPath.trim(), userId));
    }

    const templates = templateService.list(userId);
    if (originType === 'referenced' || originType === 'generated') {
      return success({
        global: templates.global.filter((item) => item.originType === originType),
        personal: templates.personal.filter((item) => item.originType === originType),
      });
    }

    return success(templates);
  }

  @Get(':id')
  @ApiOperation({ summary: 'DMS 템플릿 상세 조회' })
  @ApiOkResponse({ description: '템플릿 상세 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  get(
    @Param('id') id: string,
    @Query('scope') scope: string | undefined,
    @Req() request: ExpressRequest,
  ) {
    const template = templateService.get(
      id,
      scope === 'global' ? 'global' : 'personal',
      getRequestUserId(request),
    );
    if (!template) {
      throw new NotFoundException('템플릿을 찾을 수 없습니다.');
    }

    return success(template);
  }

  @Post()
  @ApiOperation({ summary: 'DMS 템플릿 저장' })
  @ApiOkResponse({ description: '저장된 템플릿 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  upsert(
    @Body() body: Partial<TemplateItem> & Record<string, unknown>,
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
    const saved = templateService.save({
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
      referenceDocuments: Array.isArray(body.referenceDocuments) ? body.referenceDocuments : undefined,
      generation: body.generation && typeof body.generation === 'object'
        ? body.generation as TemplateItem['generation']
        : undefined,
    }, userId, userId);

    return success(saved);
  }

  @Delete()
  @ApiOperation({ summary: 'DMS 템플릿 삭제' })
  @ApiOkResponse({ description: '삭제 결과 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  remove(
    @Body() body: Record<string, unknown>,
    @Req() request: ExpressRequest,
  ) {
    const id = typeof body.id === 'string' ? body.id : '';
    const scope = body.scope === 'global' ? 'global' : body.scope === 'personal' ? 'personal' : null;
    if (!id || !scope) {
      throw new BadRequestException('id/scope는 필수입니다.');
    }

    const removed = templateService.remove(id, scope as TemplateScope, getRequestUserId(request));
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
    @Req() request: ExpressRequest,
    @Res() response: ExpressResponse,
  ) {
    const documentContent = typeof body.documentContent === 'string' ? body.documentContent : '';
    const documentPath = typeof body.documentPath === 'string' ? body.documentPath : undefined;
    if (!documentContent.trim()) {
      throw new BadRequestException('documentContent는 필수입니다.');
    }

    const abortController = new AbortController();
    request.once('close', () => abortController.abort());

    const userId = getRequestUserId(request);
    const { stream } = await templateConvertService.convertToTemplateStream(
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
}
