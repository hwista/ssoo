import { NextRequest, NextResponse } from 'next/server';
import * as chokidar from 'chokidar';
import path from 'path';
import { logger } from '@/utils/errorUtils';

const ROOT_DIR = path.join(process.cwd(), "docs");

interface FileEvent {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir' | 'connected';
  path?: string;
}

// 클라이언트 연결을 관리하는 Set
const clients = new Set<WritableStreamDefaultWriter>();

// 파일 감시자 초기화
let watcher: chokidar.FSWatcher | null = null;

function initWatcher() {
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

function notifyClients(event: FileEvent) {
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

export async function GET(request: NextRequest) {
  // 파일 감시자 초기화
  initWatcher();

  // Server-Sent Events 스트림 생성
  const stream = new ReadableStream({
    start(controller) {
      // 연결 확인 메시지
      const welcomeMessage = `data: ${JSON.stringify({ type: 'connected' })}\n\n`;
      controller.enqueue(new TextEncoder().encode(welcomeMessage));
      
      // 클라이언트 목록에 추가
      const writerProxy = {
        write: async (chunk: Uint8Array) => {
          controller.enqueue(chunk);
        }
      } as WritableStreamDefaultWriter;
      
      clients.add(writerProxy);
      
      // 연결 종료 처리
      request.signal.addEventListener('abort', () => {
        clients.delete(writerProxy);
        logger.info('클라이언트 연결 종료');
      });
    },
    cancel() {
      logger.info('SSE 스트림 취소됨');
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}