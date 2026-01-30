'use client';

import * as React from 'react';
import { Edit, Trash2, History, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/StateDisplay';

/**
 * HeaderAction 액션 버튼 정의
 */
export interface HeaderAction {
  /** 버튼 라벨 */
  label: string;
  /** 아이콘 */
  icon?: React.ReactNode;
  /** 버튼 스타일 */
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost';
  /** 클릭 핸들러 */
  onClick: () => void;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 로딩 상태 */
  loading?: boolean;
}

/**
 * Header Props
 * PMS Header 참조 - 문서 특화
 */
export interface HeaderProps {
  /** 모드: viewer | editor | create */
  mode: 'viewer' | 'editor' | 'create';
  
  /** 뷰어 모드 액션 */
  onEdit?: () => void;
  onDelete?: () => void;
  onHistory?: () => void;
  
  /** 에디터/생성 모드 액션 */
  onSave?: () => void;
  onCancel?: () => void;
  
  /** 저장 중 상태 */
  saving?: boolean;
  
  /** 추가 액션 버튼 */
  extraActions?: HeaderAction[];
  
  /** 추가 className */
  className?: string;
}

/**
 * Header 컴포넌트
 * 
 * 문서 페이지의 헤더 (액션 버튼 + 검색)
 * 
 * @example
 * ```tsx
 * // 뷰어 모드
 * <Header
 *   mode="viewer"
 *   onEdit={() => setMode('editor')}
 *   onDelete={handleDelete}
 *   onSearch={handleSearch}
 * />
 * 
 * // 에디터 모드
 * <Header
 *   mode="editor"
 *   onSave={handleSave}
 *   onCancel={() => setMode('viewer')}
 *   saving={isSaving}
 * />
 * ```
 */
export function Header({
  mode,
  onEdit,
  onDelete,
  onHistory,
  onSave,
  onCancel,
  saving = false,
  extraActions,
  className,
}: HeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-3',
        'bg-white border border-gray-200 rounded-lg', // PMS 표준과 동일
        className
      )}
    >
      {/* 좌측: 모드별 액션 버튼 */}
      <div className="flex items-center gap-2">
        {mode === 'viewer' && (
          <>
            {onEdit && (
              <Button
                variant="default"
                size="default"
                onClick={onEdit}
                className="h-control-h"
              >
                <Edit className="h-4 w-4 mr-1.5" />
                수정
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="default"
                onClick={onDelete}
                className="h-control-h text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                삭제
              </Button>
            )}
            {onHistory && (
              <Button
                variant="ghost"
                size="default"
                onClick={onHistory}
                className="h-control-h"
              >
                <History className="h-4 w-4 mr-1.5" />
                히스토리
              </Button>
            )}
          </>
        )}

        {(mode === 'editor' || mode === 'create') && (
          <>
            {onSave && (
              <Button
                variant="default"
                size="default"
                onClick={onSave}
                disabled={saving}
                className="h-control-h"
              >
                {saving ? (
                  <LoadingSpinner className="mr-1.5" />
                ) : (
                  <Save className="h-4 w-4 mr-1.5" />
                )}
                저장
              </Button>
            )}
            {onCancel && (
              <Button
                variant="outline"
                size="default"
                onClick={onCancel}
                disabled={saving}
                className="h-control-h"
              >
                <X className="h-4 w-4 mr-1.5" />
                취소
              </Button>
            )}
          </>
        )}

        {/* 추가 액션 버튼 */}
        {extraActions?.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || 'ghost'}
            size="default"
            onClick={action.onClick}
          disabled={action.disabled || action.loading}
          className="h-control-h"
        >
          {action.loading ? (
            <LoadingSpinner className="mr-1.5" />
          ) : action.icon ? (
            <span className="mr-1.5">{action.icon}</span>
          ) : null}
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
