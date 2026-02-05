'use client';

import * as React from 'react';
import { Save, X, Copy, FileText, Type, Clock, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SimpleTooltip } from '@/components/ui/tooltip';
import type { EditorMode } from './Editor';

/**
 * Toolbar Props
 */
export interface ToolbarProps {
  /** 문서 최대 너비 */
  maxWidth: number;
  
  // 에디터 모드
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  
  // 저장 관련
  onSave: () => void;
  onTempSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  hasUnsavedChanges?: boolean;
  
  // 자동 저장
  isAutoSaveEnabled?: boolean;
  onAutoSaveToggle?: () => void;
  autoSaveCountdown?: number;
  lastSaveTime?: Date | null;
  
  // 문서 정보
  lineCount?: number;
  charCount?: number;
}

/**
 * Editor Toolbar 컴포넌트
 * 
 * Editor 상단 툴바 - 모드 전환, 저장, 취소, 문서 정보
 */
export function Toolbar({
  maxWidth,
  mode,
  onModeChange,
  onSave,
  onTempSave,
  onCancel,
  saving = false,
  hasUnsavedChanges = false,
  isAutoSaveEnabled = false,
  onAutoSaveToggle,
  autoSaveCountdown = 0,
  lastSaveTime,
  lineCount = 0,
  charCount = 0,
}: ToolbarProps) {
  return (
    <div className="flex justify-center shrink-0 px-4">
      <div 
        className="flex items-center justify-between w-full px-4 py-2 min-h-[52px]"
        style={{ maxWidth }}
      >
        {/* 좌측: 모드 전환 + 문서 정보 */}
        <div className="flex items-center gap-4">
          {/* 에디터 모드 전환 */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <SimpleTooltip content="블록 에디터">
              <Button
                variant={mode === 'block' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onModeChange('block')}
                className="h-control-h gap-1.5"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">블록</span>
              </Button>
            </SimpleTooltip>
            <SimpleTooltip content="마크다운">
              <Button
                variant={mode === 'markdown' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onModeChange('markdown')}
                className="h-control-h gap-1.5"
              >
                <Type className="h-4 w-4" />
                <span className="hidden sm:inline">마크다운</span>
              </Button>
            </SimpleTooltip>
          </div>

          {/* 문서 정보 */}
          <div className="hidden md:flex items-center gap-3 text-sm text-gray-500">
            <span>{lineCount}줄</span>
            <span>{charCount}자</span>
            {hasUnsavedChanges && (
              <span className="text-amber-600 bg-amber-50 rounded px-2 py-0.5 text-xs">
                수정됨
              </span>
            )}
          </div>
        </div>

        {/* 우측: 자동저장 + 저장 버튼들 */}
        <div className="flex items-center gap-2">
          {/* 자동 저장 토글 */}
          <div className="hidden sm:flex items-center gap-2 mr-2">
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
            {isAutoSaveEnabled && autoSaveCountdown > 0 && (
              <span className="text-xs text-blue-600">{autoSaveCountdown}초</span>
            )}
          </div>

          {/* 마지막 저장 시간 */}
          {lastSaveTime && (
            <div className="hidden lg:flex items-center gap-1 text-xs text-gray-400 mr-2">
              <Clock className="h-3 w-3" />
              <span>
                {lastSaveTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}

          {/* 임시 저장 */}
          <SimpleTooltip content="임시 저장 (편집 계속)">
            <Button
              variant="outline"
              size="default"
              onClick={onTempSave}
              disabled={saving || !hasUnsavedChanges}
              className="h-control-h gap-1.5"
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">임시저장</span>
            </Button>
          </SimpleTooltip>

          {/* 저장 */}
          <SimpleTooltip content="저장 후 종료 (Ctrl+S)">
            <Button
              variant="default"
              size="default"
              onClick={onSave}
              disabled={saving}
              className="h-control-h gap-1.5"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? '저장 중...' : '저장'}</span>
            </Button>
          </SimpleTooltip>

          {/* 취소 */}
          <SimpleTooltip content="편집 취소">
            <Button
              variant="ghost"
              size="default"
              onClick={onCancel}
              disabled={saving}
              className="h-control-h text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">취소</span>
            </Button>
          </SimpleTooltip>
        </div>
      </div>
    </div>
  );
}
