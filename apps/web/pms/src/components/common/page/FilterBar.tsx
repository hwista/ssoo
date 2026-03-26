'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * 필터 필드 정의
 */
export interface FilterField {
  /** 필드 키 */
  key: string;
  /** 필드 타입 */
  type: 'text' | 'select' | 'date' | 'dateRange';
  /** 라벨 (옵션) */
  label?: string;
  /** Placeholder */
  placeholder?: string;
  /** 옵션 (select 타입) */
  options?: { label: string; value: string }[];
  /** 너비 */
  width?: string;
}

/**
 * 필터 값 타입 (문자열 기반)
 */
export type FilterValues = Record<string, string>;

/**
 * FilterBar Props
 */
export interface FilterBarProps {
  /** 필터 필드 목록 */
  fields: FilterField[];
  /** 현재 값들 */
  values: FilterValues;
  /** 값 변경 핸들러 */
  onChange: (key: string, value: string) => void;
  /** Enter 키로 검색 */
  onEnterSearch?: () => void;
  /** 추가 className */
  className?: string;
}

/**
 * FilterBar 컴포넌트
 * 
 * 검색 필터 필드들을 렌더링합니다.
 */
export function FilterBar({
  fields,
  values,
  onChange,
  onEnterSearch,
  className,
}: FilterBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onEnterSearch) {
      onEnterSearch();
    }
  };

  return (
    <div className={cn('flex items-center gap-3 flex-wrap', className)}>
      {fields.map((field) => {
        const value = values[field.key] ?? '';

        switch (field.type) {
          case 'text':
            return (
              <div key={field.key} style={{ width: field.width || '200px' }}>
                {field.label && (
                  <label className="block text-xs text-muted-foreground mb-1">
                    {field.label}
                  </label>
                )}
                <Input
                  placeholder={field.placeholder}
                  value={value}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-control-h"
                />
              </div>
            );

          case 'select':
            return (
              <div key={field.key} style={{ width: field.width || '150px' }}>
                {field.label && (
                  <label className="block text-xs text-muted-foreground mb-1">
                    {field.label}
                  </label>
                )}
                <Select
                  value={value || '__all__'}
                  onValueChange={(v) => onChange(field.key, v === '__all__' ? '' : v)}
                >
                  <SelectTrigger className="h-control-h">
                    <SelectValue placeholder={field.placeholder || '전체'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">전체</SelectItem>
                    {field.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );

          case 'date':
            return (
              <div key={field.key} style={{ width: field.width || '150px' }}>
                {field.label && (
                  <label className="block text-xs text-muted-foreground mb-1">
                    {field.label}
                  </label>
                )}
                <Input
                  type="date"
                  value={value}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  className="h-control-h"
                />
              </div>
            );

          case 'dateRange':
            const startValue = values[`${field.key}_start`] ?? '';
            const endValue = values[`${field.key}_end`] ?? '';
            return (
              <div key={field.key} className="flex items-center gap-2">
                {field.label && (
                  <label className="text-xs text-muted-foreground">
                    {field.label}
                  </label>
                )}
                <Input
                  type="date"
                  value={startValue}
                  onChange={(e) => onChange(`${field.key}_start`, e.target.value)}
                  className="h-control-h w-36"
                />
                <span className="text-muted-foreground">~</span>
                <Input
                  type="date"
                  value={endValue}
                  onChange={(e) => onChange(`${field.key}_end`, e.target.value)}
                  className="h-control-h w-36"
                />
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
