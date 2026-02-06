'use client';

import * as React from 'react';
import { FileText, Type } from 'lucide-react';
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
}

/**
 * Editor Toolbar 컴포넌트
 * 
 * Editor 상단 툴바 - 모드 전환 (블록/마크다운)
 * 저장/취소/자동저장 등은 Header로 이동됨
 */
export function Toolbar({
  maxWidth,
  mode,
  onModeChange,
}: ToolbarProps) {
  return (
    <div className="flex justify-center shrink-0 px-4">
      <div 
        className="flex items-center w-full px-4 py-2 min-h-[52px]"
        style={{ maxWidth }}
      >
        {/* 에디터 모드 전환 */}
        <div className="flex items-center gap-2">
          <SimpleTooltip content="블록 에디터">
            <Button
              variant={mode === 'block' ? 'default' : 'ghost'}
              size="default"
              onClick={() => onModeChange('block')}
              className="gap-1.5 h-control-h"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">블록</span>
            </Button>
          </SimpleTooltip>
          <SimpleTooltip content="마크다운">
            <Button
              variant={mode === 'markdown' ? 'default' : 'ghost'}
              size="default"
              onClick={() => onModeChange('markdown')}
              className="gap-1.5 h-control-h"
            >
              <Type className="h-4 w-4" />
              <span className="hidden sm:inline">마크다운</span>
            </Button>
          </SimpleTooltip>
        </div>
      </div>
    </div>
  );
}
