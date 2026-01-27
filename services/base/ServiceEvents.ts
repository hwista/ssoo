/**
 * 서비스 이벤트 시스템
 */

import type { FileNode } from '@/types';
import type { ServiceError } from '../types/ServiceTypes';

// 이벤트 핸들러 타입 정의
type EventHandler<T = unknown> = (data: T) => void;
type UnsubscribeFunction = () => void;

// 미리 정의된 서비스 이벤트 목록
export interface ServiceEventMap {
  fileCreated: { path: string; node: FileNode };
  fileUpdated: { path: string; node: FileNode };
  fileDeleted: { path: string };
  fileRenamed: { oldPath: string; newPath: string; node: FileNode };
  directoryCreated: { path: string; node: FileNode };
  directoryDeleted: { path: string };
  serviceError: { service: string; error: ServiceError };
  configUpdated: { service: string; config: Record<string, unknown> };
}

// 타입 안전한 이벤트 버스
export class ServiceEventBus {
  private static instance: ServiceEventBus;
  private events: Map<string, EventHandler<unknown>[]> = new Map();
  private maxListeners: number = 100;
  
  static getInstance(): ServiceEventBus {
    if (!ServiceEventBus.instance) {
      ServiceEventBus.instance = new ServiceEventBus();
    }
    return ServiceEventBus.instance;
  }
  
  /**
   * 이벤트 발행 (타입 안전)
   */
  emit<K extends keyof ServiceEventMap>(event: K, data: ServiceEventMap[K]): void;
  emit<T = unknown>(event: string, data: T): void;
  emit<T = unknown>(event: string, data: T): void {
    const handlers = this.events.get(event) || [];
    handlers.forEach(handler => {
      try {
        (handler as EventHandler<T>)(data);
      } catch (error) {
        console.error(`Event handler error for ${event}:`, error);
      }
    });
  }
  
  /**
   * 이벤트 구독 (타입 안전)
   */
  on<K extends keyof ServiceEventMap>(event: K, handler: EventHandler<ServiceEventMap[K]>): UnsubscribeFunction;
  on<T = unknown>(event: string, handler: EventHandler<T>): UnsubscribeFunction;
  on<T = unknown>(event: string, handler: EventHandler<T>): UnsubscribeFunction {
    const handlers = this.events.get(event) || [];
    
    // 최대 리스너 수 체크
    if (handlers.length >= this.maxListeners) {
      console.warn(`Maximum listeners (${this.maxListeners}) reached for event: ${event}`);
    }
    
    handlers.push(handler as EventHandler<unknown>);
    this.events.set(event, handlers);
    
    // 구독 해제 함수 반환
    return () => this.off(event, handler);
  }
  
  /**
   * 이벤트 구독 해제 (타입 안전)
   */
  off<K extends keyof ServiceEventMap>(event: K, handler: EventHandler<ServiceEventMap[K]>): void;
  off<T = unknown>(event: string, handler: EventHandler<T>): void;
  off<T = unknown>(event: string, handler: EventHandler<T>): void {
    const handlers = this.events.get(event) || [];
    const index = handlers.indexOf(handler as EventHandler<unknown>);
    if (index > -1) {
      handlers.splice(index, 1);
      this.events.set(event, handlers);
    }
  }
  
  /**
   * 모든 이벤트 구독 해제
   */
  clear(): void {
    this.events.clear();
  }
  
  /**
   * 특정 이벤트의 모든 핸들러 제거
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
  
  /**
   * 이벤트 리스너 수 조회
   */
  listenerCount(event: string): number {
    return this.events.get(event)?.length || 0;
  }
  
  /**
   * 등록된 이벤트 목록 조회
   */
  eventNames(): string[] {
    return Array.from(this.events.keys());
  }
  
  /**
   * 최대 리스너 수 설정
   */
  setMaxListeners(count: number): void {
    this.maxListeners = count;
  }
  
  /**
   * 최대 리스너 수 조회
   */
  getMaxListeners(): number {
    return this.maxListeners;
  }
}

// 싱글톤 인스턴스 내보내기
export const serviceEventBus = ServiceEventBus.getInstance();