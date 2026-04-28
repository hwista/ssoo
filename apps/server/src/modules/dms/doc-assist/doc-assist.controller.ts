import {
  BadRequestException,
  Body,
  Controller,
  Post,
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
import type { FileNode, TemplateItem } from '@ssoo/types/dms';
import { success } from '../../../common/responses.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { AccessRequestService } from '../access/access-request.service.js';
import { DocumentAclService } from '../access/document-acl.service.js';
import { DmsFeatureGuard } from '../access/dms-feature.guard.js';
import { RequireDmsFeature } from '../access/require-dms-feature.decorator.js';
import { contentService } from '../runtime/content.service.js';
import { fileSystemService } from '../runtime/file-system.service.js';
import { docAssistService } from './doc-assist.service.js';

interface SummaryFileInput {
  id?: string;
  name: string;
  type?: string;
  textContent: string;
  images?: { base64: string; mimeType: string; name: string }[];
}

function flattenTree(nodes: FileNode[], prefix = ''): { dirs: string[]; files: string[] } {
  const dirs: string[] = [];
  const files: string[] = [];

  for (const node of nodes) {
    const nextPath = prefix ? `${prefix}/${node.name}` : node.name;
    if (node.type === 'directory') {
      dirs.push(nextPath);
      if (node.children) {
        const nested = flattenTree(node.children, nextPath);
        dirs.push(...nested.dirs);
        files.push(...nested.files);
      }
      continue;
    }

    files.push(nextPath);
  }

  return { dirs, files };
}

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/doc-assist')
@UseGuards(DmsFeatureGuard)
@RequireDmsFeature('canUseAssistant')
export class DocAssistController {
  constructor(
    private readonly documentAclService: DocumentAclService,
    private readonly accessRequestService: AccessRequestService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'DMS 문서 작성 보조' })
  @ApiProduces('application/json', 'text/event-stream')
  @ApiOkResponse({ description: '문서 작성 보조 결과 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async handle(
    @Body() body: Record<string, unknown>,
    @Req() request: ExpressRequest,
    @CurrentUser() currentUser: TokenPayload,
    @Res() response: ExpressResponse,
  ) {
    await this.accessRequestService.ensureRepoControlPlaneSynced();
    const action = body.action === 'recommendPath' || body.action === 'recommendTitleAndPath'
      ? body.action
      : 'compose';

    if (action === 'recommendPath') {
      this.assertReadableActivePath(this.readOptionalString(body.activeDocPath), currentUser);
      const data = docAssistService.recommendDocumentPath({
        instruction: this.readString(body.instruction),
        activeDocPath: this.readOptionalString(body.activeDocPath),
        selectedText: this.readOptionalString(body.selectedText),
        templates: this.readTemplates(body.templates),
        summaryFiles: this.readSummaryFiles(body.summaryFiles) });
      response.status(200).json(success(data));
      return;
    }

    if (action === 'recommendTitleAndPath') {
      const activeDocPath = this.readOptionalString(body.activeDocPath);
      this.assertReadableActivePath(activeDocPath, currentUser);
      const treeHints = await this.readVisibleTreeHints(body, currentUser);
      const data = await docAssistService.recommendTitleAndPath({
        currentContent: this.readString(body.currentContent),
        activeDocPath,
        directoryTree: treeHints?.dirs,
        existingFiles: treeHints?.files,
        contentType: body.contentType === 'template' ? 'template' : 'document' });
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
      contentType: body.contentType === 'template' ? 'template' as const : 'document' as const };
    this.assertReadableActivePath(input.activeDocPath, currentUser);

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

  private assertReadableActivePath(
    activeDocPath: string | undefined,
    currentUser: TokenPayload,
  ): void {
    if (!activeDocPath?.trim()) {
      return;
    }

    const { targetPath, valid } = contentService.resolveContentPath(activeDocPath.trim());
    if (!valid) {
      throw new BadRequestException('Invalid active document path');
    }

    this.documentAclService.assertCanReadAbsolutePath(currentUser, targetPath);
  }

  private async readVisibleTreeHints(
    _body: Record<string, unknown>,
    currentUser: TokenPayload,
  ): Promise<{ dirs: string[]; files: string[] } | null> {
    // readable surface 는 client cache 대신 서버 ACL 필터 결과를 기준으로 유지한다.
    const treeResult = await fileSystemService.getFileTree();
    if (!treeResult.success || !treeResult.data) {
      return null;
    }

    return flattenTree(this.documentAclService.filterFileTree(currentUser, treeResult.data));
  }
}
