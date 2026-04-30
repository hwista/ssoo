import fs from 'node:fs';
import path from 'node:path';
import {
  BadRequestException,
  Body,
  Controller,
  HttpException,
  ForbiddenException,
  Get,
  NotFoundException,
  Post,
  Query,
  Req,
  Res,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseGuards,
  UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import type { DocumentMetadata } from '@ssoo/types/dms';
import { success } from '../../../common/responses.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { AccessRequestService } from '../access/access-request.service.js';
import { AccessService } from '../access/access.service.js';
import { DmsFeatureGuard } from '../access/dms-feature.guard.js';
import { DocumentControlPlaneService } from '../access/document-control-plane.service.js';
import { DocumentAclService } from '../access/document-acl.service.js';
import { RequireDmsFeature } from '../access/require-dms-feature.decorator.js';
import { SearchService } from '../search/search.service.js';
import { CollaborationService } from '../collaboration/collaboration.service.js';
import { configService, type StorageProvider } from '../runtime/dms-config.service.js';
import { contentService } from '../runtime/content.service.js';
import { createDmsLogger } from '../runtime/dms-logger.js';
import { isMarkdownFile } from '../runtime/file-utils.js';
import {
  ATTACHMENT_ALLOWED_EXTENSIONS,
  ATTACHMENT_STORAGE_DIR,
  getMimeType,
  IMAGE_ALLOWED_MIME_TYPES,
  IMAGE_STORAGE_DIR,
  REFERENCE_STORAGE_DIR } from './file.constants.js';
import { FileCrudService } from './file-crud.service.js';
import { extractTextFromFile } from './text-extractor.js';
import { storageAdapterService } from '../storage/storage-adapter.service.js';

const logger = createDmsLogger('DmsFileController');

interface UploadedFormFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

function toMetadataRecord(value: DocumentMetadata | null | undefined): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  const record: Record<string, unknown> = { ...value };
  return record;
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
  expectedRevisionSeq?: number;
}

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/file')
export class FileController {
  constructor(
    private readonly searchService: SearchService,
    private readonly accessRequestService: AccessRequestService,
    private readonly accessService: AccessService,
    private readonly documentControlPlaneService: DocumentControlPlaneService,
    private readonly documentAclService: DocumentAclService,
    private readonly fileCrudService: FileCrudService,
    private readonly collaborationService: CollaborationService,
  ) {}

