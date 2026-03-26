'use client';

import { ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ZOOM_LEVELS } from './Toolbar';
import type { ViewerZoomControls } from './toolbarTypes';

export function ToolbarZoomControls({
  level,
  onZoomIn,
  onZoomOut,
  onZoomReset,
}: ViewerZoomControls) {
  return (
    <div className="pointer-events-auto relative z-30 flex shrink-0 items-center gap-0.5 justify-self-end pl-2 pr-2">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onZoomOut?.()}
        disabled={!onZoomOut || level === ZOOM_LEVELS[0]}
        className="relative z-30 p-0"
        title="축소"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>

      <button
        type="button"
        onClick={() => onZoomReset?.()}
        disabled={!onZoomReset}
        className="relative z-30 h-control-h min-w-[50px] rounded px-2 text-body-sm transition-colors hover:bg-gray-100"
        title="기본 크기로"
      >
        {level}%
      </button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onZoomIn?.()}
        disabled={!onZoomIn || level === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
        className="relative z-40 mr-1 p-0"
        title="확대"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
    </div>
  );
}
