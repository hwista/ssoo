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

// Icons
export { getIconComponent, hasIcon } from './icons';

// 추후 추가
// export { formatDate, formatNumber, formatCurrency } from './format';
// export { debounce } from './debounce';
