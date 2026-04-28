import fs from 'fs';
import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpException,
  NotFoundException,
  Post,
  Query,
  UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiBearerAuth,
  ApiTags } from '@nestjs/swagger';
import type { DocumentMetadata } from '@ssoo/types/dms';
import { success } from '../../../common/responses.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { AccessRequestService } from '../access/access-request.service.js';
import { DocumentControlPlaneService } from '../access/document-control-plane.service.js';
import { DocumentAclService } from '../access/document-acl.service.js';
import { DmsFeatureGuard } from '../access/dms-feature.guard.js';
import { RequireDmsFeature } from '../access/require-dms-feature.decorator.js';
import { SearchService } from '../search/search.service.js';
import { CollaborationService } from '../collaboration/collaboration.service.js';
import { contentService } from '../runtime/content.service.js';

function isSearchIndexSyncTarget(targetPath: string): boolean {
  const normalized = targetPath.toLowerCase();
  return normalized.endsWith('.md') || !normalized.includes('.');
}

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/content')
@UseGuards(DmsFeatureGuard)
export class ContentController {
  constructor(
    private readonly searchService: SearchService,
    private readonly accessRequestService: AccessRequestService,
    private readonly documentControlPlaneService: DocumentControlPlaneService,
    private readonly documentAclService: DocumentAclService,
    private readonly collaborationService: CollaborationService,
  ) {}

