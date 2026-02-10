/**
 * Files Handler - 파일 트리 조회 API 핸들러
 * 
 * @description
 * DMS 위키 문서의 파일/폴더 트리 구조를 조회합니다.
 * 마크다운 파일(.md)만 포함됩니다.
 * 
 * @module server/handlers/files.handler
 */

import fs from "fs";
import path from "path";
import { normalizePath } from "@/lib/utils/pathUtils";
import { isMarkdownFile } from "@/lib/utils/fileUtils";
import { logger, PerformanceTimer } from "@/lib/utils/errorUtils";

// 위키 문서 루트 디렉토리
const ROOT_DIR = path.join(process.cwd(), "docs", "wiki");

// ============================================================================
// Types
// ============================================================================

export interface FileEntry {
  type: "file";
  name: string;
  path: string;
  /** 사이드카 title (설정된 경우만 포함) */
  displayTitle?: string;
}

export interface DirectoryEntry {
  type: "directory";
  name: string;
  path: string;
  children: (FileEntry | DirectoryEntry)[];
}

export type FileTreeEntry = FileEntry | DirectoryEntry;

// ============================================================================
// Internal Functions
// ============================================================================

/**
 * 사이드카 파일에서 title만 추출
 */
function readSidecarTitle(mdFilePath: string): string | undefined {
  try {
    const parsed = path.parse(mdFilePath);
    const sidecarPath = path.join(parsed.dir, `${parsed.name}.sidecar.json`);
    if (fs.existsSync(sidecarPath)) {
      const raw = fs.readFileSync(sidecarPath, 'utf-8');
      const data = JSON.parse(raw);
      // title이 있고, 파일명과 다른 경우만 반환
      if (data.title && typeof data.title === 'string') {
        const fileBaseName = parsed.name;
        if (data.title !== fileBaseName) return data.title;
      }
    }
  } catch { /* sidecar 읽기 실패 시 무시 */ }
  return undefined;
}

/**
 * 디렉토리를 재귀적으로 읽어 파일 트리를 생성합니다.
 */
function readDirectory(dirPath: string): FileTreeEntry[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  return entries
    .map((entry) => {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = normalizePath(path.relative(ROOT_DIR, fullPath));

      if (entry.isDirectory()) {
        return {
          type: "directory" as const,
          name: entry.name,
          path: relativePath,
          children: readDirectory(fullPath),
        };
      }
      if (entry.isFile() && isMarkdownFile(entry.name)) {
        const displayTitle = readSidecarTitle(fullPath);
        const result: FileEntry = { type: "file" as const, name: entry.name, path: relativePath };
        if (displayTitle) result.displayTitle = displayTitle;
        return result;
      }
      return null;
    })
    .filter((item): item is FileTreeEntry => item !== null);
}

// ============================================================================
// Handler Functions
// ============================================================================

/**
 * GET /api/files - 파일 트리 조회
 * 
 * @returns 파일 트리 구조 배열
 */
export async function getFileTree(): Promise<{
  success: boolean;
  data?: FileTreeEntry[];
  error?: string;
}> {
  const timer = new PerformanceTimer('Handler: 파일 트리 조회');
  
  try {
    logger.info('파일 트리 조회 시작', { rootDir: ROOT_DIR });
    const structure = readDirectory(ROOT_DIR);
    
    logger.info('파일 트리 조회 성공', { 
      itemCount: structure.length,
      rootDir: ROOT_DIR 
    });
    
    return { success: true, data: structure };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('파일 트리 조회 실패', error, { rootDir: ROOT_DIR });
    return { success: false, error: message };
  } finally {
    timer.end({ rootDir: ROOT_DIR });
  }
}
