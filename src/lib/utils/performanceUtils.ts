/**
 * 성능 유틸리티
 * 
 * Phase 2.1.5 Step 2에서 추가된 유틸리티 확장
 * 성능 측정, 메모리 관리, 최적화를 위한 유틸리티 함수들
 */

/**
 * 성능 측정 결과 인터페이스
 */
export interface PerformanceMetrics {
  duration: number; // 실행 시간 (ms)
  memory?: MemoryUsage;
  timestamp: number;
  operation: string;
  metadata?: Record<string, unknown>;
}

/**
 * 메모리 사용량 인터페이스
 */
export interface MemoryUsage {
  used: number; // 사용 중인 메모리 (bytes)
  total: number; // 전체 메모리 (bytes)
  percentage: number; // 사용률 (%)
}

/**
 * 성능 타이머 클래스
 */
export class PerformanceTimer {
  private startTime: number;
  private endTime?: number;
  private operation: string;
  private metadata: Record<string, unknown>;

  constructor(operation: string, metadata: Record<string, unknown> = {}) {
    this.operation = operation;
    this.metadata = metadata;
    this.startTime = performance.now();
  }

  /**
   * 타이머 종료 및 결과 반환
   */
  end(): PerformanceMetrics {
    this.endTime = performance.now();
    const duration = this.endTime - this.startTime;

    const metrics: PerformanceMetrics = {
      duration,
      timestamp: Date.now(),
      operation: this.operation,
      metadata: this.metadata
    };

    // 브라우저 환경에서 메모리 정보 추가
    if (typeof window !== 'undefined' && 'performance' in window) {
      const perf = window.performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } };
      if (perf.memory) {
        metrics.memory = {
          used: perf.memory.usedJSHeapSize,
          total: perf.memory.totalJSHeapSize,
          percentage: (perf.memory.usedJSHeapSize / perf.memory.totalJSHeapSize) * 100
        };
      }
    }

    return metrics;
  }

  /**
   * 현재까지의 경과 시간 반환
   */
  getElapsed(): number {
    return performance.now() - this.startTime;
  }
}

/**
 * 함수 실행 시간 측정
 */
export async function measurePerformance<T>(
  operation: string,
  fn: () => T | Promise<T>,
  metadata?: Record<string, unknown>
): Promise<{ result: T; metrics: PerformanceMetrics }> {
  const timer = new PerformanceTimer(operation, metadata);
  
  try {
    const result = await fn();
    const metrics = timer.end();
    return { result, metrics };
  } catch (error) {
    const metrics = timer.end();
    metrics.metadata = { ...metrics.metadata, error: error instanceof Error ? error.message : 'Unknown error' };
    throw error;
  }
}

/**
 * 함수 실행 시간 측정 (간단 버전)
 */
export function timeFunction<T extends unknown[], R>(
  fn: (...args: T) => R,
  operation?: string
): (...args: T) => R {
  return (...args: T): R => {
    const timer = new PerformanceTimer(operation || fn.name || 'anonymous');
    const result = fn(...args);
    const metrics = timer.end();
    
    // 결과에 성능 정보 첨부 (가능한 경우)
    if (typeof result === 'object' && result !== null) {
      (result as Record<string, unknown>).__performance = metrics;
    }
    
    return result;
  };
}

