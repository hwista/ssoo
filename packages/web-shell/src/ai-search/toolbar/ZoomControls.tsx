'use client';

import { ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '../../cn';
import { ZOOM_LEVELS } from './Toolbar';
import type { SsooAiSearchViewerZoomControls } from './toolbarTypes';
import { Button } from '@ssoo/web-ui';

function toolbarIconButtonClass(className?: string) {
  return cn(
    'inline-flex h-control-h w-control-h items-center justify-center rounded-md transition-colors hover:bg-gray-100 disabled:pointer-events-none disabled:opacity-50',
    className
  );
}

export function SsooAiSearchToolbarZoomControls({
  level,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: SsooAiSearchViewerZoomControls) {
  return (
    <div className="pointer-events-auto relative z-30 flex shrink-0 items-center gap-0.5 justify-self-end pl-2 pr-2">
      <Button variant="plain" size="plain"
        type="button"
        onClick={() => onZoomOut?.()}
        disabled={!onZoomOut || level === ZOOM_LEVELS[0]}
        className={toolbarIconButtonClass('relative z-30 p-0')}
        title="축소"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>

      <Button variant="plain" size="plain"
        type="button"
        onClick={() => onZoomReset?.()}
        disabled={!onZoomReset}
        className="relative z-30 h-control-h min-w-[50px] rounded px-2 text-body-sm transition-colors hover:bg-gray-100"
        title="기본 크기로"
      >
        {level}%
      </Button>

      <Button variant="plain" size="plain"
        type="button"
        onClick={() => onZoomIn?.()}
        disabled={!onZoomIn || level === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
        className={toolbarIconButtonClass('relative z-40 mr-1 p-0')}
        title="확대"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
    </div>
  );
}

export { SsooAiSearchToolbarZoomControls as ToolbarZoomControls };
