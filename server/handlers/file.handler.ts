/**
 * File Handler - 단일 파일 CRUD 작업을 담당하는 핸들러
 * Route: /api/file
 */

import fs from "fs";
import path from "path";
import { normalizeMarkdownFileName } from "@/lib/utils/fileUtils";
import { logger, PerformanceTimer } from "@/lib/utils/errorUtils";
import { saveVersion } from "@/lib/versionHistory";

const ROOT_DIR = path.join(process.cwd(), "docs", "wiki");

// ============================================================================
// Types
// ============================================================================

export interface FileMetadata {
  size: number;
  createdAt: string;
  modifiedAt: string;
  accessedAt: string;
}

export interface FileData {
  content: string;
  metadata: FileMetadata;
}

export interface FileActionBody {
  action: 'read' | 'metadata' | 'write' | 'create' | 'createFolder' | 'mkdir' | 'rename' | 'delete';
  path?: string;
  content?: string;
  name?: string;
  parent?: string;
  oldPath?: string;
  newPath?: string;
}

export type HandlerResult<T = unknown> = 
  | { success: true; data: T }
  | { success: false; error: string; status: number };

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * 파일명을 기준으로 루트 디렉터리 이하에서 첫 번째 일치 파일의 전체 경로를 찾는 헬퍼
 */
function findFileByName(rootDir: string, fileName: string): string | null {
  const normalizedFileName = normalizeMarkdownFileName(fileName);
  try {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(rootDir, entry.name);
      if (entry.isDirectory()) {
        const found = findFileByName(fullPath, fileName);
        if (found) return found;
      } else if (entry.isFile()) {
        const entryNormalized = normalizeMarkdownFileName(entry.name);
        if (entryNormalized === normalizedFileName) {
          return fullPath;
        }
      }
    }
  } catch (e) {
    logger.warn('디렉터리 접근 실패', e instanceof Error ? { message: e.message } : undefined);
  }
  return null;
}

/**
 * 경로 검증 및 해석
 */
function resolveFilePath(filePath: string): { targetPath: string; valid: boolean; safeRelPath: string } {
  const safeRelPath = path.normalize(filePath).replace(/^\/+/, '');
  const targetPath = path.join(ROOT_DIR, safeRelPath);
  const valid = targetPath.startsWith(ROOT_DIR);
  return { targetPath, valid, safeRelPath };
}

/**
 * 파일 메타데이터 읽기
 */
