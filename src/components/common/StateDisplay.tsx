'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * LoadingState Props
 */
export interface LoadingStateProps {
  /** 로딩 메시지 */
  message?: string;
  /** 전체 높이 사용 (화면 중앙 배치) */
  fullHeight?: boolean;
  /** 스피너 크기 */
  size?: 'sm' | 'md';
  /** 추가 className */
  className?: string;
}

/**
 * LoadingState 컴포넌트
 */
export function LoadingState({
  message = '데이터를 불러오는 중...',
  fullHeight = false,
  size = 'md',
  className,
}: LoadingStateProps) {
  const sizeClasses = size === 'sm' ? 'h-4 w-4' : 'h-8 w-8';
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        fullHeight ? 'min-h-[calc(100vh-200px)]' : 'py-12',
        className
      )}
    >
      <Loader2 className={cn(sizeClasses, 'animate-spin text-muted-foreground')} />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * LoadingSpinner Props
 */
export interface LoadingSpinnerProps {
  /** 크기 */
  size?: 'sm' | 'md';
  /** 추가 className */
  className?: string;
}

/**
 * LoadingSpinner 컴포넌트
 * - 버튼/인라인 로딩용
 */
export function LoadingSpinner({
  size = 'sm',
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = size === 'sm' ? 'h-4 w-4' : 'h-8 w-8';
  return (
    <Loader2 className={cn(sizeClasses, 'animate-spin text-muted-foreground', className)} />
  );
}