  @Get()
  @UseGuards(DmsFeatureGuard)
  @RequireDmsFeature('canReadDocuments')
  @ApiOperation({ summary: 'DMS 파일 조회' })
  @ApiOkResponse({ description: '파일 데이터 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async getFile(
    @Req() request: ExpressRequest,
    @CurrentUser() currentUser: TokenPayload,
    @Query('path') queryPath?: string,
  ) {
    const headerValue = request.headers['x-file-path'];
    const headerPath = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const filePath = headerPath || queryPath;
    if (!filePath) {
      throw new BadRequestException('Missing file path header or query');
    }

    await this.accessRequestService.ensureRepoControlPlaneSynced();
    const data = await this.unwrap(this.fileCrudService.read(filePath, currentUser));
    return success(this.withIsolationOnFilePayload(filePath, data));
  }

  @Post()
  @ApiOperation({ summary: 'DMS 파일 액션 실행' })
  @ApiOkResponse({ description: '파일 액션 결과 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async handleAction(
    @Body() body: FileActionBody,
    @CurrentUser() currentUser: TokenPayload,
  ) {
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
      expectedRevisionSeq } = body;

    if (action === 'read' || action === 'metadata') {
      await this.accessService.assertFeatures(currentUser, ['canReadDocuments']);
    } else if (
      action === 'write'
      || action === 'create'
      || action === 'createFolder'
      || action === 'mkdir'
      || action === 'rename'
      || action === 'delete'
      || action === 'updateMetadata'
    ) {
      await this.accessService.assertFeatures(currentUser, ['canWriteDocuments']);
    } else {
      throw new BadRequestException('Invalid action');
    }

    switch (action) {
      case 'read':
        if (!filePath) throw new BadRequestException('Missing file path');
        await this.accessRequestService.ensureRepoControlPlaneSynced();
        return success(this.withIsolationOnFilePayload(
          filePath,
          await this.unwrap(this.fileCrudService.read(filePath, currentUser)),
        ));
      case 'metadata':
        if (!filePath) throw new BadRequestException('Missing file path');
        await this.accessRequestService.ensureRepoControlPlaneSynced();
        return success(this.withIsolationOnFilePayload(
          filePath,
          await this.unwrap(this.fileCrudService.readMetadata(filePath, currentUser)),
        ));
      case 'write':
        if (!filePath || content === undefined) {
          throw new BadRequestException('Missing file path or content');
        }
        return success(await this.writeFile(filePath, content, currentUser, { expectedRevisionSeq }));
      case 'create':
        if (!filePath && !name) throw new BadRequestException('Missing file path or name');
        return success(await this.createFile(filePath || name || '', parent, content, currentUser));
      case 'createFolder':
      case 'mkdir':
        if (!filePath && !name) throw new BadRequestException('Missing path or name');
        return success(await this.unwrap(this.fileCrudService.createFolder(name || '', parent, filePath)));
      case 'rename':
        if (!oldPath || !newPath) throw new BadRequestException('Missing oldPath or newPath');
        return success(await this.renameFile(oldPath, newPath, currentUser, { autoNumber }));
      case 'delete':
        if (!filePath) throw new BadRequestException('Missing file path');
        return success(await this.deleteFile(filePath, currentUser));
      case 'updateMetadata':
        if (!filePath) throw new BadRequestException('Missing file path');
        if (!metadata) throw new BadRequestException('Missing metadata');
        return success(await this.updateDocumentMetadata(filePath, metadata, currentUser, { expectedRevisionSeq }));
      default:
        throw new BadRequestException('Invalid action');
    }
  }

  // raw 이미지와 첨부파일 serve도 same-origin DMS proxy가 shared session cookie로
  // access token을 복원한 뒤 Authorization 헤더를 붙여 호출한다.
  @Get('raw')
  @UseGuards(DmsFeatureGuard)
  @RequireDmsFeature('canReadDocuments')
  @ApiOperation({ summary: 'DMS raw 이미지 반환' })
  @ApiProduces('image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml')
  async raw(
    @Query('path') filePath: string | undefined,
    @CurrentUser() currentUser: TokenPayload,
    @Res() response: ExpressResponse,
  ) {
    if (!filePath) {
      throw new BadRequestException('path 파라미터가 필요합니다.');
    }

    await this.accessRequestService.ensureRepoControlPlaneSynced();
    const { targetPath, valid } = this.fileCrudService.resolveFilePath(filePath);
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

    this.documentAclService.assertCanReadAbsolutePath(currentUser, targetPath);
    response.setHeader('Content-Type', contentType);
    response.setHeader('Cache-Control', 'private, max-age=3600, must-revalidate');
    response.status(200).send(fs.readFileSync(targetPath));
  }

  @Get('serve-attachment')
  @UseGuards(DmsFeatureGuard)
  @RequireDmsFeature('canReadDocuments')
  @ApiOperation({ summary: 'DMS 첨부파일 다운로드/미리보기' })
  async serveAttachment(
    @Query('path') filePath: string | undefined,
    @Query('download') download: string | undefined,
    @Query('name') originalName: string | undefined,
    @CurrentUser() currentUser: TokenPayload,
    @Res() response: ExpressResponse,
  ) {
    if (!filePath) {
      throw new BadRequestException('path 파라미터가 필요합니다.');
    }

    await this.accessRequestService.ensureRepoControlPlaneSynced();
    const { targetPath, valid } = this.fileCrudService.resolveFilePath(filePath);
    let resolvedAbsolutePath: string | null = null;

    if (valid && fs.existsSync(targetPath)) {
      this.documentAclService.assertCanReadAbsolutePath(currentUser, targetPath);
      resolvedAbsolutePath = targetPath;
    } else {
      resolvedAbsolutePath = await this.resolveStorageBackedAttachmentPath(filePath, currentUser);
    }

    if (!resolvedAbsolutePath || !fs.existsSync(resolvedAbsolutePath)) {
      throw new NotFoundException('파일을 찾을 수 없습니다.');
    }

    const buffer = fs.readFileSync(resolvedAbsolutePath);
    const displayName = originalName || path.basename(filePath);
    response.setHeader('Content-Type', getMimeType(displayName));
    response.setHeader('Content-Length', String(buffer.length));
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader(
      'Content-Disposition',
      `${download === '1' ? 'attachment' : 'inline'}; filename="${encodeURIComponent(displayName)}"`,
    );
    response.status(200).send(buffer);
  }

  @Post('extract-text')
  @UseGuards(DmsFeatureGuard)
  @RequireDmsFeature('canWriteDocuments')
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
      imageCount: result.images.length });

    return success({
      textContent: result.text,
      images: result.images,
      fileName: uploadedFile.originalname,
      size: uploadedFile.size });
  }

  @Post('upload-attachment')
  @UseGuards(DmsFeatureGuard)
  @RequireDmsFeature('canWriteDocuments')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'DMS 첨부파일 업로드' })
  @ApiConsumes('multipart/form-data')
  async uploadAttachment(
    @CurrentUser() currentUser: TokenPayload,
    @UploadedFile() file: UploadedFormFile | undefined,
    @Body('documentPath') documentPath?: string,
    @Body('provider') provider?: string,
  ) {
    const uploadedFile = this.requireFile(file);
    if (documentPath?.trim()) {
      this.collaborationService.assertMutationAllowed({ action: 'upload', paths: [documentPath.trim()] });
    }
    this.assertCanUploadToDocument(currentUser, documentPath);
    const storageProvider = this.resolveUploadProvider(provider);
    const attachmentMaxSizeMb = configService.getConfig().uploads.attachmentMaxSizeMb;
    const attachmentMaxSize = attachmentMaxSizeMb * 1024 * 1024;
    const ext = path.extname(uploadedFile.originalname).toLowerCase();

    if (!ATTACHMENT_ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(`허용되지 않는 파일 형식입니다: ${ext}`);
    }
    if (uploadedFile.size > attachmentMaxSize) {
      throw new BadRequestException(`파일 크기는 ${attachmentMaxSizeMb}MB 이하여야 합니다.`);
    }

    const saved = storageAdapterService.upload({
      fileName: uploadedFile.originalname,
      content: uploadedFile.buffer,
      provider: storageProvider,
      relativePath: ATTACHMENT_STORAGE_DIR,
      origin: 'manual',
      status: 'published' });
    logger.info('첨부파일 업로드 완료', {
      path: saved.path,
      provider: saved.provider,
      size: uploadedFile.size });

    return success({
      path: saved.path,
      fileName: saved.name,
      size: saved.size,
      type: getMimeType(uploadedFile.originalname),
      provider: saved.provider,
      storageUri: saved.storageUri,
      versionId: saved.versionId,
      etag: saved.etag,
      checksum: saved.checksum,
      status: saved.status,
      webUrl: saved.webUrl });
  }

  @Post('upload-image')
  @UseGuards(DmsFeatureGuard)
  @RequireDmsFeature('canWriteDocuments')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'DMS 이미지 업로드' })
  @ApiConsumes('multipart/form-data')
  async uploadImage(
    @CurrentUser() currentUser: TokenPayload,
    @UploadedFile() file: UploadedFormFile | undefined,
    @Body('documentPath') documentPath?: string,
    @Body('provider') provider?: string,
  ) {
    const uploadedFile = this.requireFile(file);
    if (documentPath?.trim()) {
      this.collaborationService.assertMutationAllowed({ action: 'upload', paths: [documentPath.trim()] });
    }
    this.assertCanUploadToDocument(currentUser, documentPath);
    const storageProvider = this.resolveUploadProvider(provider);
    const imageMaxSizeMb = configService.getConfig().uploads.imageMaxSizeMb;
    const imageMaxSize = imageMaxSizeMb * 1024 * 1024;

    if (!IMAGE_ALLOWED_MIME_TYPES.has(uploadedFile.mimetype)) {
      throw new BadRequestException(`허용되지 않는 파일 형식입니다: ${uploadedFile.mimetype}`);
    }
    if (uploadedFile.size > imageMaxSize) {
      throw new BadRequestException(`파일 크기는 ${imageMaxSizeMb}MB 이하여야 합니다.`);
    }

    const saved = storageAdapterService.upload({
      fileName: uploadedFile.originalname,
      content: uploadedFile.buffer,
      provider: storageProvider,
      relativePath: IMAGE_STORAGE_DIR,
      origin: 'manual',
      status: 'published' });
    logger.info('이미지 업로드 완료', {
      path: saved.path,
      provider: saved.provider,
      size: uploadedFile.size });

    return success({
      path: saved.path,
      fileName: saved.name,
      size: saved.size,
      type: getMimeType(uploadedFile.originalname),
      provider: saved.provider,
      storageUri: saved.storageUri,
      versionId: saved.versionId,
      etag: saved.etag,
      checksum: saved.checksum,
      status: saved.status,
      webUrl: saved.webUrl });
  }

  @Post('upload-reference')
  @UseGuards(DmsFeatureGuard)
  @RequireDmsFeature('canWriteDocuments')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'DMS 참조 파일 업로드' })
  @ApiConsumes('multipart/form-data')
  async uploadReference(
    @CurrentUser() currentUser: TokenPayload,
    @UploadedFile() file: UploadedFormFile | undefined,
    @Body('documentPath') documentPath?: string,
    @Body('provider') provider?: string,
  ) {
    const uploadedFile = this.requireFile(file);
    if (documentPath?.trim()) {
      this.collaborationService.assertMutationAllowed({ action: 'upload', paths: [documentPath.trim()] });
    }
    this.assertCanUploadToDocument(currentUser, documentPath);
    const storageProvider = this.resolveUploadProvider(provider);
    const attachmentMaxSizeMb = configService.getConfig().uploads.attachmentMaxSizeMb;
    const attachmentMaxSize = attachmentMaxSizeMb * 1024 * 1024;
    const ext = path.extname(uploadedFile.originalname).toLowerCase();

    if (!ATTACHMENT_ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(`허용되지 않는 파일 형식입니다: ${ext}`);
    }
    if (uploadedFile.size > attachmentMaxSize) {
      throw new BadRequestException(`파일 크기는 ${attachmentMaxSizeMb}MB 이하여야 합니다.`);
    }

    const saved = storageAdapterService.upload({
      fileName: uploadedFile.originalname,
      content: uploadedFile.buffer,
      provider: storageProvider,
      relativePath: REFERENCE_STORAGE_DIR,
      origin: 'manual',
      status: 'published' });
    logger.info('참조 파일 업로드 완료', {
      path: saved.path,
      provider: saved.provider,
      size: uploadedFile.size });

    return success({
      path: saved.path,
      fileName: saved.name,
      size: saved.size,
      type: getMimeType(uploadedFile.originalname),
      provider: saved.provider,
      storageUri: saved.storageUri,
      versionId: saved.versionId,
      etag: saved.etag,
      checksum: saved.checksum,
      status: saved.status,
      webUrl: saved.webUrl });
  }

  private requireFile(file: UploadedFormFile | undefined): UploadedFormFile {
    if (!file) {
      throw new BadRequestException('파일이 필요합니다.');
    }

    return file;
  }

  private resolveUploadProvider(provider?: string): StorageProvider | undefined {
    if (!provider) {
      return undefined;
    }

    if (provider === 'local' || provider === 'sharepoint' || provider === 'nas') {
      return provider;
    }

    throw new BadRequestException('지원하지 않는 저장소 provider 입니다.');
  }

  private isMarkdownPath(filePath: string): boolean {
    return isMarkdownFile(filePath.trim());
  }

  private shouldForceControlPlaneResync(filePath: string): boolean {
    const normalized = filePath.trim().toLowerCase();
    return normalized.endsWith('.md') || path.extname(normalized).length === 0;
  }

  private async resolveStorageBackedAttachmentPath(
    filePath: string,
    currentUser: TokenPayload,
  ): Promise<string | null> {
    const resolvedStoragePath = this.resolveExistingStorageAttachmentPath(filePath);
    if (!resolvedStoragePath) {
      throw new NotFoundException('파일을 찾을 수 없습니다.');
    }

    if (!this.documentAclService.hasReadableDocumentReference(currentUser, filePath)) {
      throw new ForbiddenException('첨부파일을 읽을 권한이 없습니다.');
    }

    return resolvedStoragePath;
  }

  private resolveExistingStorageAttachmentPath(filePath: string): string | null {
    for (const provider of ['local', 'sharepoint', 'nas'] as const) {
      try {
        const resolvedPath = storageAdapterService.resolveContainedPath(provider, filePath).fullPath;
        if (fs.existsSync(resolvedPath)) {
          return resolvedPath;
        }
      } catch {
        // ignore invalid containment for this provider candidate
      }
    }

    return null;
  }

  private assertCanUploadToDocument(
    currentUser: TokenPayload,
    documentPath: string | undefined,
  ): void {
    if (!documentPath?.trim()) {
      return;
    }

    const normalizedDocumentPath = documentPath.trim();
    if (!/\.md$/i.test(normalizedDocumentPath)) {
      throw new BadRequestException('documentPath must reference a markdown document');
    }

    const { targetPath, valid } = this.fileCrudService.resolveFilePath(normalizedDocumentPath);
    if (!valid) {
      throw new BadRequestException('Invalid document path');
    }
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
      throw new BadRequestException('documentPath must reference a file');
    }
    if (!fs.existsSync(targetPath)) {
      return;
    }

    this.documentAclService.assertCanWriteAbsolutePath(currentUser, targetPath);
  }

  private resolveGitManagedMutationPaths(candidatePaths: string[]): string[] {
    const gitManagedPaths = new Set<string>();

    for (const candidatePath of candidatePaths) {
      const normalizedCandidatePath = candidatePath.trim().replace(/\\/g, '/');
      if (!normalizedCandidatePath) {
        continue;
      }

      if (this.isMarkdownPath(normalizedCandidatePath)) {
        gitManagedPaths.add(normalizedCandidatePath);
        continue;
      }

      if (path.extname(normalizedCandidatePath)) {
        continue;
      }

      const { targetPath, valid, safeRelPath } = this.fileCrudService.resolveFilePath(normalizedCandidatePath);
      if (!valid || !fs.existsSync(targetPath)) {
        continue;
      }

      if (fs.statSync(targetPath).isDirectory()) {
        this.collectMarkdownDocumentPaths(targetPath).forEach((markdownPath) => gitManagedPaths.add(markdownPath));
        continue;
      }

      if (this.isMarkdownPath(safeRelPath)) {
        gitManagedPaths.add(safeRelPath);
      }
    }

    return Array.from(gitManagedPaths);
  }

  private collectMarkdownDocumentPaths(rootPath: string): string[] {
    const docRoot = configService.getDocDir();
    const gitManagedPaths = new Set<string>();

    const visitDirectory = (currentPath: string): void => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(currentPath, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          visitDirectory(fullPath);
          continue;
        }

        if (!entry.isFile() || !this.isMarkdownPath(entry.name)) {
          continue;
        }

        gitManagedPaths.add(path.relative(docRoot, fullPath).replace(/\\/g, '/'));
      }
    };

    visitDirectory(rootPath);
    return Array.from(gitManagedPaths);
  }

  private async writeFile(
    filePath: string,
    content: string,
    currentUser: TokenPayload,
    options?: { expectedRevisionSeq?: number },
  ) {
    this.collaborationService.assertMutationAllowed({ action: 'write', paths: [filePath] });
    const result = await this.unwrap(this.fileCrudService.write(filePath, content, currentUser, options));
    const gitManagedPaths = this.resolveGitManagedMutationPaths([filePath]);
    if (gitManagedPaths.length > 0) {
      this.collaborationService.noteMutation({
        primaryPath: filePath,
        affectedPaths: [filePath],
        gitManagedPaths,
        operationType: 'update',
        currentUser });
    }
    if (this.isMarkdownPath(filePath)) {
      await this.accessRequestService.syncDocumentProjection(filePath, toMetadataRecord(result.metadata));
    }
    await this.syncSearchIndex(filePath, 'upsert');
    return result;
  }

  private async createFile(
    nameOrPath: string,
    parent = '',
    content: string | undefined,
    currentUser: TokenPayload,
  ) {
    const result = await this.unwrap(this.fileCrudService.create(nameOrPath, parent, content, currentUser));
    const gitManagedPaths = this.resolveGitManagedMutationPaths([result.savedPath]);
    if (gitManagedPaths.length > 0) {
      this.collaborationService.noteMutation({
        primaryPath: result.savedPath,
        affectedPaths: [result.savedPath],
        gitManagedPaths,
        operationType: 'create',
        currentUser });
    }
    if (this.isMarkdownPath(result.savedPath)) {
      await this.accessRequestService.syncDocumentProjection(result.savedPath, toMetadataRecord(result.metadata));
    }
    await this.syncSearchIndex(result.savedPath, 'upsert');
    return result;
  }

  private async renameFile(
    oldPath: string,
    newPath: string,
    currentUser: TokenPayload,
    options?: { autoNumber?: boolean },
  ) {
    this.collaborationService.assertMutationAllowed({ action: 'rename', paths: [oldPath, newPath] });
    const previousGitManagedPaths = this.resolveGitManagedMutationPaths([oldPath]);
    const result = await this.unwrap(this.fileCrudService.rename(oldPath, newPath, currentUser, options));
    if (result.finalPath) {
      const nextGitManagedPaths = this.resolveGitManagedMutationPaths([result.finalPath]);
      const gitManagedPaths = Array.from(new Set([...previousGitManagedPaths, ...nextGitManagedPaths]));
      if (gitManagedPaths.length > 0) {
        this.collaborationService.noteMutation({
          primaryPath: result.finalPath,
          affectedPaths: [oldPath, result.finalPath],
          gitManagedPaths,
          operationType: 'rename',
          currentUser });
      }
      if (this.isMarkdownPath(oldPath) || this.isMarkdownPath(result.finalPath)) {
        await this.accessRequestService.moveDocumentProjection(
          oldPath,
          result.finalPath,
          toMetadataRecord(result.metadata),
        );
      } else if (this.shouldForceControlPlaneResync(oldPath) || this.shouldForceControlPlaneResync(result.finalPath)) {
        await this.accessRequestService.ensureRepoControlPlaneSynced(true);
      }
      await this.syncSearchIndex(result.finalPath, 'upsert', oldPath);
    }
    return result;
  }

  private async deleteFile(filePath: string, currentUser: TokenPayload) {
    this.collaborationService.assertMutationAllowed({ action: 'delete', paths: [filePath] });
    const gitManagedPaths = this.resolveGitManagedMutationPaths([filePath]);
    const result = await this.unwrap(this.fileCrudService.remove(filePath, currentUser));
    if (gitManagedPaths.length > 0) {
      this.collaborationService.noteMutation({
        primaryPath: filePath,
        affectedPaths: [filePath],
        gitManagedPaths,
        operationType: 'delete',
        currentUser });
    }
    if (this.shouldForceControlPlaneResync(filePath)) {
      await this.accessRequestService.ensureRepoControlPlaneSynced(true);
    }
    await this.syncSearchIndex(filePath, 'delete');
    return result;
  }

  private async updateDocumentMetadata(
    filePath: string,
    update: Partial<DocumentMetadata>,
    currentUser: TokenPayload,
    options?: { expectedRevisionSeq?: number },
  ) {
    const { targetPath, valid, safeRelPath } = this.fileCrudService.resolveFilePath(filePath);
    if (!valid) {
      throw new BadRequestException('Invalid path');
    }
    if (!fs.existsSync(targetPath)) {
      throw new NotFoundException('File not found');
    }

    this.collaborationService.assertMutationAllowed({ action: 'updateMetadata', paths: [filePath] });
    this.documentAclService.assertCanManageAbsolutePath(currentUser, targetPath);
    const projectedMetadata = await this.documentControlPlaneService.getProjectedMetadataByRelativePath(safeRelPath);
    const existing = projectedMetadata
      ?? contentService.buildDefaultDocumentMetadata(
        fs.readFileSync(targetPath, 'utf-8'),
        targetPath,
        undefined,
        { defaultRevisionSeq: 0 },
      ) as unknown as DocumentMetadata;

    const currentRevisionSeq = typeof existing.revisionSeq === 'number' ? existing.revisionSeq : 0;
    if (
      options?.expectedRevisionSeq !== undefined
      && currentRevisionSeq !== options.expectedRevisionSeq
    ) {
      throw new HttpException({
        error: 'Document conflict',
        details: {
          expectedRevisionSeq: options.expectedRevisionSeq,
          currentRevisionSeq } }, 409);
    }

    const merged: DocumentMetadata = {
      ...existing,
      ...update,
      updatedAt: new Date().toISOString(),
      revisionSeq: currentRevisionSeq + 1,
      lastModifiedBy: currentUser.loginId };
    this.collaborationService.noteMutation({
      primaryPath: filePath,
      affectedPaths: [filePath],
      gitManagedPaths: [filePath],
      operationType: 'metadata',
      currentUser });
    await this.accessRequestService.syncDocumentProjection(filePath, toMetadataRecord(merged));
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
        action });
    } catch (error) {
      // 검색 인덱스 동기화 실패는 파일 저장 흐름을 차단하지 않음.
      // 임베딩 미설정 등 부가 기능 결함은 keyword 폴백/재시도로 자연 회복되도록 silent warning.
      logger.warn('파일 저장 후 검색 인덱스 동기화 실패 (사용자 흐름 미차단)', {
        targetPath,
        action,
        previousPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async unwrap<T>(
    result: Promise<
      { success: true; data: T }
      | { success: false; error: string; status: number; details?: Record<string, unknown> }
    >,
  ) {
    return this.unwrapSync(await result);
  }

  private unwrapSync<T>(
    result:
      | { success: true; data: T }
      | { success: false; error: string; status: number; details?: Record<string, unknown> },
  ) {
    if (result.success) {
      return result.data;
    }

    switch (result.status) {
      case 400:
        throw new BadRequestException(result.error);
      case 404:
        throw new NotFoundException(result.error);
      case 403:
        throw new ForbiddenException(result.error);
      case 409:
        throw new HttpException({
          error: result.error,
          details: result.details }, 409);
      default:
        throw new BadRequestException(result.error);
    }
  }

  private withIsolationOnFilePayload<
    T extends { metadata?: { document?: DocumentMetadata } },
  >(filePath: string, payload: T): T {
    const documentPath = payload.metadata?.document?.relativePath ?? filePath;
    const isolation = this.collaborationService.getPathIsolation(documentPath);
    if (!payload.metadata?.document || !isolation) {
      return payload;
    }

    return {
      ...payload,
      metadata: {
        ...payload.metadata,
        document: {
          ...payload.metadata.document,
          isolation } } };
  }
}
