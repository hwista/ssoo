import fs from 'fs';
import path from 'path';
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { DocumentMetadata } from '@ssoo/types/dms';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { DocumentAclService } from '../access/document-acl.service.js';
import { createDmsLogger } from '../runtime/dms-logger.js';
import { normalizeMarkdownFileName, isMarkdownFile } from '../runtime/file-utils.js';
import { configService } from '../runtime/dms-config.service.js';
import { contentService } from '../runtime/content.service.js';
import { resolveContainedPath } from '../runtime/path-utils.js';

const logger = createDmsLogger('DmsFileCrudService');

export interface FileStatMetadata {
  size: number;
  createdAt: string;
  modifiedAt: string;
  accessedAt: string;
  document?: DocumentMetadata;
}

export interface FileData {
  content: string;
  metadata: FileStatMetadata;
}

export type FileCrudResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; status: number; details?: Record<string, unknown> };

function getRootDir(): string {
  return configService.getDocDir();
}

@Injectable()
export class FileCrudService {
  constructor(private readonly documentAclService: DocumentAclService) {}

  private findFileByName(rootDir: string, fileName: string): string | null {
    const normalizedFileName = normalizeMarkdownFileName(fileName);

    try {
      const entries = fs.readdirSync(rootDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(rootDir, entry.name);
        if (entry.isDirectory()) {
          const found = this.findFileByName(fullPath, fileName);
          if (found) {
            return found;
          }
        } else if (entry.isFile() && normalizeMarkdownFileName(entry.name) === normalizedFileName) {
          return fullPath;
        }
      }
    } catch (error) {
      logger.warn('디렉터리 접근 실패', error instanceof Error ? { message: error.message } : undefined);
    }

    return null;
  }

  resolveFilePath(filePath: string): { targetPath: string; valid: boolean; safeRelPath: string } {
    return resolveContainedPath(getRootDir(), filePath);
  }

