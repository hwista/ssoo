'use client';

import * as React from 'react';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ViewerAssistantControls, ViewerSearchControls, ViewerTocControls, ViewerZoomControls } from './toolbarTypes';
import { ToolbarSearchControls } from './SearchControls';
import { ToolbarTocMenu } from './TocMenu';
import { ToolbarZoomControls } from './ZoomControls';

// 줌 레벨 상수
export const ZOOM_LEVELS = [75, 100, 125, 150, 175, 200];
export const DEFAULT_ZOOM = 100;

/**
 * Toolbar Props
 */
export interface ToolbarProps {
  /** 문서 최대 너비 */
  maxWidth: number;
  /** 레이아웃 변형 */
  variant?: 'standalone' | 'embedded';
  toc?: ViewerTocControls;
  search: ViewerSearchControls;
  assistant?: ViewerAssistantControls;
  zoom?: ViewerZoomControls;
}

/**
 * Toolbar 컴포넌트
 * 
 * Viewer 상단 툴바 - 목차, 검색, 줌 컨트롤
 */
export function Toolbar({
  maxWidth,
  variant = 'standalone',
  toc,
  search,
  assistant,
  zoom,
}: ToolbarProps) {
  const isEmbedded = variant === 'embedded';
  const canRenderZoomControls = zoom?.show !== false && zoom?.level !== undefined;

  return (
    <div
      className={cn(
        'flex shrink-0',
        isEmbedded ? 'w-full' : 'justify-center'
      )}
    >
      <div
        className={cn('grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-visible')}
        style={isEmbedded ? undefined : { maxWidth }}
      >
        {/* 좌측: 목차 + 검색 */}
        <div className="z-0 flex min-w-0 items-center gap-2 overflow-visible pr-1">
          <ToolbarTocMenu
            items={toc?.items}
            label={toc?.label}
            listStyle={toc?.listStyle}
            onItemClick={toc?.onItemClick}
          />
          <ToolbarSearchControls
            query={search.query}
            placeholder={search.placeholder}
            onQueryChange={search.onQueryChange}
            onSubmit={search.onSubmit}
            onClose={search.onClose}
            hasSearched={search.hasSearched}
            resultCount={search.resultCount}
            currentResultIndex={search.currentResultIndex}
            onNavigateResult={search.onNavigateResult}
          />
          {assistant?.onAttach ? (
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="default"
                onClick={assistant.onAttach}
                className="h-control-h gap-1.5 text-ssoo-primary"
                title={assistant.title ?? '현재 문서를 AI에 첨부하고 질문하기'}
              >
                <Bot className="h-4 w-4" />
                AI
              </Button>
              {assistant.filterControl}
            </div>
          ) : null}
        </div>

        {/* 우측: 줌 컨트롤 */}
        {canRenderZoomControls && (
          <ToolbarZoomControls
            level={zoom.level}
            onZoomIn={zoom.onZoomIn}
            onZoomOut={zoom.onZoomOut}
            onZoomReset={zoom.onZoomReset}
          />
        )}
      </div>
    </div>
  );
}
