import fs from 'fs';
import path from 'path';
import { normalizeMarkdownFileName, isMarkdownFile } from '@/lib/utils/fileUtils';
import { logger } from '@/lib/utils/errorUtils';
import { configService } from '@/server/services/config/ConfigService';
import { documentMetadataService } from '@/server/services/documentMetadata/DocumentMetadataService';
import type { DocumentMetadata } from '@/types/document-metadata';

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
  | { success: false; error: string; status: number };

function getRootDir(): string {
  return configService.getWikiDir();
}

class FileCrudService {
  private findFileByName(rootDir: string, fileName: string): string | null {
    const normalizedFileName = normalizeMarkdownFileName(fileName);

    try {
      const entries = fs.readdirSync(rootDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(rootDir, entry.name);
        if (entry.isDirectory()) {
          const found = this.findFileByName(fullPath, fileName);
          if (found) return found;
        } else if (entry.isFile()) {
          const entryNormalized = normalizeMarkdownFileName(entry.name);
          if (entryNormalized === normalizedFileName) {
            return fullPath;
          }
        }
      }
    } catch (error) {
      logger.warn('디렉터리 접근 실패', error instanceof Error ? { message: error.message } : undefined);
    }

    return null;
  }

  resolveFilePath(filePath: string): { targetPath: string; valid: boolean; safeRelPath: string } {
    const safeRelPath = path.normalize(filePath).replace(/^\/+/, '');
    const rootDir = getRootDir();
    const targetPath = path.join(rootDir, safeRelPath);
    const valid = targetPath.startsWith(rootDir);
    return { targetPath, valid, safeRelPath };
  }

