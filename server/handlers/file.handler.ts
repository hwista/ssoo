/**
 * File Handler - 단일 파일 CRUD 작업을 담당하는 핸들러
 * Route: /api/file
 */

import fs from "fs";
import { logger, PerformanceTimer } from "@/lib/utils/errorUtils";
import { documentMetadataService } from '@/server/services/documentMetadata/DocumentMetadataService';
import {
  fileCrudService,
  type FileData,
  type FileStatMetadata,
} from '@/server/services/file/FileCrudService';
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
  metadata?: Partial<DocumentMetadata>;
}

export type HandlerResult<T = unknown> = 
  | { success: true; data: T }
  | { success: false; error: string; status: number };

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * 문서 메타데이터 부분 업데이트
 * - 기존 메타데이터를 읽고, 전달된 필드만 머지하여 저장
 * - comments: 전체 교체 (클라이언트에서 삭제 후 배열 전달)
 */
function updateDocumentMetadataHandler(
  filePath: string,
  update: Partial<DocumentMetadata>,
): HandlerResult<DocumentMetadata> {
  const { targetPath, valid } = fileCrudService.resolveFilePath(filePath);

  if (!valid) {
    return { success: false, error: "Invalid path", status: 400 };
  }

  if (!fs.existsSync(targetPath)) {
    return { success: false, error: "File not found", status: 404 };
  }

  try {
    const existing = documentMetadataService.readDocumentMetadata(targetPath);
    if (!existing) {
      return { success: false, error: "Metadata not found", status: 404 };
    }

    // updatedAt 자동 갱신
    const merged: DocumentMetadata = {
      ...existing,
      ...update,
      updatedAt: new Date().toISOString(),
    };

    documentMetadataService.writeDocumentMetadata(targetPath, merged);
    logger.info('문서 메타데이터 업데이트 완료', { filePath });

    return { success: true, data: merged };
  } catch (error) {
    logger.error('문서 메타데이터 업데이트 실패', error, { filePath });
    return { success: false, error: "Failed to update metadata", status: 500 };
  }
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * GET: 파일 읽기
 */
export async function readFile(filePath: string): Promise<HandlerResult<FileData>> {
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
export async function getMetadata(filePath: string): Promise<HandlerResult<{ metadata: FileStatMetadata }>> {
  return fileCrudService.readMetadata(filePath);
}

/**
 * 파일 쓰기 (수정)
 */
export async function writeFile(filePath: string, content: string): Promise<HandlerResult<{ message: string }>> {
  return fileCrudService.write(filePath, content);
}

/**
 * 새 파일 생성
 */
export async function createFile(
  nameOrPath: string,
  parent: string = "",
  content?: string
): Promise<HandlerResult<{ message: string }>> {
  return fileCrudService.create(nameOrPath, parent, content);
}

/**
 * 폴더 생성
 */
export async function createFolder(
  name: string,
  parent: string = "",
  filePath?: string
): Promise<HandlerResult<{ message: string }>> {
  return fileCrudService.createFolder(name, parent, filePath);
}

/**
 * 파일/폴더 이름 변경
 */
export async function renameFile(
  oldPath: string,
  newPath: string
): Promise<HandlerResult<{ message: string }>> {
  return fileCrudService.rename(oldPath, newPath);
}

/**
 * 파일/폴더 삭제
 */
export async function deleteFile(filePath: string): Promise<HandlerResult<{ message: string }>> {
  return fileCrudService.remove(filePath);
}

/**
 * POST 액션 라우터 - route.ts에서 사용
 */
export async function handleFileAction(body: FileActionBody): Promise<HandlerResult<unknown>> {
  const { action, path: filePath, content, name, parent = "", oldPath, newPath, metadata: metadataUpdate } = body;

  switch (action) {
    case "read":
      if (!filePath) return { success: false, error: "Missing file path", status: 400 };
      return readFile(filePath);

    case "metadata":
      if (!filePath) return { success: false, error: "Missing file path", status: 400 };
      return getMetadata(filePath);

    case "write":
      if (!filePath || content === undefined) {
        return { success: false, error: "Missing file path or content", status: 400 };
      }
      return writeFile(filePath, content);

    case "create":
      if (!filePath && !name) return { success: false, error: "Missing file path or name", status: 400 };
      return createFile(filePath || name || "", parent, content);

    case "createFolder":
    case "mkdir":
      if (!filePath && !name) return { success: false, error: "Missing path or name", status: 400 };
      return createFolder(name || "", parent, filePath);

    case "rename":
      if (!oldPath || !newPath) {
        return { success: false, error: "Missing oldPath or newPath", status: 400 };
      }
      return renameFile(oldPath, newPath);

    case "delete":
      if (!filePath) return { success: false, error: "Missing file path", status: 400 };
      return deleteFile(filePath);

    case "updateMetadata":
      if (!filePath) return { success: false, error: "Missing file path", status: 400 };
      if (!metadataUpdate) return { success: false, error: "Missing metadata", status: 400 };
      return updateDocumentMetadataHandler(filePath, metadataUpdate);

    default:
      return { success: false, error: "Invalid action", status: 400 };
  }
}
