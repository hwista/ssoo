/**
 * File Handler - 단일 파일 CRUD 작업을 담당하는 핸들러
 * Route: /api/file
 */

import { PerformanceTimer } from "@/lib/utils/errorUtils";
import { documentMetadataService } from '@/server/services/documentMetadata/DocumentMetadataService';
import {
  fileCrudService,
  type FileData,
  type FileStatMetadata,
} from '@/server/services/file/FileCrudService';
import { fail, type AppResult } from '@/server/shared/result';
import type { DocumentMetadata } from '@/types/document-metadata';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Handlers
// ============================================================================

/**
 * GET: 파일 읽기
 */
export async function readFile(filePath: string): Promise<AppResult<FileData>> {
  const timer = new PerformanceTimer('Handler: 파일 읽기');
  try {
    return await fileCrudService.read(filePath);
  } finally {
    timer.end({ filePath });
  }
}

/**
 * 메타데이터만 조회
 */
export async function getMetadata(filePath: string): Promise<AppResult<{ metadata: FileStatMetadata }>> {
  return fileCrudService.readMetadata(filePath);
}

/**
 * 파일 쓰기 (수정)
 */
export async function writeFile(filePath: string, content: string): Promise<AppResult<{ message: string }>> {
  return fileCrudService.write(filePath, content);
}

/**
 * 새 파일 생성
 */
export async function createFile(
  nameOrPath: string,
  parent: string = "",
  content?: string
): Promise<AppResult<{ message: string }>> {
  return fileCrudService.create(nameOrPath, parent, content);
}

/**
 * 폴더 생성
 */
export async function createFolder(
  name: string,
  parent: string = "",
  filePath?: string
): Promise<AppResult<{ message: string }>> {
  return fileCrudService.createFolder(name, parent, filePath);
}

/**
 * 파일/폴더 이름 변경
 */
export async function renameFile(
  oldPath: string,
  newPath: string,
  options?: { autoNumber?: boolean }
): Promise<AppResult<{ message: string; finalPath?: string }>> {
  return fileCrudService.rename(oldPath, newPath, options);
}

/**
 * 파일/폴더 삭제
 */
export async function deleteFile(filePath: string): Promise<AppResult<{ message: string }>> {
  return fileCrudService.remove(filePath);
}

/**
 * POST 액션 라우터 - route.ts에서 사용
 */
export async function handleFileAction(body: FileActionBody): Promise<AppResult<unknown>> {
  const { action, path: filePath, content, name, parent = "", oldPath, newPath, autoNumber, metadata: metadataUpdate } = body;

  switch (action) {
    case "read":
      if (!filePath) return fail("Missing file path", 400);
      return readFile(filePath);

    case "metadata":
      if (!filePath) return fail("Missing file path", 400);
      return getMetadata(filePath);

    case "write":
      if (!filePath || content === undefined) {
        return fail("Missing file path or content", 400);
      }
      return writeFile(filePath, content);

    case "create":
      if (!filePath && !name) return fail("Missing file path or name", 400);
      return createFile(filePath || name || "", parent, content);

    case "createFolder":
    case "mkdir":
      if (!filePath && !name) return fail("Missing path or name", 400);
      return createFolder(name || "", parent, filePath);

    case "rename":
      if (!oldPath || !newPath) {
        return fail("Missing oldPath or newPath", 400);
      }
      return renameFile(oldPath, newPath, { autoNumber });

    case "delete":
      if (!filePath) return fail("Missing file path", 400);
      return deleteFile(filePath);

    case "updateMetadata":
      if (!filePath) return fail("Missing file path", 400);
      if (!metadataUpdate) return fail("Missing metadata", 400);
      return documentMetadataService.updateMetadata(fileCrudService.resolveFilePath(filePath).targetPath, metadataUpdate);

    default:
      return fail("Invalid action", 400);
  }
}
