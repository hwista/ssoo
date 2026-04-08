import fs from 'fs';
import path from 'path';
import {
  BadRequestException,
  Body,
  Controller,
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
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import type { StorageProvider } from '../runtime/dms-config.service.js';
import { getMimeType } from '../file/file.constants.js';
import {
  storageAdapterService,
  type StorageOpenRequest,
  type StorageUploadRequest,
} from './storage-adapter.service.js';

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/storage')
@UseGuards(JwtAuthGuard)
export class StorageController {
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
  open(@Body() body: StorageOpenRequest) {
    if (!body.storageUri && !body.path) {
      throw new BadRequestException('storageUri 또는 path가 필요합니다.');
    }

    try {
      return success(storageAdapterService.open(body));
    } catch (error) {
      this.throwStorageError(error);
    }
  }

  @Get('open')
  @ApiOperation({ summary: 'DMS 외부 저장소 GET 열기' })
  async openGet(
    @Query('storageUri') storageUri: string | undefined,
    @Query('provider') provider: StorageProvider | undefined,
    @Query('path') targetPath: string | undefined,
    @Res() response: ExpressResponse,
  ) {
    if (provider === 'local' && targetPath) {
      try {
        const resolved = storageAdapterService.resolveContainedPath('local', targetPath);
        if (!fs.existsSync(resolved.fullPath)) {
          throw new NotFoundException('대상 파일을 찾을 수 없습니다.');
        }

        const fileBuffer = fs.readFileSync(resolved.fullPath);
        const fileName = path.basename(resolved.fullPath) || 'download.bin';
        response.setHeader('Content-Type', getMimeType(fileName));
        response.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        response.status(200).send(fileBuffer);
        return;
      } catch (error) {
        this.throwStorageError(error);
      }
    }

    if (!storageUri && !targetPath) {
      throw new BadRequestException('storageUri 또는 path가 필요합니다.');
    }

    try {
      const result = storageAdapterService.open({ storageUri, provider, path: targetPath });
      if (result.openUrl.startsWith('/api/')) {
        response.status(200).json(result);
        return;
      }

      response.redirect(302, result.openUrl);
    } catch (error) {
      this.throwStorageError(error);
    }
  }

  private throwStorageError(error: unknown): never {
    const message = error instanceof Error ? error.message : '저장소 처리 중 오류가 발생했습니다.';
    if (message === '허용되지 않은 경로입니다.') {
      throw new BadRequestException(message);
    }
    if (message === '대상 파일을 찾을 수 없습니다.') {
      throw new NotFoundException(message);
    }
    throw new BadRequestException(message);
  }
}
