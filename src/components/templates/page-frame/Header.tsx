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
  
  /** 페이지 부가 설명 (헤더 왼쪽에 표시) */
  description?: string;
  
  /** 뷰어 모드 액션 */
  onEdit?: () => void;
  onDelete?: () => void;
  onHistory?: () => void;
  
  /** 에디터/생성 모드 액션 */
  onSave?: () => void;
  onCancel?: () => void;
  
  /** 저장 중 상태 */
  saving?: boolean;
  
  /** 미리보기 모드 (에디터 모드에서 미리보기 토글만 표시) */
  isPreview?: boolean;
  
  /** 추가 액션 버튼 */
  extraActions?: HeaderAction[];
  /** 추가 액션 버튼 위치 */
  extraActionsPosition?: 'left' | 'right';
  /** editor/create 모드 우측 슬롯 (저장 버튼 앞에 배치) */
  editorRightSlot?: React.ReactNode;
  /** editor/create 모드 좌측 슬롯 (취소 버튼 뒤에 배치) */
  editorPreviewSlot?: React.ReactNode;
  
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
  description,
  onEdit,
  onDelete,
  onHistory,
  onSave,
  onCancel,
  saving = false,
  isPreview = false,
  extraActions,
  extraActionsPosition = 'left',
  editorRightSlot,
  editorPreviewSlot,
  className,
}: HeaderProps) {
  const renderActionButton = (action: HeaderAction, index: number) => (
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
  );

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2 min-h-[52px]',
        'bg-white border border-ssoo-content-border rounded-lg text-ssoo-primary',
        className
      )}
    >
      {/* 좌측: 설명 또는 모드별 액션 버튼 */}
      <div className="flex items-center gap-2">
        {description && (
          <span className="text-sm text-ssoo-primary/70">{description}</span>
        )}
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
            {editorPreviewSlot}
          </>
        )}

        {extraActionsPosition === 'left' && extraActions?.map(renderActionButton)}
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

        {/* 에디터/생성 모드 우측: 주입 슬롯 → 저장 → 삭제 (미리보기 시 숨김) */}
        {(mode === 'editor' || mode === 'create') && !isPreview && (
          <>
            {editorRightSlot}
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

        {extraActionsPosition === 'right' && extraActions?.map(renderActionButton)}
      </div>
    </div>
  );
}
