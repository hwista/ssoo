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
        return { type: "file" as const, name: entry.name, path: relativePath };
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
