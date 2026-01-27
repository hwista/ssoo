/**
 * 기본 서비스 추상 클래스
 */

import type { ServiceConfig, ServiceResult, ServiceError } from '../types/ServiceTypes';
import { serviceEventBus, type ServiceEventMap } from './ServiceEvents';

export abstract class BaseService {
  protected config: ServiceConfig;
  protected serviceName: string;
  
  constructor(serviceName: string, config: Partial<ServiceConfig> = {}) {
    this.serviceName = serviceName;
    this.config = {
      apiTimeout: config.apiTimeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      enableLogging: config.enableLogging ?? true,
      enableCaching: config.enableCaching ?? false,
      cacheTimeout: config.cacheTimeout || 300000, // 5분
    };
  }
  
  /**
   * 서비스 초기화 (필요시 하위 클래스에서 구현)
   */
  async initialize(): Promise<void> {
    // 기본 구현은 빈 메서드
  }
  
  /**
   * 성공 결과 반환
   */
  protected success<T>(data: T, message?: string): ServiceResult<T> {
    return {
      success: true,
      data,
      message,
    };
  }
  
  /**
   * 실패 결과 반환
   */
  protected failure<T = never>(error: string | Error, code?: string): ServiceResult<T> {
    const serviceError: ServiceError = {
      code: code || 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : error,
      service: this.serviceName,
      timestamp: new Date(),
      stack: error instanceof Error ? error.stack : undefined,
    };
    
    // 에러 이벤트 발행
    this.emitEvent('serviceError', {
      service: this.serviceName,
      error: serviceError,
    });
    
    return {
      success: false,
      error: serviceError,
    };
  }
  
  /**
   * 이벤트 발행
   */
  protected emitEvent<K extends keyof ServiceEventMap>(
    event: K,
    data: ServiceEventMap[K]
  ): void {
    serviceEventBus.emit(event, data);
  }
  
  /**
   * 로그 기록 (config에 따라 활성화/비활성화)
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    if (!this.config.enableLogging) return;
    
    const logMessage = `[${this.serviceName}] ${message}`;
    
    switch (level) {
      case 'info':
        console.info(logMessage, data || '');
        break;
      case 'warn':
        console.warn(logMessage, data || '');
        break;
      case 'error':
        console.error(logMessage, data || '');
        break;
    }
  }
  
  /**
   * 재시도 로직
   */
  protected async retry<T>(
    operation: () => Promise<T>,
    attempts: number = this.config.retryAttempts
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let i = 0; i < attempts; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (i === attempts - 1) {
          // 마지막 시도
          this.log('error', `All retry attempts failed for operation`, lastError);
          throw lastError;
        }
        
        // 재시도 대기 (지수 백오프)
        const delay = Math.pow(2, i) * 1000;
        this.log('warn', `Retry attempt ${i + 1}/${attempts} after ${delay}ms`, lastError);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
  
  /**
   * 비동기 작업 타임아웃 적용
   */
  protected async withTimeout<T>(
    operation: Promise<T>,
    timeout: number = this.config.apiTimeout
  ): Promise<T> {
    return Promise.race([
      operation,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout)
      ),
    ]);
  }
  
  /**
   * 설정 업데이트
   */
  updateConfig(newConfig: Partial<ServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 설정 변경 이벤트 발행
    this.emitEvent('configUpdated', {
      service: this.serviceName,
      config: this.config as unknown as Record<string, unknown>,
    });
    
    this.log('info', 'Service configuration updated', newConfig);
  }
  
  /**
   * 현재 설정 조회
   */
  getConfig(): ServiceConfig {
    return { ...this.config };
  }
  
  /**
   * 서비스 상태 체크 (필요시 하위 클래스에서 구현)
   */
  async healthCheck(): Promise<ServiceResult<{ status: string; timestamp: Date }>> {
    return this.success({
      status: 'healthy',
      timestamp: new Date(),
    });
  }
}