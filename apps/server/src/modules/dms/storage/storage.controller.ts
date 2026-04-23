import fs from 'fs';
import path from 'path';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response as ExpressResponse } from 'express';
import type { SourceFileMeta } from '@ssoo/types/dms';
import { success } from '../../../common/responses.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { AccessRequestService } from '../access/access-request.service.js';
import { DocumentControlPlaneService } from '../access/document-control-plane.service.js';
import { DocumentAclService } from '../access/document-acl.service.js';
import { CollaborationService } from '../collaboration/collaboration.service.js';
import { DmsFeatureGuard } from '../access/dms-feature.guard.js';
import { RequireDmsFeature } from '../access/require-dms-feature.decorator.js';
import { contentService } from '../runtime/content.service.js';
import type { StorageProvider } from '../runtime/dms-config.service.js';
import { getMimeType } from '../file/file.constants.js';
import {
  storageAdapterService,
  type StorageOpenRequest,
  type StorageOpenResult,
  type StorageRefreshRequest,
  type StorageUploadRequest,
} from './storage-adapter.service.js';

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/storage')
@UseGuards(JwtAuthGuard, DmsFeatureGuard)
export class StorageController {
  constructor(
    private readonly accessRequestService: AccessRequestService,
    private readonly documentControlPlaneService: DocumentControlPlaneService,
    private readonly documentAclService: DocumentAclService,
    private readonly collaborationService: CollaborationService,
  ) {}

