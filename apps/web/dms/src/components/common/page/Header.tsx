'use client';

import * as React from 'react';
import { Edit, Trash2, History, Save, X, Clock } from 'lucide-react';
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
  
  /** 자동 저장 관련 */
  isAutoSaveEnabled?: boolean;
  onAutoSaveToggle?: () => void;
  autoSaveCountdown?: number;
  lastSaveTime?: Date | null;
  
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
  isAutoSaveEnabled = false,
  onAutoSaveToggle,
  autoSaveCountdown = 0,
  lastSaveTime,
  extraActions,
  className,
}: HeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2 min-h-[52px]',
        'bg-white border border-gray-200 rounded-lg',
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
          </>
        )}

        {(mode === 'editor' || mode === 'create') && (
          <>
            {onCancel && (
              <Button
                variant="ghost"
                size="default"
                onClick={onCancel}
                disabled={saving}
                className="h-control-h"
              >
                <X className="h-4 w-4 mr-1.5" />
                취소
              </Button>
            )}
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
            {/* 자동 저장 토글 (저장 버튼 옆) */}
            {onAutoSaveToggle && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">자동저장</span>
                <button
                  onClick={onAutoSaveToggle}
                  className={cn(
                    'relative w-10 h-5 rounded-full transition-colors',
                    isAutoSaveEnabled ? 'bg-ssoo-primary' : 'bg-gray-300'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm',
                      isAutoSaveEnabled ? 'left-5' : 'left-0.5'
                    )}
                  />
                </button>
                {isAutoSaveEnabled && (
                  <span className="text-xs text-gray-500">
                    {autoSaveCountdown}초 뒤 자동 저장
                  </span>
                )}
              </div>
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

      {/* 우측 */}
      <div className="flex items-center gap-3">
        {/* 뷰어 모드: 히스토리 아이콘 버튼 */}
        {mode === 'viewer' && onHistory && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onHistory}
            className="h-control-h w-control-h"
          >
            <History className="h-4 w-4" />
          </Button>
        )}

        {/* 에디터/생성 모드 우측 */}
        {(mode === 'editor' || mode === 'create') && (
          <>
            {/* 마지막 저장 시간 */}
            {lastSaveTime && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="h-3 w-3" />
                <span>
                  마지막 저장: {lastSaveTime.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })} {lastSaveTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            )}
            {/* 삭제 버튼 (우측 끝) */}
            {onDelete && (
              <Button
                variant="destructive"
                size="default"
                onClick={onDelete}
                disabled={saving}
                className="h-control-h"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                삭제
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
