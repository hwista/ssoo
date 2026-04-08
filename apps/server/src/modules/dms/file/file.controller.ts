import fs from 'node:fs';
import path from 'node:path';
import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  Req,
  Res,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import type { DocumentMetadata } from '@ssoo/types/dms';
import { success } from '../../../common/responses.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { Public } from '../../common/auth/decorators/public.decorator.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../../common/auth/guards/optional-jwt-auth.guard.js';
import { SearchService } from '../search/search.service.js';
import { configService } from '../runtime/dms-config.service.js';
import { contentService } from '../runtime/content.service.js';
import { createDmsLogger } from '../runtime/dms-logger.js';
import {
  ATTACHMENT_ALLOWED_EXTENSIONS,
  ATTACHMENT_STORAGE_DIR,
  getMimeType,
  IMAGE_ALLOWED_MIME_TYPES,
  REFERENCE_STORAGE_DIR,
} from './file.constants.js';
import { fileCrudService } from './file-crud.service.js';
import { saveFileByHash } from './hash-storage.js';
import { extractTextFromFile } from './text-extractor.js';

const logger = createDmsLogger('DmsFileController');

interface UploadedFormFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface FileActionBody {
  action: 'read' | 'metadata' | 'write' | 'create' | 'createFolder' | 'mkdir' | 'rename' | 'delete' | 'updateMetadata';
  path?: string;
  content?: string;
  name?: string;
  parent?: string;
  oldPath?: string;
  newPath?: string;
  autoNumber?: boolean;
  metadata?: Partial<DocumentMetadata>;
}