  @Get()
  @RequireDmsFeature('canReadDocuments')
  @ApiOperation({ summary: 'DMS 콘텐츠 로드' })
  @ApiOkResponse({ description: '콘텐츠 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async load(
    @CurrentUser() currentUser: TokenPayload,
    @Query('path') contentPath?: string,
    @Query('strict') strict?: string,
  ) {
    if (!contentPath?.trim()) {
      throw new BadRequestException('Missing path parameter');
    }

    const normalizedPath = contentPath.trim();
    const { targetPath, valid, safeRelPath } = contentService.resolveContentPath(normalizedPath);
    if (!valid) {
      throw new BadRequestException('Invalid path');
    }
    if (!fs.existsSync(targetPath)) {
      throw new NotFoundException('Content not found');
    }

    await this.accessRequestService.ensureRepoControlPlaneSynced();
    this.documentAclService.assertCanReadAbsolutePath(currentUser, targetPath);
    const content = fs.readFileSync(targetPath, 'utf-8');
    const projectedMetadata = await this.documentControlPlaneService.getProjectedMetadataByRelativePath(safeRelPath);
    const fallbackMetadata = projectedMetadata
      ?? (
        strict === 'true'
          ? null
          : contentService.buildDefaultDocumentMetadata(content, targetPath, undefined, { defaultRevisionSeq: 0 })
      );
    if (!fallbackMetadata) {
      throw new NotFoundException('Metadata not found');
    }

    return success({ content, metadata: this.withIsolation(fallbackMetadata, safeRelPath) });
  }

  @Get('metadata')
  @RequireDmsFeature('canReadDocuments')
  @ApiOperation({ summary: 'DMS 콘텐츠 메타데이터 조회' })
  @ApiOkResponse({ description: '메타데이터 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async readMetadata(
    @CurrentUser() currentUser: TokenPayload,
    @Query('path') contentPath?: string,
  ) {
    if (!contentPath?.trim()) {
      throw new BadRequestException('Missing path parameter');
    }

    const { targetPath, valid, safeRelPath } = contentService.resolveContentPath(contentPath.trim());
    if (!valid) {
      throw new BadRequestException('Invalid path');
    }
    if (!fs.existsSync(targetPath)) {
      throw new NotFoundException('Content not found');
    }

    await this.accessRequestService.ensureRepoControlPlaneSynced();
    this.documentAclService.assertCanReadAbsolutePath(currentUser, targetPath);
    const content = fs.readFileSync(targetPath, 'utf-8');
    const metadata = await this.documentControlPlaneService.getProjectedMetadataByRelativePath(safeRelPath)
      ?? contentService.buildDefaultDocumentMetadata(content, targetPath, undefined, { defaultRevisionSeq: 0 });

    return success(this.withIsolation(metadata, safeRelPath));
  }

  @Delete()
  @RequireDmsFeature('canWriteDocuments')
  @ApiOperation({ summary: 'DMS 콘텐츠 삭제' })
  @ApiOkResponse({ description: '삭제 결과 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async remove(
    @CurrentUser() currentUser: TokenPayload,
    @Body() body: Record<string, unknown>,
  ) {
    const contentPath = typeof body.path === 'string' ? body.path : '';
    const candidatePaths = Array.isArray(body.candidatePaths)
      ? body.candidatePaths.filter((item): item is string => typeof item === 'string')
      : undefined;

    if (!contentPath) {
      throw new BadRequestException('path는 필수입니다.');
    }

    const { targetPath, valid } = contentService.resolveContentPath(contentPath);
    if (!valid) {
      throw new BadRequestException('Invalid path');
    }
    this.documentAclService.assertCanManageAbsolutePath(currentUser, targetPath);
    this.collaborationService.assertMutationAllowed({
      action: 'delete',
      paths: [contentPath, ...(candidatePaths ?? [])] });

    const result = contentService.delete(contentPath, candidatePaths);
    const data = this.unwrap(result, '콘텐츠 삭제에 실패했습니다.');
    this.collaborationService.noteMutation({
      primaryPath: contentPath,
      affectedPaths: [contentPath],
      operationType: 'delete',
      currentUser });
    await this.accessRequestService.ensureRepoControlPlaneSynced(true);
    await this.syncSearchIndex(contentPath, 'delete');
    return success(data);
  }

  @Post()
  @RequireDmsFeature('canWriteDocuments')
  @ApiOperation({ summary: 'DMS 콘텐츠 저장/메타데이터 갱신' })
  @ApiOkResponse({ description: '저장 결과 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async post(
    @CurrentUser() currentUser: TokenPayload,
    @Body() body: Record<string, unknown>,
  ) {
    const contentPath = typeof body.path === 'string' ? body.path : '';
    const expectedRevisionSeq = typeof body.expectedRevisionSeq === 'number'
      ? body.expectedRevisionSeq
      : undefined;
    if (!contentPath) {
      throw new BadRequestException('path는 필수입니다.');
    }

    const { targetPath, valid, safeRelPath } = contentService.resolveContentPath(contentPath);
    if (!valid) {
      throw new BadRequestException('Invalid path');
    }

    if (body.metadataUpdate && typeof body.metadataUpdate === 'object' && body.content === undefined) {
      const update = body.metadataUpdate as Record<string, unknown>;
      if (!fs.existsSync(targetPath)) {
        throw new NotFoundException('Content not found');
      }
      this.collaborationService.assertMutationAllowed({ action: 'updateMetadata', paths: [contentPath] });
      this.documentAclService.assertCanManageAbsolutePath(currentUser, targetPath);
      const baseContent = fs.readFileSync(targetPath, 'utf-8');
      const existing = await this.documentControlPlaneService.getProjectedMetadataByRelativePath(safeRelPath)
        ?? contentService.buildDefaultDocumentMetadata(baseContent, targetPath, undefined, { defaultRevisionSeq: 0 });

      const currentRevisionSeq = typeof existing['revisionSeq'] === 'number'
        ? existing['revisionSeq']
        : 0;
      if (
        expectedRevisionSeq !== undefined
        && currentRevisionSeq !== expectedRevisionSeq
      ) {
        throw new HttpException({
          error: 'Document conflict',
          details: {
            expectedRevisionSeq,
            currentRevisionSeq } }, 409);
      }

      const merged = {
        ...existing,
        ...update,
        updatedAt: new Date().toISOString(),
        revisionSeq: currentRevisionSeq + 1,
        lastModifiedBy: currentUser.loginId };
      this.collaborationService.noteMutation({
        primaryPath: contentPath,
        affectedPaths: [contentPath],
        operationType: 'metadata',
        currentUser });
      await this.accessRequestService.syncDocumentProjection(contentPath, merged);
      await this.syncSearchIndex(contentPath, 'upsert');
      return success(merged);
    }

    if (typeof body.content !== 'string') {
      throw new BadRequestException('path와 content는 필수입니다.');
    }

    const existingFile = fs.existsSync(targetPath);
    const canManage = existingFile
      ? this.documentAclService.isManageableAbsolutePath(currentUser, targetPath)
      : true;

    if (existingFile) {
      this.documentAclService.assertCanWriteAbsolutePath(currentUser, targetPath);
    }

    let metadata = body.metadata && typeof body.metadata === 'object'
      ? body.metadata as Record<string, unknown>
      : undefined;
    const existingMetadata = existingFile
      ? await this.documentControlPlaneService.getProjectedMetadataByRelativePath(safeRelPath)
      : null;

    if (!existingFile) {
      metadata = {
        ...(metadata ?? {}),
        acl: metadata?.['acl'] ?? this.documentAclService.buildOwnerAcl(currentUser),
        author: metadata?.['author'] ?? currentUser.loginId,
        lastModifiedBy: metadata?.['lastModifiedBy'] ?? currentUser.loginId,
        ownerId: metadata?.['ownerId'] ?? currentUser.userId,
        ownerLoginId: metadata?.['ownerLoginId'] ?? currentUser.loginId,
        visibility: metadata?.['visibility'] ?? { scope: 'self' } };
    }

    if (metadata && existingFile && !canManage) {
      if (existingMetadata) {
        metadata = {
          ...metadata,
          acl: existingMetadata['acl'],
          visibility: existingMetadata['visibility'],
          grants: existingMetadata['grants'],
          ownerId: existingMetadata['ownerId'],
          ownerLoginId: existingMetadata['ownerLoginId'] };
      }
    } else if (!metadata && existingMetadata) {
      metadata = { ...existingMetadata };
    }

    this.collaborationService.assertMutationAllowed({ action: 'write', paths: [contentPath] });
    const result = contentService.save(
      contentPath,
      body.content,
      metadata,
      {
        skipMetadata: body.skipMetadata === true,
        expectedRevisionSeq },
    );

    const data = this.unwrap(result, '콘텐츠 저장에 실패했습니다.');
    this.collaborationService.noteMutation({
      primaryPath: contentPath,
      affectedPaths: [contentPath],
      operationType: existingFile ? 'update' : 'create',
      currentUser });
    await this.accessRequestService.syncDocumentProjection(contentPath, data.metadata ?? metadata ?? null);
    await this.syncSearchIndex(contentPath, 'upsert');
    return success(data);
  }

  private async syncSearchIndex(
    contentPath: string,
    action: 'upsert' | 'delete',
  ) {
    if (!isSearchIndexSyncTarget(contentPath)) {
      return;
    }

    try {
      await this.searchService.syncIndex({ path: contentPath, action });
    } catch (error) {
      throw new BadGatewayException(
        `콘텐츠는 처리되었지만 검색 인덱스 동기화에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private unwrap<T>(
    result: { success: boolean; data?: T; error?: string; status?: number; details?: Record<string, unknown> },
    fallbackMessage: string,
  ): T {
    if (result.success && result.data !== undefined) {
      return result.data;
    }

    if (result.success) {
      throw new BadRequestException(fallbackMessage);
    }

    switch (result.status) {
      case 403:
        throw new ForbiddenException(result.error ?? fallbackMessage);
      case 404:
        throw new NotFoundException(result.error ?? fallbackMessage);
      case 409:
        throw new HttpException({
          error: result.error ?? fallbackMessage,
          details: result.details }, 409);
      default:
        throw new BadRequestException(result.error ?? fallbackMessage);
    }
  }

  private withIsolation(
    metadata: DocumentMetadata | Record<string, unknown>,
    relativePath: string,
  ): DocumentMetadata | Record<string, unknown> {
    const isolation = this.collaborationService.getPathIsolation(relativePath);
    if (!isolation) {
      return metadata;
    }

    return {
      ...metadata,
      isolation };
  }
}
