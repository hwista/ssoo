/**
 * Watch API Route - 파일 시스템 변경 감시 (SSE)
 * 비즈니스 로직은 @/server/handlers/watch.handler.ts 참조
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  initWatcher, 
  registerClient, 
  unregisterClient, 
  getWelcomeMessage,
  type ClientWriter
} from '@/server/handlers/watch.handler';
import { logger } from '@/lib/utils/errorUtils';

export async function GET(request: NextRequest) {
  // 파일 감시자 초기화
  initWatcher();

  // Server-Sent Events 스트림 생성
  const stream = new ReadableStream({
    start(controller) {
      // 연결 확인 메시지
      controller.enqueue(getWelcomeMessage());
      
      // 클라이언트 프록시 생성
      const writerProxy: ClientWriter = {
        write: async (chunk: Uint8Array) => {
          controller.enqueue(chunk);
        }
      };
      
      // 클라이언트 목록에 추가
      registerClient(writerProxy);
      
      // 연결 종료 처리
      request.signal.addEventListener('abort', () => {
        unregisterClient(writerProxy);
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