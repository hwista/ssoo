'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '../StateDisplay';

/**
 * FormSection Props
 */
export interface FormSectionProps {
  /** 섹션 제목 */
  title: string;
  /** 섹션 설명 */
  description?: string;
  /** 폼 필드들 */
  children: React.ReactNode;
  /** 추가 className */
  className?: string;
}

/**
 * FormSection 컴포넌트
 * 
 * 폼 필드들을 그룹화하여 표시합니다.
 */
export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="border-b pb-2">
        <h3 className="heading-3">{title}</h3>
        {description && (
          <p className="body-text-muted">{description}</p>
        )}
      </div>
      <div className="grid gap-4">{children}</div>
    </div>
  );
}

/**
 * FormActions Props
 */
export interface FormActionsProps {
  /** 저장 핸들러 */
  onSubmit?: () => void;
  /** 취소 핸들러 */
  onCancel?: () => void;
  /** 삭제 핸들러 */
  onDelete?: () => void;
  /** 저장 버튼 라벨 */
  submitLabel?: string;
  /** 취소 버튼 라벨 */
  cancelLabel?: string;
  /** 삭제 버튼 라벨 */
  deleteLabel?: string;
  /** 로딩 상태 */
  loading?: boolean;
  /** 저장 버튼 비활성화 */
  submitDisabled?: boolean;
  /** 삭제 버튼 표시 여부 */
  showDelete?: boolean;
  /** 추가 className */
  className?: string;
}

/**
 * FormActions 컴포넌트
 * 
 * 폼 하단의 액션 버튼들을 표시합니다.
 */
export function FormActions({
  onSubmit,
  onCancel,
  onDelete,
  submitLabel = '저장',
  cancelLabel = '취소',
  deleteLabel = '삭제',
  loading = false,
  submitDisabled = false,
  showDelete = false,
  className,
}: FormActionsProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between border-t pt-4 mt-6',
        className
      )}
    >
      {/* 좌측: 삭제 버튼 */}
      <div>
        {showDelete && onDelete && (
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            disabled={loading}
          >
            {deleteLabel}
          </Button>
        )}
      </div>

      {/* 우측: 취소/저장 버튼 */}
      <div className="flex items-center gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
        )}
        {onSubmit && (
          <Button
            type="submit"
            onClick={onSubmit}
            disabled={loading || submitDisabled}
          >
            {loading && <LoadingSpinner className="icon-body" />}
            {submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * FormField Props
 */
export interface FormFieldProps {
  /** 라벨 */
  label: string;
  /** 필수 여부 */
  required?: boolean;
  /** 에러 메시지 */
  error?: string;
  /** 도움말 */
  hint?: string;
  /** 폼 컨트롤 */
  children: React.ReactNode;
  /** 추가 className */
  className?: string;
}

/**
 * FormField 컴포넌트
 * 
 * 라벨, 에러, 힌트를 포함한 폼 필드 래퍼입니다.
 */
export function FormField({
  label,
  required,
  error,
  hint,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="body-text font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
      {error && <p className="body-text text-destructive">{error}</p>}
      {!error && hint && (
        <p className="body-text-muted">{hint}</p>
      )}
    </div>
  );
}