function getFileMetadata(filePath: string): FileMetadata {
  const stats = fs.statSync(filePath);
  return {
    size: stats.size,
    createdAt: stats.birthtime.toISOString(),
    modifiedAt: stats.mtime.toISOString(),
    accessedAt: stats.atime.toISOString()
  };
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * GET: 파일 읽기
 */
export async function readFile(filePath: string): Promise<HandlerResult<FileData>> {
  const timer = new PerformanceTimer('Handler: 파일 읽기');
  
  const { targetPath, valid, safeRelPath } = resolveFilePath(filePath);

  if (!valid) {
    logger.warn('루트 디렉터리 범위를 벗어나는 경로 요청 차단', { filePath, targetPath });
    return { success: false, error: "Invalid path", status: 400 };
  }

  let finalPath = targetPath;

  // 요청이 단일 파일명이고 지정 경로에 없으면, 루트 이하에서 파일명으로 검색
  const isBareFileName = !safeRelPath.includes(path.sep);
  if (!fs.existsSync(finalPath) && isBareFileName) {
    const found = findFileByName(ROOT_DIR, safeRelPath);
    if (found) {
      finalPath = found;
      logger.info('파일명만으로 일치 파일을 발견', { requested: safeRelPath, resolved: finalPath });
    }
  }

  if (!fs.existsSync(finalPath)) {
    logger.warn('요청된 파일이 존재하지 않음', { filePath, finalPath });
    return { success: false, error: "File not found", status: 404 };
  }

  try {
    logger.info('파일 읽기 시작', { filePath, finalPath });
    const content = fs.readFileSync(finalPath, "utf-8");
    const metadata = getFileMetadata(finalPath);
    
    logger.info('파일 읽기 성공', { 
      filePath, 
      contentLength: content.length,
      createdAt: metadata.createdAt,
      modifiedAt: metadata.modifiedAt
    });
    
    timer.end({ filePath, finalPath });
    return { success: true, data: { content, metadata } };
  } catch (error) {
    logger.error('파일 읽기 실패', error, { filePath, finalPath });
    timer.end({ filePath, finalPath, error: true });
    return { success: false, error: "Failed to read file", status: 500 };
  }
}

/**
 * 메타데이터만 조회
 */
export async function getMetadata(filePath: string): Promise<HandlerResult<{ metadata: FileMetadata }>> {
  const { targetPath, valid } = resolveFilePath(filePath);

  if (!valid) {
    return { success: false, error: "Invalid path", status: 400 };
  }

  if (!fs.existsSync(targetPath)) {
    return { success: false, error: "File not found", status: 404 };
  }

  try {
    const metadata = getFileMetadata(targetPath);
    logger.info('메타데이터 조회 성공', { filePath, metadata });
    return { success: true, data: { metadata } };
  } catch (error) {
    logger.error('메타데이터 조회 실패', error, { filePath, targetPath });
    return { success: false, error: "Failed to read metadata", status: 500 };
  }
}

/**
 * 파일 쓰기 (수정)
 */
export async function writeFile(filePath: string, content: string): Promise<HandlerResult<{ message: string }>> {
  const { targetPath, valid } = resolveFilePath(filePath);

  if (!valid) {
    return { success: false, error: "Invalid path", status: 400 };
  }

  try {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    
    // 이전 내용 읽기 (버전 비교용)
    let previousContent: string | null = null;
    if (fs.existsSync(targetPath)) {
      previousContent = fs.readFileSync(targetPath, "utf-8");
    }
    
    fs.writeFileSync(targetPath, content, "utf-8");
    
    // 버전 히스토리 저장
    try {
      const relativePath = path.relative(ROOT_DIR, targetPath);
      await saveVersion(relativePath, content, previousContent ? 'update' : 'create', previousContent);
    } catch (versionError) {
      logger.warn('버전 히스토리 저장 실패', versionError instanceof Error ? { message: versionError.message } : undefined);
    }
    
    return { success: true, data: { message: "File saved" } };
  } catch (error) {
    logger.error('파일 쓰기 실패', error, { filePath, targetPath });
    return { success: false, error: "Failed to write file", status: 500 };
  }
}

/**
 * 새 파일 생성
 */
export async function createFile(
  name: string, 
  parent: string = "", 
  content?: string
): Promise<HandlerResult<{ message: string }>> {
  const targetPath = path.join(ROOT_DIR, parent, normalizeMarkdownFileName(name));

  if (!targetPath.startsWith(ROOT_DIR)) {
    return { success: false, error: "Invalid path", status: 400 };
  }

  if (fs.existsSync(targetPath)) {
    return { success: false, error: "File already exists", status: 409 };
  }

  try {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    const newContent = content || `# ${name}\n\n내용을 작성하세요.`;
    fs.writeFileSync(targetPath, newContent, "utf-8");
    
    // 버전 히스토리 저장
    try {
      const relativePath = path.relative(ROOT_DIR, targetPath);
      await saveVersion(relativePath, newContent, 'create', null);
    } catch (versionError) {
      logger.warn('버전 히스토리 저장 실패', versionError instanceof Error ? { message: versionError.message } : undefined);
    }
    
    return { success: true, data: { message: "File created" } };
  } catch (error) {
    logger.error('파일 생성 실패', error, { name, parent, targetPath });
    return { success: false, error: "Failed to create file", status: 500 };
  }
}

/**
 * 폴더 생성
 */
export async function createFolder(
  name: string,
  parent: string = "",
  filePath?: string
): Promise<HandlerResult<{ message: string }>> {
  const folderPath = filePath 
    ? path.join(ROOT_DIR, filePath) 
    : path.join(ROOT_DIR, parent, name);

  if (!folderPath.startsWith(ROOT_DIR)) {
    return { success: false, error: "Invalid path", status: 400 };
  }

  logger.info('폴더 생성 요청', { filePath, parent, name, folderPath });

  if (fs.existsSync(folderPath)) {
    logger.warn('폴더가 이미 존재함', { folderPath });
    return { success: false, error: "Folder already exists", status: 409 };
  }

  try {
    fs.mkdirSync(folderPath, { recursive: true });
    logger.info('폴더 생성 성공', { folderPath });
    return { success: true, data: { message: "Folder created" } };
  } catch (error) {
    logger.error('폴더 생성 실패', error, { folderPath });
    return { success: false, error: "Failed to create folder", status: 500 };
  }
}

/**
 * 파일/폴더 이름 변경
 */
export async function renameFile(
  oldPath: string,
  newPath: string
): Promise<HandlerResult<{ message: string }>> {
  const oldFullPath = path.join(ROOT_DIR, oldPath);
  const newFullPath = path.join(ROOT_DIR, newPath);

  if (!oldFullPath.startsWith(ROOT_DIR) || !newFullPath.startsWith(ROOT_DIR)) {
    return { success: false, error: "Invalid path", status: 400 };
  }

  logger.info('파일/폴더 이름 변경 요청', { oldPath, newPath, oldFullPath, newFullPath });

  if (!fs.existsSync(oldFullPath)) {
    logger.warn('원본 파일/폴더가 존재하지 않음', { oldFullPath });
    return { success: false, error: "File not found", status: 404 };
  }

  if (fs.existsSync(newFullPath)) {
    logger.warn('대상 파일/폴더가 이미 존재함', { newFullPath });
    return { success: false, error: "Target already exists", status: 409 };
  }

  try {
    logger.info('파일/폴더 이름 변경 시작', { oldPath, newPath, oldFullPath, newFullPath });
    
    // 대상 디렉토리가 존재하지 않으면 생성
    fs.mkdirSync(path.dirname(newFullPath), { recursive: true });
    
    // 파일 내용을 보존하는 안전한 rename 연산
    fs.renameSync(oldFullPath, newFullPath);
    
    logger.info('파일/폴더 이름 변경 성공', { from: oldFullPath, to: newFullPath });
    
    return { success: true, data: { message: "File/Folder renamed successfully" } };
  } catch (error) {
    logger.error('파일/폴더 이름 변경 실패', error, { oldPath, newPath, oldFullPath, newFullPath });
    return { success: false, error: `Rename failed: ${error instanceof Error ? error.message : 'Unknown error'}`, status: 500 };
  }
}

/**
 * 파일/폴더 삭제
 */
export async function deleteFile(filePath: string): Promise<HandlerResult<{ message: string }>> {
  const { targetPath, valid } = resolveFilePath(filePath);

  if (!valid) {
    return { success: false, error: "Invalid path", status: 400 };
  }

  if (!fs.existsSync(targetPath)) {
    // 이미 없으면 성공으로 처리
    return { success: true, data: { message: "File/Folder deleted" } };
  }

  try {
    const stats = fs.statSync(targetPath);
    if (stats.isDirectory()) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(targetPath);
    }
    return { success: true, data: { message: "File/Folder deleted" } };
  } catch (error) {
    logger.error('파일/폴더 삭제 실패', error, { filePath, targetPath });
    return { success: false, error: "Failed to delete file/folder", status: 500 };
  }
}

/**
 * POST 액션 라우터 - route.ts에서 사용
 */
export async function handleFileAction(body: FileActionBody): Promise<HandlerResult<unknown>> {
  const { action, path: filePath, content, name, parent = "", oldPath, newPath } = body;

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
      if (!name) return { success: false, error: "Missing file name", status: 400 };
      return createFile(name, parent, content);

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

    default:
      return { success: false, error: "Invalid action", status: 400 };
  }
}
