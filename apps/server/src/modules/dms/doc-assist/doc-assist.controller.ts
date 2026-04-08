import {
  BadRequestException,
  Body,
  Controller,
  Post,
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
import type { TemplateItem } from '@ssoo/types/dms';
import { success } from '../../../common/responses.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { docAssistService } from './doc-assist.service.js';

interface SummaryFileInput {
  id?: string;
  name: string;
  type?: string;
  textContent: string;
  images?: { base64: string; mimeType: string; name: string }[];
}

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/doc-assist')
@UseGuards(JwtAuthGuard)
export class DocAssistController {
  @Post()
  @ApiOperation({ summary: 'DMS 문서 작성 보조' })
  @ApiProduces('application/json', 'text/event-stream')
  @ApiOkResponse({ description: '문서 작성 보조 결과 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async handle(
    @Body() body: Record<string, unknown>,
    @Req() request: ExpressRequest,
    @Res() response: ExpressResponse,
  ) {
    const action = body.action === 'recommendPath' || body.action === 'recommendTitleAndPath'
      ? body.action
      : 'compose';

    if (action === 'recommendPath') {
      const data = docAssistService.recommendDocumentPath({
        instruction: this.readString(body.instruction),
        activeDocPath: this.readOptionalString(body.activeDocPath),
        selectedText: this.readOptionalString(body.selectedText),
        templates: this.readTemplates(body.templates),
        summaryFiles: this.readSummaryFiles(body.summaryFiles),
      });
      response.status(200).json(success(data));
      return;
    }

    if (action === 'recommendTitleAndPath') {
      const data = await docAssistService.recommendTitleAndPath({
        currentContent: this.readString(body.currentContent),
        activeDocPath: this.readOptionalString(body.activeDocPath),
        contentType: body.contentType === 'template' ? 'template' : 'document',
      });
      response.status(200).json(success(data));
      return;
    }

    const input = {
      instruction: this.readString(body.instruction),
      currentContent: this.readString(body.currentContent),
      selectedText: this.readOptionalString(body.selectedText),
      activeDocPath: this.readOptionalString(body.activeDocPath),
      templates: this.readTemplates(body.templates),
      summaryFiles: this.readSummaryFiles(body.summaryFiles),
      contentType: body.contentType === 'template' ? 'template' as const : 'document' as const,
    };

    if (body.stream === false) {
      const data = await docAssistService.composeDocument(input);
      response.status(200).json(success(data));
      return;
    }

    const abortController = new AbortController();
    request.once('close', () => abortController.abort());

    const { stream, applyMode, suggestedPath, relevanceWarnings } = await docAssistService.composeDocumentStream(
      input,
      abortController.signal,
    );

    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.write(
      `data: ${JSON.stringify({ type: 'meta', applyMode, suggestedPath, relevanceWarnings })}\n\n`,
    );

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
    } catch (error) {
      if (!abortController.signal.aborted) {
        const message = error instanceof Error ? error.message : '스트리밍 오류';
        response.write(`data: ${JSON.stringify({ type: 'error', errorText: message })}\n\n`);
      }
    } finally {
      response.end();
    }
  }

  private readString(value: unknown): string {
    if (typeof value !== 'string') {
      throw new BadRequestException('문자열 입력이 필요합니다.');
    }

    return value;
  }

  private readOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private readTemplates(value: unknown): TemplateItem[] {
    return Array.isArray(value) ? value.filter((item): item is TemplateItem => (
      typeof item === 'object' && item !== null
    )) : [];
  }

  private readSummaryFiles(value: unknown): SummaryFileInput[] {
    return Array.isArray(value) ? value.filter((item): item is SummaryFileInput => (
      typeof item === 'object' && item !== null && typeof (item as SummaryFileInput).name === 'string'
    )) : [];
  }
}