/**
 * 성능 모니터링 클래스
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxEntries: number;
  private isEnabled: boolean = true;

  constructor(maxEntries: number = 1000) {
    this.maxEntries = maxEntries;
  }

  /**
   * 모니터링 활성화/비활성화
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * 메트릭 기록
   */
  record(metrics: PerformanceMetrics): void {
    if (!this.isEnabled) return;

    this.metrics.push(metrics);
    
    // 최대 항목 수 제한
    if (this.metrics.length > this.maxEntries) {
      this.metrics.shift();
    }
  }

  /**
   * 특정 작업의 메트릭 조회
   */
  getMetrics(operation?: string): PerformanceMetrics[] {
    if (!operation) return [...this.metrics];
    return this.metrics.filter(m => m.operation === operation);
  }

  /**
   * 성능 통계 계산
   */
  getStats(operation?: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    totalDuration: number;
    percentiles: {
      p50: number;
      p90: number;
      p95: number;
      p99: number;
    };
  } {
    const relevantMetrics = operation ? this.getMetrics(operation) : this.metrics;
    
    if (relevantMetrics.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        totalDuration: 0,
        percentiles: { p50: 0, p90: 0, p95: 0, p99: 0 }
      };
    }

    const durations = relevantMetrics.map(m => m.duration).sort((a, b) => a - b);
    const count = durations.length;
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);

    return {
      count,
      avgDuration: totalDuration / count,
      minDuration: durations[0],
      maxDuration: durations[count - 1],
      totalDuration,
      percentiles: {
        p50: durations[Math.floor(count * 0.5)],
        p90: durations[Math.floor(count * 0.9)],
        p95: durations[Math.floor(count * 0.95)],
        p99: durations[Math.floor(count * 0.99)]
      }
    };
  }

  /**
   * 느린 작업 감지
   */
  getSlowOperations(thresholdMs: number = 1000): PerformanceMetrics[] {
    return this.metrics.filter(m => m.duration > thresholdMs);
  }

  /**
   * 메트릭 클리어
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * 메트릭 내보내기
   */
  export(): PerformanceMetrics[] {
    return [...this.metrics];
  }
}

/**
 * 디바운스 함수 생성
 */
export function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number
): (...args: T) => void {
  let timeoutId: NodeJS.Timeout | number;
  
  return (...args: T) => {
    clearTimeout(timeoutId as NodeJS.Timeout);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 스로틀 함수 생성
 */
export function throttle<T extends unknown[]>(
  fn: (...args: T) => void,
  interval: number
): (...args: T) => void {
  let lastCallTime = 0;
  let timeoutId: NodeJS.Timeout | number;
  
  return (...args: T) => {
    const now = Date.now();
    
    if (now - lastCallTime >= interval) {
      lastCallTime = now;
      fn(...args);
    } else {
      clearTimeout(timeoutId as NodeJS.Timeout);
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now();
        fn(...args);
      }, interval - (now - lastCallTime));
    }
  };
}

/**
 * 메모이제이션 함수
 */
export function memoize<T extends unknown[], R>(
  fn: (...args: T) => R,
  keyGenerator?: (...args: T) => string
): (...args: T) => R {
  const cache = new Map<string, R>();
  
  return (...args: T): R => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * LRU 캐시 구현
 */
export class LRUCache<K, V> {
  private maxSize: number;
  private cache = new Map<K, V>();

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // LRU: 접근된 항목을 맨 뒤로 이동
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 가장 오래된 항목 제거
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  values(): IterableIterator<V> {
    return this.cache.values();
  }
}

/**
 * 배치 처리 함수
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: {
    batchSize?: number;
    delay?: number;
    concurrency?: number;
  } = {}
): Promise<R[]> {
  const { batchSize = 10, delay = 0, concurrency = 1 } = options;
  const results: R[] = [];
  
  if (concurrency === 1) {
    // 순차 처리
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);
      
      if (delay > 0 && i + batchSize < items.length) {
        await sleep(delay);
      }
    }
  } else {
    // 병렬 처리
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      chunks.push(items.slice(i, i + batchSize));
    }

    const processChunk = async (chunk: T[]): Promise<R[]> => {
      return Promise.all(chunk.map(processor));
    };

    // 동시 실행 수 제한
    const semaphore = new Semaphore(concurrency);
    const chunkResults = await Promise.all(
      chunks.map(chunk => 
        semaphore.acquire().then(async () => {
          try {
            return await processChunk(chunk);
          } finally {
            semaphore.release();
          }
        })
      )
    );

    results.push(...chunkResults.flat());
  }
  
  return results;
}

/**
 * 세마포어 구현 (동시 실행 수 제한)
 */
export class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  release(): void {
    this.permits++;
    const next = this.waitQueue.shift();
    if (next) {
      this.permits--;
      next();
    }
  }
}

/**
 * 슬립 함수
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 메모리 사용량 모니터링
 */
export function getMemoryUsage(): MemoryUsage | null {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const perf = window.performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } };
    if (perf.memory) {
      return {
        used: perf.memory.usedJSHeapSize,
        total: perf.memory.totalJSHeapSize,
        percentage: (perf.memory.usedJSHeapSize / perf.memory.totalJSHeapSize) * 100
      };
    }
  }
  
  return null;
}

