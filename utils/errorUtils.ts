/**
 * 에러 처리 및 로깅 유틸리티
 * 중복된 try-catch 패턴과 로깅을 표준화하여 일관된 에러 처리 제공
 */

/**
 * 로그 레벨 정의
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

/**
 * 에러 컨텍스트 정보
 */
export interface ErrorContext {
  operation: string;
  component?: string;
  context?: string;
  data?: unknown;
  userId?: string;
  timestamp?: Date;
}

/**
 * 로그 설정
 */
interface LogConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  prefix?: string;
}

/**
 * 기본 로그 설정
 */
const DEFAULT_LOG_CONFIG: LogConfig = {
  level: process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG,
  enableConsole: true,
  enableRemote: false,
  prefix: '[WikiApp]'
};

let currentLogConfig = { ...DEFAULT_LOG_CONFIG };

/**
 * 로그 설정 업데이트
 */
export function setLogConfig(config: Partial<LogConfig>): void {
  currentLogConfig = { ...currentLogConfig, ...config };
}

/**
 * 로그 메시지 포맷팅
 */
function formatLogMessage(level: string, message: string, context?: unknown): string {
  const timestamp = new Date().toISOString();
  const prefix = currentLogConfig.prefix || '';
  const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
  return `${timestamp} ${prefix} [${level}] ${message}${contextStr}`;
}

/**
 * 안전한 에러 메시지 추출
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return '알 수 없는 오류가 발생했습니다';
}

/**
 * 구조화된 로거
 */
export const logger = {
  /**
   * 디버그 로그
   */
  debug: (message: string, context?: unknown): void => {
    if (currentLogConfig.level <= LogLevel.DEBUG && currentLogConfig.enableConsole) {
      console.debug(formatLogMessage('DEBUG', message, context));
    }
  },

  /**
   * 정보 로그
   */
  info: (message: string, context?: unknown): void => {
    if (currentLogConfig.level <= LogLevel.INFO && currentLogConfig.enableConsole) {
      console.log(formatLogMessage('INFO', message, context));
    }
  },

  /**
   * 경고 로그
   */
  warn: (message: string, context?: unknown): void => {
    if (currentLogConfig.level <= LogLevel.WARN && currentLogConfig.enableConsole) {
      console.warn(formatLogMessage('WARN', message, context));
    }
  },

  /**
   * 에러 로그
   */
  error: (message: string, error?: unknown, context?: unknown): void => {
    if (currentLogConfig.level <= LogLevel.ERROR && currentLogConfig.enableConsole) {
      const errorMsg = error ? ` | Error: ${extractErrorMessage(error)}` : '';
      console.error(formatLogMessage('ERROR', message + errorMsg, context));
    }
  },

  /**
   * 작업 시작 로그
   */
  start: (operation: string, context?: unknown): void => {
    logger.debug(`${operation} 시작`, context);
  },

  /**
   * 작업 완료 로그
   */
  complete: (operation: string, context?: unknown): void => {
    logger.info(`${operation} 완료`, context);
  },

  /**
   * 작업 실패 로그
   */
  fail: (operation: string, error: unknown, context?: unknown): void => {
    logger.error(`${operation} 실패`, error, context);
  }
};

/**
 * 안전한 비동기 함수 실행 래퍼
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  defaultValue?: T
): Promise<T | undefined> {
  try {
    logger.start(context.operation, { component: context.component, data: context.data });
    const result = await operation();
    logger.complete(context.operation, { component: context.component });
    return result;
  } catch (error) {
    logger.fail(context.operation, error, { 
      component: context.component, 
      data: context.data 
    });
    
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    
    // 중요한 작업의 경우 에러를 다시 throw
    if (context.operation.includes('critical') || context.operation.includes('important')) {
      throw error;
    }
    
    return undefined;
  }
}

/**
 * 안전한 동기 함수 실행 래퍼
 */