  private getFileMetadata(filePath: string): FileStatMetadata {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      createdAt: stats.birthtime.toISOString(),
      modifiedAt: stats.mtime.toISOString(),
      accessedAt: stats.atime.toISOString(),
    };
  }

  async read(filePath: string, currentUser: TokenPayload): Promise<FileCrudResult<FileData>> {
    const { targetPath, valid, safeRelPath } = this.resolveFilePath(filePath);

    if (!valid) {
      logger.warn('루트 디렉터리 범위를 벗어나는 경로 요청 차단', { filePath, targetPath });
      return { success: false, error: 'Invalid path', status: 400 };
    }

    let finalPath = targetPath;
    if (!fs.existsSync(finalPath) && !safeRelPath.includes(path.sep)) {
      const found = this.findFileByName(getRootDir(), safeRelPath);
      if (found) {
        finalPath = found;
        logger.info('파일명만으로 일치 파일을 발견', { requested: safeRelPath, resolved: finalPath });
      }
    }

    if (!fs.existsSync(finalPath)) {
      return { success: false, error: 'File not found', status: 404 };
    }

    try {
      this.documentAclService.assertCanReadAbsolutePath(currentUser, finalPath);
      const content = fs.readFileSync(finalPath, 'utf-8');
      const metadata = this.getFileMetadata(finalPath);
      if (isMarkdownFile(finalPath)) {
        const sidecar = contentService.readSidecar(finalPath);
        if (sidecar) {
          metadata.document = sidecar as unknown as DocumentMetadata;
        } else {
          const defaultSidecar = contentService.buildDefaultDocumentSidecar(
            content,
            finalPath,
            undefined,
            { defaultRevisionSeq: 0 },
          );
          contentService.writeSidecar(finalPath, defaultSidecar);
          metadata.document = defaultSidecar as unknown as DocumentMetadata;
        }
      }

      return { success: true, data: { content, metadata } };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return { success: false, error: error.message, status: 403 };
      }

      logger.error('파일 읽기 실패', error, { filePath, finalPath });
      return { success: false, error: 'Failed to read file', status: 500 };
    }
  }

  async readMetadata(
    filePath: string,
    currentUser: TokenPayload,
  ): Promise<FileCrudResult<{ metadata: FileStatMetadata }>> {
    const { targetPath, valid } = this.resolveFilePath(filePath);
    if (!valid) {
      return { success: false, error: 'Invalid path', status: 400 };
    }
    if (!fs.existsSync(targetPath)) {
      return { success: false, error: 'File not found', status: 404 };
    }

    try {
      this.documentAclService.assertCanReadAbsolutePath(currentUser, targetPath);
      const metadata = this.getFileMetadata(targetPath);
      if (isMarkdownFile(targetPath)) {
        const content = fs.readFileSync(targetPath, 'utf-8');
        const sidecar = contentService.readSidecar(targetPath);
        if (sidecar) {
          metadata.document = sidecar as unknown as DocumentMetadata;
        } else {
          const defaultSidecar = contentService.buildDefaultDocumentSidecar(
            content,
            targetPath,
            undefined,
            { defaultRevisionSeq: 0 },
          );
          contentService.writeSidecar(targetPath, defaultSidecar);
          metadata.document = defaultSidecar as unknown as DocumentMetadata;
        }
      }

      return { success: true, data: { metadata } };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return { success: false, error: error.message, status: 403 };
      }

      logger.error('메타데이터 조회 실패', error, { filePath, targetPath });
      return { success: false, error: 'Failed to read metadata', status: 500 };
    }
  }

  async write(
    filePath: string,
    content: string,
    currentUser: TokenPayload,
    options?: { expectedRevisionSeq?: number },
  ): Promise<FileCrudResult<{ message: string; metadata?: DocumentMetadata }>> {
    const { targetPath, valid, safeRelPath } = this.resolveFilePath(filePath);
    if (!valid) {
      return { success: false, error: 'Invalid path', status: 400 };
    }

    try {
      const existedBeforeWrite = fs.existsSync(targetPath);
      if (!isMarkdownFile(targetPath)) {
        if (!existedBeforeWrite) {
          return {
            success: false,
            error: 'Direct non-markdown writes are not allowed',
            status: 403,
          };
        }

        this.documentAclService.assertCanWriteAbsolutePath(currentUser, targetPath);
      } else if (existedBeforeWrite) {
        this.documentAclService.assertCanWriteAbsolutePath(currentUser, targetPath);
      }

      if (isMarkdownFile(targetPath)) {
        const existingSidecar = contentService.readSidecar(targetPath) ?? (
          existedBeforeWrite
            ? undefined
            : {
                acl: this.documentAclService.buildOwnerAcl(currentUser),
                author: currentUser.loginId,
                lastModifiedBy: currentUser.loginId,
                ownerId: currentUser.userId,
                ownerLoginId: currentUser.loginId,
                visibility: { scope: 'self' },
              }
        );
        const result = contentService.save(
          safeRelPath,
          content,
          {
            ...(existingSidecar ?? {}),
            lastModifiedBy: currentUser.loginId,
          },
          { expectedRevisionSeq: options?.expectedRevisionSeq },
        );

        if (!result.success) {
          return {
            success: false,
            error: result.error ?? 'Failed to write file',
            status: result.status ?? 500,
            details: result.details,
          };
        }

        return {
          success: true,
          data: {
            message: 'File saved',
            metadata: result.data?.metadata as DocumentMetadata | undefined,
          },
        };
      }

      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, content, 'utf-8');
      return { success: true, data: { message: 'File saved' } };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return { success: false, error: error.message, status: 403 };
      }

      logger.error('파일 쓰기 실패', error, { filePath, targetPath });
      return { success: false, error: 'Failed to write file', status: 500 };
    }
  }

  async create(
    nameOrPath: string,
    parent = '',
    content: string | undefined,
    currentUser: TokenPayload,
  ): Promise<FileCrudResult<{ message: string; savedPath: string; metadata?: DocumentMetadata }>> {
    const parsedPath = path.parse(nameOrPath);
    const resolvedParent = parent.length > 0 ? parent : parsedPath.dir;
    const resolvedName = normalizeMarkdownFileName(parsedPath.base || nameOrPath);
    const normalizedPath = resolvedParent.length > 0 ? path.join(resolvedParent, resolvedName) : resolvedName;
    const { targetPath, valid, safeRelPath } = this.resolveFilePath(normalizedPath);

    if (!valid) {
      return { success: false, error: 'Invalid path', status: 400 };
    }
    if (fs.existsSync(targetPath)) {
      return { success: false, error: 'File already exists', status: 409 };
    }

    try {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      const title = path.parse(targetPath).name;
      const nextContent = content || `# ${title}\n\n내용을 작성하세요.`;
      const result = contentService.save(
        safeRelPath,
        nextContent,
        {
          acl: this.documentAclService.buildOwnerAcl(currentUser),
          author: currentUser.loginId,
          lastModifiedBy: currentUser.loginId,
          ownerId: currentUser.userId,
          ownerLoginId: currentUser.loginId,
          visibility: { scope: 'self' },
        },
      );

      if (!result.success) {
        return { success: false, error: result.error ?? 'Failed to create file', status: result.status ?? 500 };
      }

      return {
        success: true,
        data: {
          message: 'File created',
          savedPath: safeRelPath,
          metadata: result.data?.metadata as DocumentMetadata | undefined,
        },
      };
    } catch (error) {
      logger.error('파일 생성 실패', error, { nameOrPath, parent, targetPath });
      return { success: false, error: 'Failed to create file', status: 500 };
    }
  }

  async createFolder(name: string, parent = '', filePath?: string): Promise<FileCrudResult<{ message: string }>> {
    const requestedPath = filePath || path.join(parent, name);
    const { targetPath, valid } = this.resolveFilePath(requestedPath);
    if (!valid) {
      return { success: false, error: 'Invalid path', status: 400 };
    }
    if (fs.existsSync(targetPath)) {
      return { success: false, error: 'Folder already exists', status: 409 };
    }

    try {
      fs.mkdirSync(targetPath, { recursive: true });
      return { success: true, data: { message: 'Folder created' } };
    } catch (error) {
      logger.error('폴더 생성 실패', error, { targetPath });
      return { success: false, error: 'Failed to create folder', status: 500 };
    }
  }

  async rename(
    oldPath: string,
    newPath: string,
    currentUser: TokenPayload,
    options?: { autoNumber?: boolean },
  ): Promise<FileCrudResult<{ message: string; finalPath?: string }>> {
    const previous = this.resolveFilePath(oldPath);
    const next = this.resolveFilePath(newPath);

    if (!previous.valid || !next.valid) {
      return { success: false, error: 'Invalid path', status: 400 };
    }
    if (!fs.existsSync(previous.targetPath)) {
      return { success: false, error: 'File not found', status: 404 };
    }

    let resolvedTargetPath = next.targetPath;
    let resolvedRelPath = next.safeRelPath;
    if (fs.existsSync(next.targetPath)) {
      if (!options?.autoNumber) {
        return { success: false, error: 'Target already exists', status: 409 };
      }

      const dir = path.dirname(next.targetPath);
      const ext = path.extname(next.targetPath);
      const base = path.basename(next.targetPath, ext);
      let index = 1;
      while (fs.existsSync(resolvedTargetPath)) {
        resolvedTargetPath = path.join(dir, `${base} (${index})${ext}`);
        index += 1;
      }
      resolvedRelPath = path.relative(getRootDir(), resolvedTargetPath).replace(/\\/g, '/');
    }

    try {
      this.assertCanManageExistingPath(currentUser, previous.targetPath);
      fs.mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
      fs.renameSync(previous.targetPath, resolvedTargetPath);

      const oldMetaPath = contentService.getSidecarPath(previous.targetPath);
      const newMetaPath = contentService.getSidecarPath(resolvedTargetPath);
      if (fs.existsSync(oldMetaPath)) {
        fs.mkdirSync(path.dirname(newMetaPath), { recursive: true });
        fs.renameSync(oldMetaPath, newMetaPath);
      }

      if (isMarkdownFile(resolvedTargetPath) && fs.existsSync(resolvedTargetPath)) {
        const sidecar = contentService.readSidecar(resolvedTargetPath);
        if (sidecar) {
          const now = new Date().toISOString();
          const currentRevisionSeq = typeof sidecar['revisionSeq'] === 'number'
            ? sidecar['revisionSeq']
            : 0;
          const pathHistory = Array.isArray(sidecar['pathHistory']) ? sidecar['pathHistory'] : [];
          const reason = path.dirname(previous.safeRelPath) === path.dirname(resolvedRelPath) ? 'rename' : 'move';
          contentService.writeSidecar(resolvedTargetPath, {
            ...sidecar,
            relativePath: resolvedRelPath,
            updatedAt: now,
            lastModifiedBy: currentUser.loginId,
            revisionSeq: currentRevisionSeq + 1,
            pathHistory: [
              ...pathHistory,
              {
                path: previous.safeRelPath,
                changedAt: now,
                changedBy: currentUser.loginId,
                reason,
              },
            ],
          });
        }
      }

      return {
        success: true,
        data: {
          message: 'File/Folder renamed successfully',
          finalPath: resolvedRelPath,
        },
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return { success: false, error: error.message, status: 403 };
      }

      logger.error('파일/폴더 이름 변경 실패', error, {
        oldPath,
        newPath,
        oldFullPath: previous.targetPath,
        newFullPath: resolvedTargetPath,
      });
      return {
        success: false,
        error: `Rename failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 500,
      };
    }
  }

  async remove(filePath: string, currentUser: TokenPayload): Promise<FileCrudResult<{ message: string }>> {
    const { targetPath, valid } = this.resolveFilePath(filePath);
    if (!valid) {
      return { success: false, error: 'Invalid path', status: 400 };
    }
    if (!fs.existsSync(targetPath)) {
      return { success: true, data: { message: 'File/Folder deleted' } };
    }

    try {
      this.assertCanManageExistingPath(currentUser, targetPath);
      const stats = fs.statSync(targetPath);
      if (stats.isDirectory()) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(targetPath);
        const metaPath = contentService.getSidecarPath(targetPath);
        if (fs.existsSync(metaPath)) {
          fs.unlinkSync(metaPath);
        }
      }

      return { success: true, data: { message: 'File/Folder deleted' } };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return { success: false, error: error.message, status: 403 };
      }

      logger.error('파일/폴더 삭제 실패', error, { filePath, targetPath });
      return { success: false, error: 'Failed to delete file/folder', status: 500 };
    }
  }

  private assertCanManageExistingPath(currentUser: TokenPayload, targetPath: string): void {
    const stats = fs.statSync(targetPath);
    if (!stats.isDirectory()) {
      this.documentAclService.assertCanManageAbsolutePath(currentUser, targetPath);
      return;
    }

    for (const nestedPath of this.listManagedFilePaths(targetPath)) {
      this.documentAclService.assertCanManageAbsolutePath(currentUser, nestedPath);
    }
  }

  private listManagedFilePaths(targetPath: string): string[] {
    const entries = fs.readdirSync(targetPath, { withFileTypes: true });
    const filePaths: string[] = [];

    for (const entry of entries) {
      const nestedPath = path.join(targetPath, entry.name);
      if (entry.isDirectory()) {
        filePaths.push(...this.listManagedFilePaths(nestedPath));
        continue;
      }

      if (entry.isFile() && !nestedPath.endsWith('.sidecar.json')) {
        filePaths.push(nestedPath);
      }
    }

    return filePaths;
  }
}
