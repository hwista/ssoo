'use client';

import * as React from 'react';
import { Edit, Trash2, History, Save, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/StateDisplay';
import { SimpleTooltip } from '@/components/ui/tooltip';

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
  
  /** 변경사항 있음 */
  hasUnsavedChanges?: boolean;
  
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
  hasUnsavedChanges = false,
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
      {/* ── 뷰어 모드 ── */}
      {mode === 'viewer' && (
        <>
          {/* 좌측: 수정 버튼 */}
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button variant="default" size="default" onClick={onEdit} className="h-control-h">
                <Edit className="h-4 w-4 mr-1.5" />수정
              </Button>
            )}
          </div>
          {/* 우측: 히스토리 아이콘 */}
          <div className="flex items-center gap-2">
            {onHistory && (
              <SimpleTooltip content="변경 이력">
                <Button variant="ghost" size="default" onClick={onHistory} className="h-control-h px-2">
                  <History className="h-4 w-4" />
                </Button>
              </SimpleTooltip>
            )}
          </div>
        </>
      )}

      {/* ── 에디터/생성 모드 ── */}
      {(mode === 'editor' || mode === 'create') && (
        <>
          {/* 좌측: 취소, 저장, 자동저장 토글 */}
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button variant="outline" size="default" onClick={onCancel} disabled={saving} className="h-control-h">
                <X className="h-4 w-4 mr-1.5" />취소
              </Button>
            )}
            {onSave && (
              <Button variant="default" size="default" onClick={onSave} disabled={saving} className="h-control-h">
                {saving ? <LoadingSpinner className="mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}저장
              </Button>
            )}
            {/* 자동 저장 토글 */}
            {onAutoSaveToggle && (
              <div className="flex items-center gap-2 ml-2">
                <span className="text-sm text-gray-500">자동저장</span>
                <button onClick={onAutoSaveToggle}
                  className={cn('relative w-10 h-5 rounded-full transition-colors',
                    isAutoSaveEnabled ? 'bg-ssoo-primary' : 'bg-gray-300')}>
                  <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm',
                    isAutoSaveEnabled ? 'left-5' : 'left-0.5')} />
                </button>
                {isAutoSaveEnabled && autoSaveCountdown > 0 && (
                  <span className="text-xs text-ssoo-primary">{autoSaveCountdown}초</span>
                )}
              </div>
            )}
          </div>

          {/* 우측: 마지막 저장 시간 + 삭제 버튼 */}
          <div className="flex items-center gap-3">
            {lastSaveTime && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="h-3 w-3" />
                <span>{lastSaveTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
            {onDelete && (
              <Button variant="destructive" size="default" onClick={onDelete} className="h-control-h">
                <Trash2 className="h-4 w-4 mr-1.5" />삭제
              </Button>
            )}
          </div>
        </>
      )}

      {/* 추가 액션 버튼 (모든 모드) */}
      {extraActions && extraActions.length > 0 && (
        <div className="flex items-center gap-2">
          {extraActions.map((action, index) => (
            <Button key={index} variant={action.variant || 'ghost'} size="default"
              onClick={action.onClick} disabled={action.disabled || action.loading} className="h-control-h">
              {action.loading ? <LoadingSpinner className="mr-1.5" />
                : action.icon ? <span className="mr-1.5">{action.icon}</span> : null}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
