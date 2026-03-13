import fs from 'fs';
import path from 'path';
import { normalizePath } from '@/server/utils/pathUtils';
import { configService } from '@/server/services/config/ConfigService';
import { isMarkdownFile } from '@/lib/utils/fileUtils';
import { logger } from '@/lib/utils/errorUtils';
import type { FileNode } from '@/types/file-tree';

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
  return configService.getWikiDir();
}

function readSidecarTitle(mdFullPath: string): string | undefined {
  const parsed = path.parse(mdFullPath);
  const sidecarPath = path.join(parsed.dir, `${parsed.name}.sidecar.json`);
  try {
    if (!fs.existsSync(sidecarPath)) return undefined;
    const raw = fs.readFileSync(sidecarPath, 'utf-8');
    const meta = JSON.parse(raw) as { title?: string };
    return meta.title || undefined;
  } catch {
    return undefined;
  }
}

class FileSystemService {
  private readDirectory(dirPath: string, rootDir: string, includeHidden: boolean): FileNode[] {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    return entries
      .filter((entry) => includeHidden || !entry.name.startsWith('.'))
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
          const title = readSidecarTitle(fullPath);
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
