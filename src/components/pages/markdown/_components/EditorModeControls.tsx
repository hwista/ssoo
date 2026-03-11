'use client';

import { Eye, EyeOff, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TemplateSaveControlsProps {
  mode: 'viewer' | 'editor' | 'create';
  saveAsTemplateOnly: boolean;
  setSaveAsTemplateOnly: (next: boolean) => void;
  createPath: string;
  setCreatePath: (next: string) => void;
  isRecommendingPath: boolean;
  onRecommendPath: () => void;
}

export function TemplateSaveControls({
  mode,
  saveAsTemplateOnly,
  setSaveAsTemplateOnly,
  createPath,
  setCreatePath,
  isRecommendingPath,
  onRecommendPath,
}: TemplateSaveControlsProps) {
  if (mode !== 'editor' && mode !== 'create') {
    return null;
  }

  return (
    <div className="ml-2 flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={saveAsTemplateOnly}
        onClick={() => setSaveAsTemplateOnly(!saveAsTemplateOnly)}
        className={cn(
          'inline-flex h-control-h items-center gap-2 px-1 text-xs font-medium text-ssoo-primary transition-colors'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
            saveAsTemplateOnly ? 'bg-ssoo-primary' : 'bg-ssoo-content-border'
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
              saveAsTemplateOnly ? 'translate-x-4' : 'translate-x-0.5'
            )}
          />
        </span>
        <span>템플릿으로 저장</span>
      </button>

      {mode === 'create' ? (
        <>
          <input
            value={createPath}
            onChange={(event) => setCreatePath(event.target.value)}
            placeholder="생성 경로 (예: design/order/request.md)"
            disabled={saveAsTemplateOnly}
            className="h-control-h w-[420px] max-w-[42vw] rounded-md border border-ssoo-content-border bg-white px-3 text-sm text-ssoo-primary placeholder:text-ssoo-primary/45 focus:outline-none focus:ring-1 focus:ring-ssoo-primary disabled:cursor-not-allowed disabled:bg-ssoo-content-bg/40 disabled:text-ssoo-primary/45"
          />
          <button
            type="button"
            onClick={onRecommendPath}
            disabled={isRecommendingPath || saveAsTemplateOnly}
            className="inline-flex h-control-h items-center gap-1 rounded-md border border-ssoo-content-border bg-white px-3 text-xs font-medium text-ssoo-primary hover:border-ssoo-primary/40 disabled:opacity-60"
          >
            {isRecommendingPath ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            경로 추천
          </button>
        </>
      ) : null}
    </div>
  );
}

interface PreviewToggleButtonProps {
  mode: 'viewer' | 'editor' | 'create';
  isPreview: boolean;
  onToggle: () => void;
}

export function PreviewToggleButton({ mode, isPreview, onToggle }: PreviewToggleButtonProps) {
  if (mode !== 'editor' && mode !== 'create') {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="default"
      onClick={onToggle}
      className="h-control-h"
    >
      {isPreview ? <EyeOff className="mr-1.5 h-4 w-4" /> : <Eye className="mr-1.5 h-4 w-4" />}
      {isPreview ? '원본보기' : '미리보기'}
    </Button>
  );
}