/**
 * 메모리 사용량 포맷팅
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 가비지 컬렉션 강제 실행 (개발 환경)
 */
export function forceGarbageCollection(): void {
  if (typeof window !== 'undefined') {
    const windowWithGc = window as Window & { gc?: () => void };
    if (windowWithGc.gc) {
      windowWithGc.gc();
    }
  }
}

/**
 * RAF 기반 애니메이션 프레임 스케줄러
 */
export class FrameScheduler {
  private tasks: Array<() => void> = [];
  private isRunning = false;

  schedule(task: () => void): void {
    this.tasks.push(task);
    if (!this.isRunning) {
      this.start();
    }
  }

  private start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    const processFrame = () => {
      if (this.tasks.length === 0) {
        this.isRunning = false;
        return;
      }

      const startTime = performance.now();
      const frameTime = 16.67; // 60fps = 16.67ms per frame
      
      while (this.tasks.length > 0 && (performance.now() - startTime) < frameTime) {
        const task = this.tasks.shift();
        if (task) task();
      }

      requestAnimationFrame(processFrame);
    };

    requestAnimationFrame(processFrame);
  }

  clear(): void {
    this.tasks = [];
  }
}

/**
 * 성능 최적화 팁 분석
 */
export function analyzePerformance(metrics: PerformanceMetrics[]): {
  recommendations: string[];
  issues: Array<{
    type: 'slow_operation' | 'memory_leak' | 'frequent_calls';
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
} {
  const recommendations: string[] = [];
  const issues: Array<{
    type: 'slow_operation' | 'memory_leak' | 'frequent_calls';
    description: string;
    severity: 'low' | 'medium' | 'high';
  }> = [];

  if (metrics.length === 0) {
    return { recommendations, issues };
  }

  // 느린 작업 감지
  const slowOperations = metrics.filter(m => m.duration > 1000);
  if (slowOperations.length > 0) {
    issues.push({
      type: 'slow_operation',
      description: `${slowOperations.length}개의 느린 작업이 감지되었습니다 (>1초)`,
      severity: 'high'
    });
    recommendations.push('느린 작업을 배치 처리나 비동기 처리로 최적화하세요.');
  }

  // 빈번한 호출 감지
  const operationCounts = new Map<string, number>();
  metrics.forEach(m => {
    operationCounts.set(m.operation, (operationCounts.get(m.operation) || 0) + 1);
  });

  for (const [operation, count] of operationCounts) {
    if (count > 100) {
      issues.push({
        type: 'frequent_calls',
        description: `${operation} 작업이 ${count}회 호출되었습니다`,
        severity: count > 500 ? 'high' : 'medium'
      });
      recommendations.push(`${operation} 작업에 메모이제이션이나 캐싱을 적용하세요.`);
    }
  }

  // 메모리 사용량 분석
  const memoryMetrics = metrics.filter(m => m.memory);
  if (memoryMetrics.length > 0) {
    const avgMemoryUsage = memoryMetrics.reduce((sum, m) => sum + (m.memory?.percentage || 0), 0) / memoryMetrics.length;
    
    if (avgMemoryUsage > 80) {
      issues.push({
        type: 'memory_leak',
        description: `평균 메모리 사용률이 ${avgMemoryUsage.toFixed(1)}%입니다`,
        severity: 'high'
      });
      recommendations.push('메모리 누수를 확인하고 불필요한 객체 참조를 제거하세요.');
    }
  }

  return { recommendations, issues };
}

// 전역 성능 모니터 인스턴스
export const globalPerformanceMonitor = new PerformanceMonitor();

// 전역 프레임 스케줄러 인스턴스
export const globalFrameScheduler = new FrameScheduler();

/**
 * 성능 유틸리티들 내보내기
 */
export const PerformanceUtils = {
  PerformanceTimer,
  PerformanceMonitor,
  LRUCache,
  Semaphore,
  FrameScheduler,
  measurePerformance,
  timeFunction,
  debounce,
  throttle,
  memoize,
  batchProcess,
  sleep,
  getMemoryUsage,
  formatBytes,
  forceGarbageCollection,
  analyzePerformance,
  globalPerformanceMonitor,
  globalFrameScheduler
};