  getFileMetadata(filePath: string): FileStatMetadata {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      createdAt: stats.birthtime.toISOString(),
      modifiedAt: stats.mtime.toISOString(),
      accessedAt: stats.atime.toISOString(),
    };
  }

  async read(filePath: string): Promise<FileCrudResult<FileData>> {
    const { targetPath, valid, safeRelPath } = this.resolveFilePath(filePath);

    if (!valid) {
      logger.warn('루트 디렉터리 범위를 벗어나는 경로 요청 차단', { filePath, targetPath });
      return { success: false, error: 'Invalid path', status: 400 };
    }

    let finalPath = targetPath;
    const isBareFileName = !safeRelPath.includes(path.sep);

    if (!fs.existsSync(finalPath) && isBareFileName) {
      const found = this.findFileByName(getRootDir(), safeRelPath);
      if (found) {
        finalPath = found;
        logger.info('파일명만으로 일치 파일을 발견', { requested: safeRelPath, resolved: finalPath });
      }
    }

    if (!fs.existsSync(finalPath)) {
      logger.warn('요청된 파일이 존재하지 않음', { filePath, finalPath });
      return { success: false, error: 'File not found', status: 404 };
    }

    try {
      const content = fs.readFileSync(finalPath, 'utf-8');
      const metadata = this.getFileMetadata(finalPath);
      if (isMarkdownFile(finalPath)) {
        metadata.document = documentMetadataService.ensureDocumentMetadata(content, finalPath, metadata);
      }
      return { success: true, data: { content, metadata } };
    } catch (error) {
      logger.error('파일 읽기 실패', error, { filePath, finalPath });
      return { success: false, error: 'Failed to read file', status: 500 };
    }
  }

  async readMetadata(filePath: string): Promise<FileCrudResult<{ metadata: FileStatMetadata }>> {
    const { targetPath, valid } = this.resolveFilePath(filePath);

    if (!valid) return { success: false, error: 'Invalid path', status: 400 };
    if (!fs.existsSync(targetPath)) return { success: false, error: 'File not found', status: 404 };

    try {
      const metadata = this.getFileMetadata(targetPath);
      if (isMarkdownFile(targetPath)) {
        const content = fs.readFileSync(targetPath, 'utf-8');
        metadata.document = documentMetadataService.ensureDocumentMetadata(content, targetPath, metadata);
      }
      return { success: true, data: { metadata } };
    } catch (error) {
      logger.error('메타데이터 조회 실패', error, { filePath, targetPath });
      return { success: false, error: 'Failed to read metadata', status: 500 };
    }
  }

  async write(filePath: string, content: string): Promise<FileCrudResult<{ message: string }>> {
    const { targetPath, valid } = this.resolveFilePath(filePath);

    if (!valid) return { success: false, error: 'Invalid path', status: 400 };

    try {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, content, 'utf-8');

      if (isMarkdownFile(targetPath)) {
        const fileMeta = this.getFileMetadata(targetPath);
        const existing = documentMetadataService.readDocumentMetadata(targetPath) ?? undefined;
        const metadata = documentMetadataService.buildDefaultDocumentMetadata(content, targetPath, fileMeta, existing);
        documentMetadataService.writeDocumentMetadata(targetPath, metadata);
      }

      return { success: true, data: { message: 'File saved' } };
    } catch (error) {
      logger.error('파일 쓰기 실패', error, { filePath, targetPath });
      return { success: false, error: 'Failed to write file', status: 500 };
    }
  }

  async create(nameOrPath: string, parent = '', content?: string): Promise<FileCrudResult<{ message: string }>> {
    const parsedPath = path.parse(nameOrPath);
    const resolvedParent = parent.length > 0 ? parent : parsedPath.dir;
    const resolvedName = normalizeMarkdownFileName(parsedPath.base || nameOrPath);
    const normalizedPath = resolvedParent.length > 0 ? path.join(resolvedParent, resolvedName) : resolvedName;
    const targetPath = path.join(getRootDir(), normalizedPath);

    if (!targetPath.startsWith(getRootDir())) {
      return { success: false, error: 'Invalid path', status: 400 };
    }
    if (fs.existsSync(targetPath)) {
      return { success: false, error: 'File already exists', status: 409 };
    }

    try {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      const title = path.parse(targetPath).name;
      const newContent = content || `# ${title}\n\n내용을 작성하세요.`;
      fs.writeFileSync(targetPath, newContent, 'utf-8');

      const fileMeta = this.getFileMetadata(targetPath);
      const metadata = documentMetadataService.buildDefaultDocumentMetadata(newContent, targetPath, fileMeta, undefined);
      documentMetadataService.writeDocumentMetadata(targetPath, metadata);

      return { success: true, data: { message: 'File created' } };
    } catch (error) {
      logger.error('파일 생성 실패', error, { nameOrPath, parent, targetPath });
      return { success: false, error: 'Failed to create file', status: 500 };
    }
  }

  async createFolder(name: string, parent = '', filePath?: string): Promise<FileCrudResult<{ message: string }>> {
    const folderPath = filePath
      ? path.join(getRootDir(), filePath)
      : path.join(getRootDir(), parent, name);

    if (!folderPath.startsWith(getRootDir())) {
      return { success: false, error: 'Invalid path', status: 400 };
    }
    if (fs.existsSync(folderPath)) {
      return { success: false, error: 'Folder already exists', status: 409 };
    }

    try {
      fs.mkdirSync(folderPath, { recursive: true });
      return { success: true, data: { message: 'Folder created' } };
    } catch (error) {
      logger.error('폴더 생성 실패', error, { folderPath });
      return { success: false, error: 'Failed to create folder', status: 500 };
    }
  }

  async rename(oldPath: string, newPath: string): Promise<FileCrudResult<{ message: string }>> {
    const oldFullPath = path.join(getRootDir(), oldPath);
    const newFullPath = path.join(getRootDir(), newPath);

    if (!oldFullPath.startsWith(getRootDir()) || !newFullPath.startsWith(getRootDir())) {
      return { success: false, error: 'Invalid path', status: 400 };
    }
    if (!fs.existsSync(oldFullPath)) {
      return { success: false, error: 'File not found', status: 404 };
    }
    if (fs.existsSync(newFullPath)) {
      return { success: false, error: 'Target already exists', status: 409 };
    }

    try {
      fs.mkdirSync(path.dirname(newFullPath), { recursive: true });
      fs.renameSync(oldFullPath, newFullPath);

      const oldMetaPath = documentMetadataService.getDocumentMetadataPath(oldFullPath);
      const newMetaPath = documentMetadataService.getDocumentMetadataPath(newFullPath);
      if (fs.existsSync(oldMetaPath)) {
        fs.renameSync(oldMetaPath, newMetaPath);
      }

      return { success: true, data: { message: 'File/Folder renamed successfully' } };
    } catch (error) {
      logger.error('파일/폴더 이름 변경 실패', error, { oldPath, newPath, oldFullPath, newFullPath });
      return {
        success: false,
        error: `Rename failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 500,
      };
    }
  }

  async remove(filePath: string): Promise<FileCrudResult<{ message: string }>> {
    const { targetPath, valid } = this.resolveFilePath(filePath);

    if (!valid) return { success: false, error: 'Invalid path', status: 400 };
    if (!fs.existsSync(targetPath)) return { success: true, data: { message: 'File/Folder deleted' } };

    try {
      const stats = fs.statSync(targetPath);
      if (stats.isDirectory()) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(targetPath);
        const metaPath = documentMetadataService.getDocumentMetadataPath(targetPath);
        if (fs.existsSync(metaPath)) {
          fs.unlinkSync(metaPath);
        }
      }

      return { success: true, data: { message: 'File/Folder deleted' } };
    } catch (error) {
      logger.error('파일/폴더 삭제 실패', error, { filePath, targetPath });
      return { success: false, error: 'Failed to delete file/folder', status: 500 };
    }
  }
}

export const fileCrudService = new FileCrudService();
