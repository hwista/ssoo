/**
 * 서비스 설정 타입 정의
 */

export interface ServiceConfig {
  // API 설정
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  
  // 로깅 설정
  enableLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  
  // 캐싱 설정
  enableCaching?: boolean;
  cacheTtl?: number;
  
  // 이벤트 설정
  enableEvents?: boolean;
  maxEventListeners?: number;
}

// 기본 설정
export const defaultServiceConfig: ServiceConfig = {
  baseUrl: '/api',
  timeout: 30000,
  retries: 3,
  enableLogging: true,
  logLevel: 'info',
  enableCaching: true,
  cacheTtl: 300000, // 5분
  enableEvents: true,
  maxEventListeners: 100
};