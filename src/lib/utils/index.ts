/**
 * Utility Functions
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind CSS 클래스 병합 유틸리티
 * clsx로 조건부 클래스 처리 후 tailwind-merge로 충돌 해결
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 파일 처리
export * from './fileUtils';

// 경로 처리
export * from './pathUtils';

// 에러 처리
export * from './errorUtils';

// 상수
export * from './constants';

// API 클라이언트
export * from './apiClient';
