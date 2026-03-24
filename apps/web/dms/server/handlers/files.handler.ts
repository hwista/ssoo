/**
 * Files Handler - 파일 트리 조회 API facade
 */

import { PerformanceTimer } from '@/lib/utils/errorUtils';
import { fileSystemService } from '@/server/services/fileSystem/FileSystemService';
import type { FileNode } from '@/types/file-tree';

export async function getFileTree(): Promise<{
  success: boolean;
  data?: FileNode[];
  error?: string;
}> {
  const timer = new PerformanceTimer('Handler: 파일 트리 조회');

  try {
    const result = await fileSystemService.getFileTree();
    if (!result.success) {
      return {
        success: false,
        error: result.error?.message ?? '파일 트리 조회에 실패했습니다.',
      };
    }

    return { success: true, data: result.data ?? [] };
  } finally {
    timer.end();
  }
}