@ApiTags('dms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dms/file')
export class FileController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'DMS 파일 조회' })
  @ApiOkResponse({ description: '파일 데이터 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async getFile(
    @Req() request: ExpressRequest,
    @Query('path') queryPath?: string,
  ) {
    const headerValue = request.headers['x-file-path'];
    const headerPath = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const filePath = headerPath || queryPath;
    if (!filePath) {
      throw new BadRequestException('Missing file path header or query');
    }

    return success(await this.unwrap(fileCrudService.read(filePath)));
  }

  @Post()
  @ApiOperation({ summary: 'DMS 파일 액션 실행' })
  @ApiOkResponse({ description: '파일 액션 결과 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async handleAction(@Body() body: FileActionBody) {
    const {
      action,
      path: filePath,
      content,
      name,
      parent = '',
      oldPath,
      newPath,
      autoNumber,
      metadata,
    } = body;

    switch (action) {
      case 'read':
        if (!filePath) throw new BadRequestException('Missing file path');
        return success(await this.unwrap(fileCrudService.read(filePath)));
      case 'metadata':
        if (!filePath) throw new BadRequestException('Missing file path');
        return success(await this.unwrap(fileCrudService.readMetadata(filePath)));
      case 'write':
        if (!filePath || content === undefined) {
          throw new BadRequestException('Missing file path or content');
        }
        return success(await this.writeFile(filePath, content));
      case 'create':
        if (!filePath && !name) throw new BadRequestException('Missing file path or name');
        return success(await this.createFile(filePath || name || '', parent, content));
      case 'createFolder':
      case 'mkdir':
        if (!filePath && !name) throw new BadRequestException('Missing path or name');
        return success(await this.unwrap(fileCrudService.createFolder(name || '', parent, filePath)));
      case 'rename':
        if (!oldPath || !newPath) throw new BadRequestException('Missing oldPath or newPath');
        return success(await this.renameFile(oldPath, newPath, { autoNumber }));
      case 'delete':
        if (!filePath) throw new BadRequestException('Missing file path');
        return success(await this.deleteFile(filePath));
      case 'updateMetadata':
        if (!filePath) throw new BadRequestException('Missing file path');
        if (!metadata) throw new BadRequestException('Missing metadata');
        return success(await this.updateDocumentMetadata(filePath, metadata));
      default:
        throw new BadRequestException('Invalid action');
    }
  }

  // raw 이미지와 첨부파일 serve는 브라우저 <img src> / window.open() 경유이므로
  // Authorization 헤더를 보낼 수 없어 OptionalJwtAuthGuard로 유지.
  // 실제 보안 경계는 DMS Next.js 셸의 로그인 요구로 확보한다.
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('raw')
  @ApiOperation({ summary: 'DMS raw 이미지 반환' })
  @ApiProduces('image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml')
  async raw(
    @Query('path') filePath: string | undefined,
    @Res() response: ExpressResponse,
  ) {
    if (!filePath) {
      throw new BadRequestException('path 파라미터가 필요합니다.');
    }

    const { targetPath, valid } = fileCrudService.resolveFilePath(filePath);
    if (!valid) {
      throw new BadRequestException('잘못된 경로입니다.');
    }
    if (!fs.existsSync(targetPath)) {
      throw new NotFoundException('파일을 찾을 수 없습니다.');
    }

    const contentType = getMimeType(targetPath);
    if (!contentType.startsWith('image/')) {
      throw new UnsupportedMediaTypeException('지원하지 않는 파일 형식입니다.');
    }

    response.setHeader('Content-Type', contentType);
    response.setHeader('Cache-Control', 'public, max-age=3600');
    response.status(200).send(fs.readFileSync(targetPath));
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('serve-attachment')
  @ApiOperation({ summary: 'DMS 첨부파일 다운로드/미리보기' })
  async serveAttachment(
    @Query('path') filePath: string | undefined,
    @Query('download') download: string | undefined,
    @Query('name') originalName: string | undefined,
    @Res() response: ExpressResponse,
  ) {
    if (!filePath) {
      throw new BadRequestException('path 파라미터가 필요합니다.');
    }

    const { targetPath, valid } = fileCrudService.resolveFilePath(filePath);
    if (!valid) {
      throw new BadRequestException('유효하지 않은 경로입니다.');
    }
    if (!fs.existsSync(targetPath)) {
      throw new NotFoundException('파일을 찾을 수 없습니다.');
    }

    const buffer = fs.readFileSync(targetPath);
    const displayName = originalName || path.basename(filePath);
    response.setHeader('Content-Type', getMimeType(displayName));
    response.setHeader('Content-Length', String(buffer.length));
    response.setHeader(
      'Content-Disposition',
      `${download === '1' ? 'attachment' : 'inline'}; filename="${encodeURIComponent(displayName)}"`,
    );
    response.status(200).send(buffer);
  }

  @Post('extract-text')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'DMS 첨부파일 텍스트 추출' })
  @ApiConsumes('multipart/form-data')
  async extractText(
    @UploadedFile() file: UploadedFormFile | undefined,
  ) {
    const uploadedFile = this.requireFile(file);
    const attachmentMaxSizeMb = configService.getConfig().uploads.attachmentMaxSizeMb;
    const attachmentMaxSize = attachmentMaxSizeMb * 1024 * 1024;
    const ext = path.extname(uploadedFile.originalname).toLowerCase();

    if (!ATTACHMENT_ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(`허용되지 않는 파일 형식입니다: ${ext}`);
    }
    if (uploadedFile.size > attachmentMaxSize) {
      throw new BadRequestException(`파일 크기는 ${attachmentMaxSizeMb}MB 이하여야 합니다.`);
    }

    const result = await extractTextFromFile(uploadedFile.buffer, uploadedFile.originalname);
    logger.info('텍스트 추출 완료', {
      fileName: uploadedFile.originalname,
      ext,
      size: uploadedFile.size,
      textLength: result.text.length,
      imageCount: result.images.length,
    });

    return success({
      textContent: result.text,
      images: result.images,
      fileName: uploadedFile.originalname,
      size: uploadedFile.size,
    });
  }

  @Post('upload-attachment')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'DMS 첨부파일 업로드' })
  @ApiConsumes('multipart/form-data')
  async uploadAttachment(
    @UploadedFile() file: UploadedFormFile | undefined,
  ) {
    const uploadedFile = this.requireFile(file);
    const attachmentMaxSizeMb = configService.getConfig().uploads.attachmentMaxSizeMb;
    const attachmentMaxSize = attachmentMaxSizeMb * 1024 * 1024;
    const ext = path.extname(uploadedFile.originalname).toLowerCase();

    if (!ATTACHMENT_ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(`허용되지 않는 파일 형식입니다: ${ext}`);
    }
    if (uploadedFile.size > attachmentMaxSize) {
      throw new BadRequestException(`파일 크기는 ${attachmentMaxSizeMb}MB 이하여야 합니다.`);
    }

    const saved = saveFileByHash(uploadedFile.buffer, uploadedFile.originalname, ATTACHMENT_STORAGE_DIR);
    logger.info('첨부파일 업로드 완료', { relativePath: saved.relativePath, size: uploadedFile.size, reused: saved.reused });

    return success({
      path: saved.relativePath,
      fileName: saved.fileName,
      size: uploadedFile.size,
      type: getMimeType(uploadedFile.originalname),
    });
  }

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'DMS 이미지 업로드' })
  @ApiConsumes('multipart/form-data')
  async uploadImage(
    @UploadedFile() file: UploadedFormFile | undefined,
  ) {
    const uploadedFile = this.requireFile(file);
    const imageMaxSizeMb = configService.getConfig().uploads.imageMaxSizeMb;
    const imageMaxSize = imageMaxSizeMb * 1024 * 1024;

    if (!IMAGE_ALLOWED_MIME_TYPES.has(uploadedFile.mimetype)) {
      throw new BadRequestException(`허용되지 않는 파일 형식입니다: ${uploadedFile.mimetype}`);
    }
    if (uploadedFile.size > imageMaxSize) {
      throw new BadRequestException(`파일 크기는 ${imageMaxSizeMb}MB 이하여야 합니다.`);
    }

    const saved = saveFileByHash(uploadedFile.buffer, uploadedFile.originalname, '_assets/images');
    logger.info('이미지 업로드 완료', { relativePath: saved.relativePath, size: uploadedFile.size, reused: saved.reused });

    return success({
      path: saved.relativePath,
      fileName: saved.fileName,
    });
  }

  @Post('upload-reference')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'DMS 참조 파일 업로드' })
  @ApiConsumes('multipart/form-data')
  async uploadReference(
    @UploadedFile() file: UploadedFormFile | undefined,
  ) {
    const uploadedFile = this.requireFile(file);
    const attachmentMaxSizeMb = configService.getConfig().uploads.attachmentMaxSizeMb;
    const attachmentMaxSize = attachmentMaxSizeMb * 1024 * 1024;
    const ext = path.extname(uploadedFile.originalname).toLowerCase();

    if (!ATTACHMENT_ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(`허용되지 않는 파일 형식입니다: ${ext}`);
    }
    if (uploadedFile.size > attachmentMaxSize) {
      throw new BadRequestException(`파일 크기는 ${attachmentMaxSizeMb}MB 이하여야 합니다.`);
    }

    const saved = saveFileByHash(uploadedFile.buffer, uploadedFile.originalname, REFERENCE_STORAGE_DIR);
    logger.info('참조 파일 업로드 완료', { relativePath: saved.relativePath, size: uploadedFile.size, reused: saved.reused });

    return success({
      path: saved.relativePath,
      fileName: saved.fileName,
      size: uploadedFile.size,
      type: getMimeType(uploadedFile.originalname),
    });
  }

  private requireFile(file: UploadedFormFile | undefined): UploadedFormFile {
    if (!file) {
      throw new BadRequestException('파일이 필요합니다.');
    }

    return file;
  }

  private async writeFile(filePath: string, content: string) {
    const result = await this.unwrap(fileCrudService.write(filePath, content));
    await this.syncSearchIndex(filePath, 'upsert');
    return result;
  }

  private async createFile(nameOrPath: string, parent = '', content?: string) {
    const result = await this.unwrap(fileCrudService.create(nameOrPath, parent, content));
    await this.syncSearchIndex(result.savedPath, 'upsert');
    return result;
  }

  private async renameFile(oldPath: string, newPath: string, options?: { autoNumber?: boolean }) {
    const result = await this.unwrap(fileCrudService.rename(oldPath, newPath, options));
    if (result.finalPath) {
      await this.syncSearchIndex(result.finalPath, 'upsert', oldPath);
    }
    return result;
  }

  private async deleteFile(filePath: string) {
    const result = await this.unwrap(fileCrudService.remove(filePath));
    await this.syncSearchIndex(filePath, 'delete');
    return result;
  }

  private async updateDocumentMetadata(filePath: string, update: Partial<DocumentMetadata>) {
    const { targetPath, valid } = fileCrudService.resolveFilePath(filePath);
    if (!valid) {
      throw new BadRequestException('Invalid path');
    }
    if (!fs.existsSync(targetPath)) {
      throw new NotFoundException('File not found');
    }

    const existing = contentService.readSidecar(targetPath) as DocumentMetadata | null;
    if (!existing) {
      throw new NotFoundException('Metadata not found');
    }

    const merged: DocumentMetadata = {
      ...existing,
      ...update,
      updatedAt: new Date().toISOString(),
    };
    contentService.writeSidecar(targetPath, merged as unknown as Record<string, unknown>);
    await this.syncSearchIndex(filePath, 'upsert');
    logger.info('문서 메타데이터 업데이트 완료', { filePath });
    return merged;
  }

  private async syncSearchIndex(
    targetPath: string,
    action: 'upsert' | 'delete',
    previousPath?: string,
  ) {
    const normalized = targetPath.toLowerCase();
    if (!normalized.endsWith('.md') && normalized.includes('.')) {
      return;
    }

    try {
      await this.searchService.syncIndex({
        path: targetPath,
        previousPath,
        action,
      });
    } catch (error) {
      throw new BadGatewayException(
        `파일은 처리되었지만 검색 인덱스 동기화에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async unwrap<T>(result: Promise<{ success: true; data: T } | { success: false; error: string; status: number }>) {
    return this.unwrapSync(await result);
  }

  private unwrapSync<T>(result: { success: true; data: T } | { success: false; error: string; status: number }) {
    if (result.success) {
      return result.data;
    }

    switch (result.status) {
      case 400:
        throw new BadRequestException(result.error);
      case 404:
        throw new NotFoundException(result.error);
      default:
        throw new BadRequestException(result.error);
    }
  }
}
