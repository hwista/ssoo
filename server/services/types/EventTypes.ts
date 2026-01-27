/**
 * 이벤트 시스템 타입 정의
 */

// 파일 시스템 이벤트 타입
export type FileSystemEvent = 
  | 'file:created'
  | 'file:updated'
  | 'file:deleted'
  | 'file:renamed'
  | 'folder:created'
  | 'folder:deleted'
  | 'tree:refreshed'
  | 'error';

// 파일 시스템 이벤트 데이터
export interface FileSystemEventData {
  path: string;
  type: 'file' | 'folder';
  oldPath?: string; // rename 이벤트용
  timestamp: number;
}

// 에러 이벤트 데이터
export interface ErrorEventData {
  error: Error;
  context: string;
  timestamp: number;
}

// 이벤트 핸들러 타입
export type EventHandler<T = FileSystemEventData> = (data: T) => void;

// 이벤트 구독 해제 함수
export type UnsubscribeFunction = () => void;