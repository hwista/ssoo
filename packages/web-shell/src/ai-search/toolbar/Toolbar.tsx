'use client';

import { Bot } from 'lucide-react';
import { cn } from '../../cn';
import type {
  SsooAiSearchViewerAssistantControls,
  SsooAiSearchViewerSearchControls,
  SsooAiSearchViewerTocControls,
  SsooAiSearchViewerZoomControls,
} from './toolbarTypes';
import { SsooAiSearchToolbarSearchControls } from './SearchControls';
import { SsooAiSearchToolbarTocMenu } from './TocMenu';
import { SsooAiSearchToolbarZoomControls } from './ZoomControls';
import { Button } from '@ssoo/web-ui';

export const ZOOM_LEVELS = [75, 100, 125, 150, 175, 200];
export const DEFAULT_ZOOM = 100;

export interface SsooAiSearchToolbarProps {
  maxWidth: number;
  variant?: 'standalone' | 'embedded';
  toc?: SsooAiSearchViewerTocControls;
  search: SsooAiSearchViewerSearchControls;
  assistant?: SsooAiSearchViewerAssistantControls;
  zoom?: SsooAiSearchViewerZoomControls;
}

export type ToolbarProps = SsooAiSearchToolbarProps;

export function SsooAiSearchToolbar({
  maxWidth,
  variant = 'standalone',
  toc,
  search,
  assistant,
  zoom,
}: SsooAiSearchToolbarProps) {
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
        <div className="z-0 flex min-w-0 items-center gap-2 overflow-visible pr-1">
          <SsooAiSearchToolbarTocMenu
            items={toc?.items}
            label={toc?.label}
            listStyle={toc?.listStyle}
            onItemClick={toc?.onItemClick}
          />
          <SsooAiSearchToolbarSearchControls
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
                variant="ghost"
                type="button"
                onClick={assistant.onAttach}
                className="gap-1.5 px-3 text-[0.8125rem] hover:bg-gray-100"
                title={assistant.title ?? '현재 문서를 AI에 첨부하고 질문하기'}
              >
                <Bot className="h-4 w-4" />
                AI
              </Button>
              {assistant.filterControl}
            </div>
          ) : null}
        </div>

        {canRenderZoomControls ? (
          <SsooAiSearchToolbarZoomControls
            level={zoom.level}
            onZoomIn={zoom.onZoomIn}
            onZoomOut={zoom.onZoomOut}
            onZoomReset={zoom.onZoomReset}
          />
        ) : null}
      </div>
    </div>
  );
}

export { SsooAiSearchToolbar as Toolbar };
