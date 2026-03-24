/**
 * Files Handler - 파일 트리 조회 API facade
 */

import { PerformanceTimer } from '@/lib/utils/errorUtils';
import { fileSystemService } from '@/server/services/fileSystem/FileSystemService';
import type { AppResult } from '@/server/shared/result';
import type { FileNode } from '@/types/file-tree';

export async function getFileTree(): Promise<AppResult<FileNode[]>> {
  const timer = new PerformanceTimer('Handler: 파일 트리 조회');

  try {
    return await fileSystemService.getFileTree();
  } finally {
    timer.end();
  }
}
