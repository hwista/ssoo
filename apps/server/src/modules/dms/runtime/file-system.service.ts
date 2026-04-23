import fs from 'fs';
import path from 'path';
import { normalizePath } from './path-utils.js';
import { configService } from './dms-config.service.js';
import { isMarkdownFile } from './file-utils.js';
import { createDmsLogger } from './dms-logger.js';
import type { FileNode } from '@ssoo/types/dms';

const logger = createDmsLogger('DmsFileSystemService');

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface GetTreeOptions {
  includeHidden?: boolean;
}

function getRootDir(): string {
  return configService.getDocDir();
}

function extractMarkdownTitle(mdFullPath: string): string | undefined {
  try {
    const content = fs.readFileSync(mdFullPath, 'utf-8');
    const headingMatch = content.match(/^#\s+(.+)$/m);
    return headingMatch?.[1]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

class FileSystemService {
  private readDirectory(dirPath: string, rootDir: string, includeHidden: boolean): FileNode[] {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    return entries
      .filter((entry) => includeHidden || (!entry.name.startsWith('.') && !entry.name.startsWith('_')))
      .map<FileNode | null>((entry) => {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = normalizePath(path.relative(rootDir, fullPath));

        if (entry.isDirectory()) {
          return {
            type: 'directory' as const,
            name: entry.name,
            path: relativePath,
            children: this.readDirectory(fullPath, rootDir, includeHidden),
          };
        }

        if (entry.isFile() && isMarkdownFile(entry.name)) {
          const title = extractMarkdownTitle(fullPath);
          return {
            type: 'file' as const,
            name: entry.name,
            path: relativePath,
            ...(title ? { title } : {}),
          };
        }

        return null;
      })
      .filter((item): item is FileNode => item !== null);
  }

  async getFileTree(options: GetTreeOptions = {}): Promise<ServiceResult<FileNode[]>> {
    const rootDir = getRootDir();

    try {
      if (!fs.existsSync(rootDir)) {
        logger.warn('파일 트리 루트 디렉터리가 존재하지 않음', { rootDir });
        return { success: true, data: [] };
      }

      const rootStats = fs.statSync(rootDir);
      if (!rootStats.isDirectory()) {
        logger.warn('파일 트리 루트 경로가 디렉터리가 아님', { rootDir });
        return { success: true, data: [] };
      }

      const data = this.readDirectory(rootDir, rootDir, options.includeHidden ?? false);
      return { success: true, data };
    } catch (error) {
      logger.error('파일 트리 조회 실패', error, { rootDir });
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : '파일 트리 조회에 실패했습니다.',
          code: 'FILE_TREE_READ_FAILED',
        },
      };
    }
  }
}

export const fileSystemService = new FileSystemService();