  @Post('upload')
  @RequireDmsFeature('canManageStorage')
  @ApiOperation({ summary: 'DMS 외부 저장소 업로드' })
  @ApiOkResponse({ description: '저장소 업로드 결과 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  upload(@Body() body: Partial<StorageUploadRequest>) {
    if (!body.fileName?.trim()) {
      throw new BadRequestException('fileName이 필요합니다.');
    }

    try {
      return success(storageAdapterService.upload({
        fileName: body.fileName,
        content: body.content ?? '',
        provider: body.provider,
        relativePath: body.relativePath,
        origin: body.origin,
        status: body.status,
      }));
    } catch (error) {
      this.throwStorageError(error);
    }
  }

  @Post('open')
  @RequireDmsFeature('canReadDocuments')
  @ApiOperation({ summary: 'DMS 외부 저장소 열기 정보 조회' })
  @ApiOkResponse({ description: '열기 정보 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async open(
    @CurrentUser() currentUser: TokenPayload,
    @Body() body: StorageOpenRequest,
  ) {
    if (!body.storageUri && !body.path) {
      throw new BadRequestException('storageUri 또는 path가 필요합니다.');
    }

    try {
      const result = storageAdapterService.open(body);
      await this.assertStorageOpenAllowed(currentUser, body, result);
      return success(this.withDocumentContext(result, body.documentPath));
    } catch (error) {
      this.throwStorageError(error);
    }
  }

  @Post('resync')
  @RequireDmsFeature('canManageStorage')
  @ApiOperation({ summary: 'DMS 외부 저장소 메타데이터 재동기화' })
  @ApiOkResponse({ description: '재동기화된 source file metadata 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async resync(
    @CurrentUser() currentUser: TokenPayload,
    @Body() body: StorageOpenRequest,
  ) {
    const documentPath = body.documentPath?.trim();
    if (!documentPath) {
      throw new BadRequestException('documentPath가 필요합니다.');
    }
    if (!body.storageUri && !body.path) {
      throw new BadRequestException('storageUri 또는 path가 필요합니다.');
    }

    const { targetPath, valid, safeRelPath } = contentService.resolveContentPath(documentPath);
    if (!valid || !fs.existsSync(targetPath)) {
      throw new BadRequestException('유효한 문서 경로가 필요합니다.');
    }

    this.collaborationService.assertMutationAllowed({ action: 'resync', paths: [documentPath] });
    this.documentAclService.assertCanManageAbsolutePath(currentUser, targetPath);
    await this.accessRequestService.ensureRepoControlPlaneSynced();

    const projectedMetadata = await this.documentControlPlaneService.getProjectedMetadataByRelativePath(safeRelPath);
    const persistedMetadata = projectedMetadata;
    const sourceFiles = this.extractSourceFiles(persistedMetadata);
    const matched = this.findMatchedSourceFile(sourceFiles, body);
    if (!matched) {
      throw new NotFoundException('문서에 연결된 sourceFile을 찾을 수 없습니다.');
    }

    try {
      const refreshed = storageAdapterService.refresh({
        storageUri: matched.storageUri ?? body.storageUri,
        provider: this.resolveSourceFileProvider(matched, body.provider),
        path: matched.path ?? body.path,
        fileName: matched.name,
        origin: this.toStorageOrigin(matched.origin),
        status: this.toStorageStatus(matched.status),
      });
      const updatedSourceFile: SourceFileMeta = {
        ...matched,
        name: refreshed.name,
        path: refreshed.path,
        type: matched.type ?? getMimeType(refreshed.name),
        size: refreshed.size,
        url: refreshed.webUrl ?? matched.url,
        storageUri: refreshed.storageUri,
        provider: refreshed.provider,
        versionId: refreshed.versionId,
        etag: refreshed.etag,
        checksum: refreshed.checksum,
        origin: matched.origin,
        status: matched.status ?? refreshed.status,
      };
      const updatedSourceFiles = sourceFiles.map((sourceFile) => (
        this.isSameSourceFile(sourceFile, matched) ? updatedSourceFile : sourceFile
      ));
      const nextMetadata = {
        ...this.toMutableMetadataRecord(persistedMetadata),
        sourceFiles: updatedSourceFiles,
      };
      await this.accessRequestService.syncDocumentProjection(safeRelPath, nextMetadata);
      return success(updatedSourceFile);
    } catch (error) {
      this.throwStorageError(error);
    }
  }

  @Get('open')
  @RequireDmsFeature('canReadDocuments')
  @ApiOperation({ summary: 'DMS 외부 저장소 GET 열기' })
  async openGet(
    @CurrentUser() currentUser: TokenPayload,
    @Query('storageUri') storageUri: string | undefined,
    @Query('provider') provider: StorageProvider | undefined,
    @Query('path') targetPath: string | undefined,
    @Query('documentPath') documentPath: string | undefined,
    @Query('download') download: string | undefined,
    @Query('name') originalName: string | undefined,
    @Res() response: ExpressResponse,
  ) {
    if (!storageUri && !targetPath) {
      throw new BadRequestException('storageUri 또는 path가 필요합니다.');
    }

    try {
      const request: StorageOpenRequest = {
        storageUri,
        provider,
        path: targetPath,
        documentPath,
      };
      const result = storageAdapterService.open(request);
      await this.assertStorageOpenAllowed(currentUser, request, result);

      if (result.provider === 'local' || result.openUrl.startsWith('/api/')) {
        const resolved = storageAdapterService.resolveContainedPath(result.provider, result.path);
        if (!fs.existsSync(resolved.fullPath)) {
          throw new NotFoundException('대상 파일을 찾을 수 없습니다.');
        }

        const fileBuffer = fs.readFileSync(resolved.fullPath);
        const fileName = originalName?.trim() || path.basename(resolved.fullPath) || 'download.bin';
        response.setHeader('Content-Type', getMimeType(fileName));
        response.setHeader('Content-Length', String(fileBuffer.length));
        response.setHeader('Cache-Control', 'private, no-store');
        response.setHeader(
          'Content-Disposition',
          `${download === '1' ? 'attachment' : 'inline'}; filename="${encodeURIComponent(fileName)}"`,
        );
        response.status(200).send(fileBuffer);
        return;
      }

      response.redirect(302, result.openUrl);
    } catch (error) {
      this.throwStorageError(error);
    }
  }

  private async assertStorageOpenAllowed(
    currentUser: TokenPayload,
    request: StorageOpenRequest,
    result: StorageOpenResult,
  ): Promise<void> {
    const documentPath = request.documentPath?.trim();
    if (!documentPath) {
      throw new BadRequestException('documentPath가 필요합니다.');
    }

    const { targetPath, valid, safeRelPath } = contentService.resolveContentPath(documentPath);
    if (!valid || !fs.existsSync(targetPath)) {
      throw new BadRequestException('유효한 문서 경로가 필요합니다.');
    }

    await this.accessRequestService.ensureRepoControlPlaneSynced();
    this.documentAclService.assertCanReadAbsolutePath(currentUser, targetPath);

    const metadata = await this.documentControlPlaneService.getProjectedMetadataByRelativePath(safeRelPath)
      ?? null;
    const sourceFiles = this.extractSourceFiles(metadata);
    const matched = sourceFiles.some((sourceFile) => this.matchesStorageOpenResult(sourceFile, result));

    if (!matched) {
      throw new ForbiddenException('문서에 연결된 저장소 항목만 열 수 있습니다.');
    }
  }

  private withDocumentContext(
    result: StorageOpenResult,
    documentPath: string | undefined,
  ): StorageOpenResult {
    if (!documentPath?.trim() || !result.openUrl.startsWith('/api/')) {
      return result;
    }

    const separator = result.openUrl.includes('?') ? '&' : '?';
    return {
      ...result,
      openUrl: `${result.openUrl}${separator}documentPath=${encodeURIComponent(documentPath.trim())}`,
    };
  }

  private throwStorageError(error: unknown): never {
    if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ForbiddenException) {
      throw error;
    }

    const message = error instanceof Error ? error.message : '저장소 처리 중 오류가 발생했습니다.';
    if (message === '지원하지 않는 저장소 provider 입니다.') {
      throw new BadRequestException(message);
    }
    if (message.endsWith('저장소가 비활성화되어 있습니다.')) {
      throw new BadRequestException(message);
    }
    if (message === 'resync 대상 경로가 필요합니다.' || message === '열기 대상 경로가 필요합니다.') {
      throw new BadRequestException(message);
    }
    if (message === '허용되지 않은 경로입니다.') {
      throw new BadRequestException(message);
    }
    if (message === '대상 파일을 찾을 수 없습니다.') {
      throw new NotFoundException(message);
    }
    if (message === '문서에 연결된 저장소 항목만 열 수 있습니다.') {
      throw new ForbiddenException(message);
    }
    throw new BadRequestException(message);
  }

  private matchesStorageOpenResult(
    sourceFile: SourceFileMeta,
    result: StorageOpenResult,
  ): boolean {
    const sourceProvider = this.resolveSourceFileProviderForOpen(sourceFile);
    if (!sourceProvider || sourceProvider !== result.provider) {
      return false;
    }

    const sourceStorageUri = sourceFile.storageUri?.trim();
    if (sourceStorageUri && sourceStorageUri === result.storageUri) {
      return true;
    }

    const sourcePath = sourceFile.path.replace(/\\/g, '/').trim();
    return sourcePath.length > 0 && sourcePath === result.path.replace(/\\/g, '/');
  }

  private resolveSourceFileProviderForOpen(sourceFile: SourceFileMeta): StorageProvider | null {
    if (sourceFile.provider === 'local' || sourceFile.provider === 'sharepoint' || sourceFile.provider === 'nas') {
      return sourceFile.provider;
    }

    const storageUriProvider = this.parseStorageUriProvider(sourceFile.storageUri);
    if (storageUriProvider) {
      return storageUriProvider;
    }

    return sourceFile.path.trim().length > 0 ? 'local' : null;
  }

  private parseStorageUriProvider(storageUri: string | undefined): StorageProvider | null {
    if (!storageUri?.trim()) {
      return null;
    }

    const match = storageUri.trim().match(/^(local|sharepoint|nas):\/\//);
    return match ? match[1] as StorageProvider : null;
  }

  private extractSourceFiles(metadata: unknown): SourceFileMeta[] {
    if (!metadata || typeof metadata !== 'object') {
      return [];
    }

    const sourceFiles = (metadata as { sourceFiles?: unknown }).sourceFiles;
    if (!Array.isArray(sourceFiles)) {
      return [];
    }

    return sourceFiles.flatMap((sourceFile) => {
      if (!sourceFile || typeof sourceFile !== 'object') {
        return [];
      }

      const entry = sourceFile as Record<string, unknown>;
      const origin = typeof entry.origin === 'string' ? entry.origin : undefined;
      const status = entry.status;
      const storage = entry.storage;
      const kind = entry.kind;
      return [{
        name: typeof entry.name === 'string' ? entry.name : '',
        path: typeof entry.path === 'string' ? entry.path : '',
        type: typeof entry.type === 'string' ? entry.type : undefined,
        size: typeof entry.size === 'number' ? entry.size : undefined,
        url: typeof entry.url === 'string' ? entry.url : undefined,
        storageUri: typeof entry.storageUri === 'string' ? entry.storageUri : undefined,
        provider: typeof entry.provider === 'string' ? entry.provider : undefined,
        versionId: typeof entry.versionId === 'string' ? entry.versionId : undefined,
        etag: typeof entry.etag === 'string' ? entry.etag : undefined,
        checksum: typeof entry.checksum === 'string' ? entry.checksum : undefined,
        origin: this.isReferenceOrigin(origin) ? origin : undefined,
        status: status === 'draft' || status === 'pending_confirm' || status === 'published' ? status : undefined,
        textContent: typeof entry.textContent === 'string' ? entry.textContent : undefined,
        storage: storage === 'path' || storage === 'inline' ? storage : undefined,
        kind: kind === 'document' || kind === 'file' ? kind : undefined,
        tempId: typeof entry.tempId === 'string' ? entry.tempId : undefined,
        images: Array.isArray(entry.images)
          ? entry.images.flatMap((image) => {
              if (
                !image
                || typeof image !== 'object'
                || typeof (image as { base64?: unknown }).base64 !== 'string'
                || typeof (image as { mimeType?: unknown }).mimeType !== 'string'
                || typeof (image as { name?: unknown }).name !== 'string'
                || typeof (image as { size?: unknown }).size !== 'number'
              ) {
                return [];
              }

              const typedImage = image as {
                base64: string;
                mimeType: string;
                name: string;
                size: number;
              };
              return [typedImage];
            })
          : undefined,
      }];
    });
  }

  private findMatchedSourceFile(
    sourceFiles: SourceFileMeta[],
    request: StorageOpenRequest,
  ): SourceFileMeta | null {
    const requestedStorageUri = request.storageUri?.trim();
    const requestedPath = request.path?.replace(/\\/g, '/').trim();
    const requestedProvider = request.provider;

    return sourceFiles.find((sourceFile) => {
      const sourcePath = sourceFile.path.replace(/\\/g, '/');
      if (requestedStorageUri && sourceFile.storageUri === requestedStorageUri) {
        return true;
      }
      if (!requestedPath || sourcePath !== requestedPath) {
        return false;
      }

      if (!requestedProvider) {
        return true;
      }

      const provider = typeof sourceFile.provider === 'string'
        ? sourceFile.provider
        : 'local';
      return provider === requestedProvider;
    }) ?? null;
  }

  private isSameSourceFile(left: SourceFileMeta, right: SourceFileMeta): boolean {
    if (left.storageUri && right.storageUri) {
      return left.storageUri === right.storageUri;
    }

    return left.path === right.path && left.name === right.name;
  }

  private resolveSourceFileProvider(
    sourceFile: SourceFileMeta,
    requestedProvider?: StorageProvider,
  ): StorageProvider | undefined {
    if (typeof sourceFile.provider === 'string') {
      if (sourceFile.provider === 'local' || sourceFile.provider === 'sharepoint' || sourceFile.provider === 'nas') {
        return sourceFile.provider;
      }
    }

    return requestedProvider ?? (sourceFile.storageUri ? undefined : 'local');
  }

  private toMutableMetadataRecord(metadata: unknown): Record<string, unknown> {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return {};
    }

    return JSON.parse(JSON.stringify(metadata)) as Record<string, unknown>;
  }

  private isReferenceOrigin(origin: string | undefined): origin is NonNullable<SourceFileMeta['origin']> {
    return origin === 'manual'
      || origin === 'ingest'
      || origin === 'teams'
      || origin === 'network_drive'
      || origin === 'reference'
      || origin === 'template'
      || origin === 'picker'
      || origin === 'assistant'
      || origin === 'current-document'
      || origin === 'template-selected';
  }

  private toStorageOrigin(origin: SourceFileMeta['origin']): StorageRefreshRequest['origin'] {
    return origin === 'ingest' || origin === 'teams' || origin === 'network_drive'
      ? origin
      : 'manual';
  }

  private toStorageStatus(status: SourceFileMeta['status']): StorageRefreshRequest['status'] {
    return status === 'draft' || status === 'pending_confirm' || status === 'published'
      ? status
      : 'published';
  }
}