export function safeSync<T>(
  operation: () => T,
  context: ErrorContext,
  defaultValue?: T
): T | undefined {
  try {
    logger.start(context.operation, { component: context.component, data: context.data });
    const result = operation();
    logger.complete(context.operation, { component: context.component });
    return result;
  } catch (error) {
    logger.fail(context.operation, error, { 
      component: context.component, 
      data: context.data 
    });
    
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    
    return undefined;
  }
}

/**
 * 표준화된 에러 처리 함수
 */
export function handleError(
  error: unknown,
  context: ErrorContext,
  options: {
    showNotification?: boolean;
    logLevel?: LogLevel;
    rethrow?: boolean;
  } = {}
): void {
  const { showNotification = false, logLevel = LogLevel.ERROR, rethrow = false } = options;
  
  const errorMessage = extractErrorMessage(error);
  
  // 로깅
  if (logLevel <= currentLogConfig.level) {
    logger.error(`${context.operation} 중 오류 발생`, error, {
      component: context.component,
      data: context.data
    });
  }
  
  // 알림 표시 (클라이언트 환경에서만)
  if (showNotification && typeof window !== 'undefined') {
    // 노티피케이션 시스템이 있다면 사용
    const event = new CustomEvent('show-error', {
      detail: {
        title: `${context.operation} 실패`,
        message: errorMessage,
        duration: 5000
      }
    });
    window.dispatchEvent(event);
  }
  
  // 에러 재발생
  if (rethrow) {
    throw error;
  }
}

/**
 * API 호출 에러 처리 전용 함수
 */
export function handleApiError(
  error: unknown,
  operation: string,
  component?: string
): string {
  const context: ErrorContext = { operation, component };
  handleError(error, context, { logLevel: LogLevel.WARN });
  return extractErrorMessage(error);
}

/**
 * 파일 작업 에러 처리 전용 함수
 */
export function handleFileError(
  error: unknown,
  operation: string,
  filePath?: string
): string {
  const context: ErrorContext = { 
    operation, 
    component: 'FileOperations',
    data: { filePath }
  };
  handleError(error, context, { showNotification: true });
  return extractErrorMessage(error);
}

/**
 * 폼 검증 에러 처리 전용 함수
 */
export function handleValidationError(
  error: unknown,
  field: string,
  component?: string
): string {
  const context: ErrorContext = { 
    operation: 'Form validation', 
    component,
    data: { field }
  };
  handleError(error, context, { logLevel: LogLevel.WARN });
  return extractErrorMessage(error);
}

/**
 * 개발 환경에서만 실행되는 디버그 함수
 */
export function debugOnly(fn: () => void): void {
  if (process.env.NODE_ENV === 'development') {
    try {
      fn();
    } catch (error) {
      logger.warn('디버그 함수 실행 중 오류', error);
    }
  }
}

/**
 * 성능 측정을 위한 타이머
 */
export class PerformanceTimer {
  private startTime: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = performance.now();
    logger.debug(`⏱️ ${operation} 타이머 시작`);
  }

  end(context?: unknown): number {
    const duration = performance.now() - this.startTime;
    logger.debug(`⏱️ ${this.operation} 완료`, { 
      duration: `${duration.toFixed(2)}ms`, 
      ...(typeof context === 'object' && context ? context : {})
    });
    return duration;
  }
}

/**
 * 에러 경계에서 사용할 에러 정보 추출
 */
export function getErrorInfo(error: unknown): {
  message: string;
  stack?: string;
  name?: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
  }
  
  return {
    message: extractErrorMessage(error)
  };
}

/**
 * 에러 복구를 위한 재시도 로직
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`${context.operation} 시도 ${attempt}/${maxRetries}`);
      return await operation();
    } catch (error) {
      lastError = error;
      logger.warn(`${context.operation} 시도 ${attempt} 실패`, error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  logger.error(`${context.operation} 모든 재시도 실패`, lastError, context);
  throw lastError;
}