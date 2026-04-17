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
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import type { Response as ExpressResponse } from 'express';
import { success } from '../../../common/responses.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { DocumentAclService } from '../access/document-acl.service.js';
import { DmsFeatureGuard } from '../access/dms-feature.guard.js';
import { RequireDmsFeature } from '../access/require-dms-feature.decorator.js';
import { contentService } from '../runtime/content.service.js';
import type { StorageProvider } from '../runtime/dms-config.service.js';
import { getMimeType } from '../file/file.constants.js';
import {
  storageAdapterService,
  type StorageOpenRequest,
  type StorageOpenResult,
  type StorageUploadRequest,
} from './storage-adapter.service.js';

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/storage')
@UseGuards(JwtAuthGuard, DmsFeatureGuard)
@RequireDmsFeature('canManageStorage')
export class StorageController {
  constructor(private readonly documentAclService: DocumentAclService) {}

  @Post('upload')
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
  @ApiOperation({ summary: 'DMS 외부 저장소 열기 정보 조회' })
  @ApiOkResponse({ description: '열기 정보 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  open(
    @CurrentUser() currentUser: TokenPayload,
    @Body() body: StorageOpenRequest,
  ) {
    if (!body.storageUri && !body.path) {
      throw new BadRequestException('storageUri 또는 path가 필요합니다.');
    }

    try {
      const result = storageAdapterService.open(body);
      this.assertStorageOpenAllowed(currentUser, body, result);
      return success(this.withDocumentContext(result, body.documentPath));
    } catch (error) {
      this.throwStorageError(error);
    }
  }

  @Get('open')
  @ApiOperation({ summary: 'DMS 외부 저장소 GET 열기' })
  async openGet(
    @CurrentUser() currentUser: TokenPayload,
    @Query('storageUri') storageUri: string | undefined,
    @Query('provider') provider: StorageProvider | undefined,
    @Query('path') targetPath: string | undefined,
    @Query('documentPath') documentPath: string | undefined,
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
      this.assertStorageOpenAllowed(currentUser, request, result);

      if (result.provider === 'local') {
        const resolved = storageAdapterService.resolveContainedPath('local', result.path);
        if (!fs.existsSync(resolved.fullPath)) {
          throw new NotFoundException('대상 파일을 찾을 수 없습니다.');
        }

        const fileBuffer = fs.readFileSync(resolved.fullPath);
        const fileName = path.basename(resolved.fullPath) || 'download.bin';
        response.setHeader('Content-Type', getMimeType(fileName));
        response.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        response.status(200).send(fileBuffer);
        return;
      }

      if (result.openUrl.startsWith('/api/')) {
        response.status(200).json(result);
        return;
      }

      response.redirect(302, result.openUrl);
    } catch (error) {
      this.throwStorageError(error);
    }
  }

  private assertStorageOpenAllowed(
    currentUser: TokenPayload,
    request: StorageOpenRequest,
    result: StorageOpenResult,
  ): void {
    if (result.provider !== 'local') {
      return;
    }

    const documentPath = request.documentPath?.trim();
    if (!documentPath) {
      throw new BadRequestException('local storage open에는 documentPath가 필요합니다.');
    }

    const { targetPath, valid } = contentService.resolveContentPath(documentPath);
    if (!valid || !fs.existsSync(targetPath)) {
      throw new BadRequestException('유효한 문서 경로가 필요합니다.');
    }

    this.documentAclService.assertCanReadAbsolutePath(currentUser, targetPath);

    const sidecar = contentService.readSidecar(targetPath);
    const sourceFiles = Array.isArray(sidecar?.['sourceFiles'])
      ? sidecar['sourceFiles'] as Array<Record<string, unknown>>
      : [];
    const requestedPath = result.path.replace(/\\/g, '/');
    const requestedStorageUri = result.storageUri;
    const matched = sourceFiles.some((sourceFile) => {
      const providerValue = typeof sourceFile['provider'] === 'string'
        ? sourceFile['provider']
        : 'local';
      if (providerValue !== 'local') {
        return false;
      }

      const filePath = typeof sourceFile['path'] === 'string'
        ? sourceFile['path'].replace(/\\/g, '/')
        : '';
      const storageUri = typeof sourceFile['storageUri'] === 'string'
        ? sourceFile['storageUri']
        : '';

      return filePath === requestedPath || storageUri === requestedStorageUri;
    });

    if (!matched) {
      throw new ForbiddenException('문서에 연결된 local storage 항목만 열 수 있습니다.');
    }
  }

  private withDocumentContext(
    result: StorageOpenResult,
    documentPath: string | undefined,
  ): StorageOpenResult {
    if (result.provider !== 'local' || !documentPath?.trim() || !result.openUrl.startsWith('/api/')) {
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
    if (message === '허용되지 않은 경로입니다.') {
      throw new BadRequestException(message);
    }
    if (message === '대상 파일을 찾을 수 없습니다.') {
      throw new NotFoundException(message);
    }
    if (message === '문서에 연결된 local storage 항목만 열 수 있습니다.') {
      throw new ForbiddenException(message);
    }
    throw new BadRequestException(message);
  }
}
