/**
 * Watch Handler - 파일 시스템 감시 관련 작업을 담당하는 핸들러
 * Route: /api/watch
 * 
 * NOTE: SSE 스트림 관리는 route.ts에서 직접 처리하지만,
 * 파일 감시 로직은 이 핸들러에서 관리합니다.
 */

import * as chokidar from 'chokidar';
import path from 'path';
import { logger } from '@/lib/utils/errorUtils';

const ROOT_DIR = path.join(process.cwd(), "docs");

// ============================================================================
// Types
// ============================================================================

export interface FileEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir' | 'connected';
  path?: string;
}

export type ClientWriter = {
  write: (chunk: Uint8Array) => Promise<void>;
};

// ============================================================================
// State Management
// ============================================================================

// 클라이언트 연결을 관리하는 Set
const clients = new Set<ClientWriter>();

// 파일 감시자
let watcher: chokidar.FSWatcher | null = null;

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * 모든 연결된 클라이언트에게 이벤트 전송
 */
function notifyClients(event: FileEvent): void {
  const message = `data: ${JSON.stringify(event)}\n\n`;
  
  clients.forEach(async (writer) => {
    try {
      await writer.write(new TextEncoder().encode(message));
    } catch (error) {
      logger.error('클라이언트 알림 실패', error);
      clients.delete(writer);
    }
  });
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * 파일 감시자 초기화
 */
export function initWatcher(): void {
  if (watcher) return;
  
  watcher = chokidar.watch(ROOT_DIR, {
    persistent: true,
    ignoreInitial: true,
    ignored: /(^|[\/\\])\../, // 숨김 파일 무시
  });

  watcher
    .on('add', (filePath: string) => {
      console.log(`📄 파일 생성: ${filePath}`);
      notifyClients({ type: 'add', path: filePath });
    })
    .on('change', (filePath: string) => {
      console.log(`✏️ 파일 수정: ${filePath}`);
      notifyClients({ type: 'change', path: filePath });
    })
    .on('unlink', (filePath: string) => {
      console.log(`🗑️ 파일 삭제: ${filePath}`);
      notifyClients({ type: 'unlink', path: filePath });
    })
    .on('addDir', (dirPath: string) => {
      console.log(`📁 폴더 생성: ${dirPath}`);
      notifyClients({ type: 'addDir', path: dirPath });
    })
    .on('unlinkDir', (dirPath: string) => {
      console.log(`🗂️ 폴더 삭제: ${dirPath}`);
      notifyClients({ type: 'unlinkDir', path: dirPath });
    });
}

/**
 * 클라이언트 등록
 */
export function registerClient(writer: ClientWriter): void {
  clients.add(writer);
}

/**
 * 클라이언트 해제
 */
export function unregisterClient(writer: ClientWriter): void {
  clients.delete(writer);
  logger.info('클라이언트 연결 종료');
}

/**
 * 연결 확인 메시지 생성
 */
export function getWelcomeMessage(): Uint8Array {
  const welcomeMessage = `data: ${JSON.stringify({ type: 'connected' })}\n\n`;
  return new TextEncoder().encode(welcomeMessage);
}

/**
 * 감시자 정리 (서버 종료 시)
 */
export function closeWatcher(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
  clients.clear();
}
