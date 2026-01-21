/**
 * 파일 시스템 서비스
 */

import type { FileNode } from '@/types';
import type {
  ServiceResult,
  CreateFileOptions,
  ReadFileOptions,
  UpdateFileOptions,
  DeleteFileOptions,
  CreateFolderOptions,
  RenameOptions,
  GetTreeOptions,
  SearchOptions
} from '../types/ServiceTypes';
import { BaseService } from '../base/BaseService';

export class FileSystemService extends BaseService {
  constructor() {
    super('FileSystemService', {
      apiTimeout: 30000,
      retryAttempts: 2,
      enableLogging: true,
      enableCaching: true,
      cacheTimeout: 300000, // 5분
    });
  }

  /**
   * 파일 트리 조회
   */
  async getFileTree(path?: string, options: GetTreeOptions = {}): Promise<ServiceResult<FileNode[]>> {
    try {
      this.log('info', `Getting file tree for path: ${path || 'root'}`);
      
      // 기존 API 클라이언트 사용 (일관된 응답 형식 보장)
      const response = await this.withTimeout(
        fetch('/api/files', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // API는 직접 배열을 반환하므로 바로 사용
      const data = await response.json();
      let files = Array.isArray(data) ? data : [];
      
      if (!options.includeHidden) {
        files = files.filter((file: FileNode) => !file.name.startsWith('.'));
      }
      
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

  /**
   * 파일 내용 읽기
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async readFile(path: string, _options: ReadFileOptions = {}): Promise<ServiceResult<string>> {
    try {
      this.log('info', `Reading file: ${path}`);
      
      const response = await this.withTimeout(
        fetch(`/api/file?path=${encodeURIComponent(path)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      this.log('info', `Successfully read file: ${path}`);
      return this.success(data.content);
      
    } catch (error) {
      this.log('error', `Failed to read file: ${path}`, error);
      return this.failure(error as Error, 'READ_FILE_ERROR');
    }
  }

  /**
   * 파일 생성
   */
  async createFile(
    path: string, 
    content: string, 
    options: CreateFileOptions = {}
  ): Promise<ServiceResult<FileNode>> {
    try {
      this.log('info', `Creating file: ${path}`);
      
      const response = await this.withTimeout(
        fetch('/api/file', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path,
            content,
            options,
          }),
        })
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // 파일 생성 이벤트 발행
      this.emitEvent('fileCreated', {
        path,
        node: data.file,
      });
      
      this.log('info', `Successfully created file: ${path}`);
      return this.success(data.file);
      
    } catch (error) {
      this.log('error', `Failed to create file: ${path}`, error);
      return this.failure(error as Error, 'CREATE_FILE_ERROR');
    }
  }

  /**
   * 파일 업데이트
   */
  async updateFile(
    path: string, 
    content: string, 
    options: UpdateFileOptions = {}
  ): Promise<ServiceResult<FileNode>> {
    try {
      this.log('info', `Updating file: ${path}`);
      
      const response = await this.withTimeout(
        fetch('/api/file', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path,
            content,
            options,
          }),
        })
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // 파일 업데이트 이벤트 발행
      this.emitEvent('fileUpdated', {
        path,
        node: data.file,
      });
      
      this.log('info', `Successfully updated file: ${path}`);
      return this.success(data.file);
      
    } catch (error) {
      this.log('error', `Failed to update file: ${path}`, error);
      return this.failure(error as Error, 'UPDATE_FILE_ERROR');
    }
  }

  /**
   * 파일 삭제
   */
  async deleteFile(path: string, options: DeleteFileOptions = {}): Promise<ServiceResult<void>> {
    try {
      this.log('info', `Deleting file: ${path}`);
      
      const response = await this.withTimeout(
        fetch(`/api/file?path=${encodeURIComponent(path)}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ options }),
        })
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // 파일 삭제 이벤트 발행
      this.emitEvent('fileDeleted', { path });
      
      this.log('info', `Successfully deleted file: ${path}`);
      return this.success(undefined);
      
    } catch (error) {
      this.log('error', `Failed to delete file: ${path}`, error);
      return this.failure(error as Error, 'DELETE_FILE_ERROR');
    }
  }

  /**
   * 폴더 생성
   */
  async createFolder(path: string, options: CreateFolderOptions = {}): Promise<ServiceResult<FileNode>> {
    try {
      this.log('info', `Creating folder: ${path}`);
      
      const response = await this.withTimeout(
        fetch('/api/folder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path,
            options,
          }),
        })
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // 폴더 생성 이벤트 발행
      this.emitEvent('directoryCreated', {
        path,
        node: data.folder,
      });
      
      this.log('info', `Successfully created folder: ${path}`);
      return this.success(data.folder);
      
    } catch (error) {
      this.log('error', `Failed to create folder: ${path}`, error);
      return this.failure(error as Error, 'CREATE_FOLDER_ERROR');
    }
  }

  /**
   * 파일/폴더 이름 변경
   */
  async rename(
    oldPath: string, 
    newPath: string, 
    options: RenameOptions = {}
  ): Promise<ServiceResult<FileNode>> {
    try {
      this.log('info', `Renaming: ${oldPath} -> ${newPath}`);
      
      const response = await this.withTimeout(
        fetch('/api/rename', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            oldPath,
            newPath,
            options,
          }),
        })
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // 파일 이름변경 이벤트 발행
      this.emitEvent('fileRenamed', {
        oldPath,
        newPath,
        node: data.file,
      });
      
      this.log('info', `Successfully renamed: ${oldPath} -> ${newPath}`);
      return this.success(data.file);
      
    } catch (error) {
      this.log('error', `Failed to rename: ${oldPath} -> ${newPath}`, error);
      return this.failure(error as Error, 'RENAME_ERROR');
    }
  }

  /**
   * 파일 검색
   */
  async searchFiles(
    query: string, 
    options: SearchOptions = {}
  ): Promise<ServiceResult<FileNode[]>> {
    try {
      this.log('info', `Searching files with query: ${query}`);
      
      const searchParams = new URLSearchParams({
        q: query,
        caseSensitive: String(options.caseSensitive || false),
        includeContent: String(options.includeContent || false),
      });
      
      if (options.fileTypes && options.fileTypes.length > 0) {
        searchParams.append('fileTypes', options.fileTypes.join(','));
      }
      
      const response = await this.withTimeout(
        fetch(`/api/search?${searchParams}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      this.log('info', `Found ${data.results?.length || 0} files matching query: ${query}`);
      return this.success(data.results || []);
      
    } catch (error) {
      this.log('error', `Failed to search files with query: ${query}`, error);
      return this.failure(error as Error, 'SEARCH_ERROR');
    }
  }
}

// 싱글톤 인스턴스 생성
export const fileSystemService = new FileSystemService();