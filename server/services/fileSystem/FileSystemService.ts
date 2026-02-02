/**
 * 파일 시스템 서비스
 * - 실제 사용: getFileTree만 사용 (file.store.ts에서 호출)
 */

import type { FileNode } from '@/types';

/** 서비스 결과 타입 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

/** 파일 트리 조회 옵션 */
export interface GetTreeOptions {
  includeHidden?: boolean;
  sortBy?: 'name' | 'type' | 'date';
  sortOrder?: 'asc' | 'desc';
}

class FileSystemService {
  private readonly name = 'FileSystemService';

  /**
   * 로그 출력
   */
  private log(level: 'info' | 'error', message: string, error?: unknown): void {
    const prefix = `[${this.name}]`;
    if (level === 'error') {
      console.error(prefix, message, error);
    } else {
      console.log(prefix, message);
    }
  }

  /**
   * 성공 결과 생성
   */
  private success<T>(data: T): ServiceResult<T> {
    return { success: true, data };
  }

  /**
   * 실패 결과 생성
   */
  private failure<T>(error: Error, code?: string): ServiceResult<T> {
    return {
      success: false,
      error: {
        message: error.message,
        code,
      },
    };
  }

  /**
   * 파일 트리 조회
   */
  async getFileTree(path?: string, options: GetTreeOptions = {}): Promise<ServiceResult<FileNode[]>> {
    try {
      this.log('info', `Getting file tree for path: ${path || 'root'}`);

      const response = await fetch('/api/files', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // API는 직접 배열을 반환
      const data = await response.json();
      let files = Array.isArray(data) ? data : [];

      // 숨김 파일 필터링
      if (!options.includeHidden) {
        files = files.filter((file: FileNode) => !file.name.startsWith('.'));
      }

      // 정렬
      if (options.sortBy) {
        files.sort((a: FileNode, b: FileNode) => {
          const order = options.sortOrder === 'desc' ? -1 : 1;

          switch (options.sortBy) {
            case 'name':
              return a.name.localeCompare(b.name) * order;
            case 'type':
              return (a.type === b.type ? 0 : a.type === 'directory' ? -1 : 1) * order;
            case 'date':
              const aDate = new Date(a.lastModified || 0);
              const bDate = new Date(b.lastModified || 0);
              return (aDate.getTime() - bDate.getTime()) * order;
            default:
              return 0;
          }
        });
      }

      this.log('info', `Successfully retrieved ${files.length} files`);
      return this.success(files);
    } catch (error) {
      this.log('error', 'Failed to get file tree', error);
      return this.failure(error as Error, 'GET_TREE_ERROR');
    }
  }
}

// 싱글톤 인스턴스
export const fileSystemService = new FileSystemService();