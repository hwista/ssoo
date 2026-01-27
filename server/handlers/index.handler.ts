/**
 * Index Handler - 벡터 인덱싱 관련 작업을 담당하는 핸들러
 * Route: /api/index
 */

import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { indexDocuments, deleteDocumentsByFile, getDocumentCount, getAllDocuments } from '@/lib/vectorStore';

const WIKI_DIR = path.join(process.cwd(), 'docs/wiki');

// ============================================================================
// Types
// ============================================================================

export interface IndexDocument {
  content: string;
  filePath: string;
  fileName: string;
  chunkIndex: number;
  createdAt: string;
}

export type HandlerResult<T = unknown> = 
  | { success: true; data: T }
  | { success: false; error: string; status: number };

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * 텍스트를 청크로 분할
 */
function splitTextToChunks(text: string, chunkSize: number = 500, overlap: number = 50): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?。！？]\s*/);

  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.floor(overlap / 5)).join(' ');
      currentChunk = overlapWords + ' ' + sentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * 디렉토리 재귀 탐색하여 마크다운 파일 찾기
 */
async function findMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  if (!existsSync(dir)) {
    return files;
  }

  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const subFiles = await findMarkdownFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.isFile() && /\.(md|markdown|txt)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * 전체 위키 문서 인덱싱
 */
export async function indexWikiDocuments(reindex: boolean = false): Promise<HandlerResult<{
  message: string;
  indexed: number;
  files: string[];
}>> {
  try {
    const markdownFiles = await findMarkdownFiles(WIKI_DIR);

    if (markdownFiles.length === 0) {
      return {
        success: true,
        data: {
          message: '인덱싱할 문서가 없습니다',
          indexed: 0,
          files: []
        }
      };
    }

    let totalChunks = 0;
    const indexedFiles: string[] = [];

    for (const filePath of markdownFiles) {
      const fileName = path.basename(filePath);
      const relativePath = path.relative(process.cwd(), filePath);

      // 기존 문서 삭제 (재인덱싱 시)
      if (reindex) {
        await deleteDocumentsByFile(relativePath);
      }

      // 파일 읽기
      const content = await readFile(filePath, 'utf-8');

      // 청크로 분할
      const chunks = splitTextToChunks(content);

      if (chunks.length > 0) {
        // 문서 인덱싱
        const documents = chunks.map((chunk, index) => ({
          content: chunk,
          filePath: relativePath,
          fileName,
          chunkIndex: index,
          createdAt: new Date().toISOString()
        }));

        await indexDocuments(documents);
        totalChunks += chunks.length;
        indexedFiles.push(fileName);
      }
    }

    return {
      success: true,
      data: {
        message: `${indexedFiles.length}개 파일, ${totalChunks}개 청크 인덱싱 완료`,
        indexed: totalChunks,
        files: indexedFiles
      }
    };
  } catch (error) {
    console.error('인덱싱 오류:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '인덱싱 중 오류가 발생했습니다', 
      status: 500 
    };
  }
}

/**
 * 인덱스 상태 및 문서 목록 조회
 */
export async function getIndexStats(): Promise<HandlerResult<{
  totalDocuments: number;
  fileStats: Record<string, number>;
  status: 'ready' | 'empty';
}>> {
  try {
    const count = await getDocumentCount();
    const documents = await getAllDocuments();

    // 파일별 청크 수 집계
    const fileStats: Record<string, number> = {};
    for (const doc of documents) {
      fileStats[doc.fileName] = (fileStats[doc.fileName] || 0) + 1;
    }

    return {
      success: true,
      data: {
        totalDocuments: count,
        fileStats,
        status: count > 0 ? 'ready' : 'empty'
      }
    };
  } catch (error) {
    console.error('인덱스 상태 조회 오류:', error);
    return { success: false, error: '인덱스 상태 조회 중 오류가 발생했습니다', status: 500 };
  }
}

/**
 * 인덱스 초기화 안내
 */
export async function resetIndex(): Promise<HandlerResult<{
  message: string;
}>> {
  // LanceDB는 테이블 단위 삭제만 지원하므로 수동 삭제 안내
  return {
    success: true,
    data: {
      message: '인덱스 초기화는 vectordb 폴더를 수동으로 삭제해주세요'
    }
  };
}
