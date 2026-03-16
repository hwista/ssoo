'use client';

import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TemplateSaveControlsProps {
  mode: 'viewer' | 'editor' | 'create';
  saveAsTemplateOnly: boolean;
  setSaveAsTemplateOnly: (next: boolean) => void;
}

export function TemplateSaveControls({
  mode,
  saveAsTemplateOnly,
  setSaveAsTemplateOnly,
}: TemplateSaveControlsProps) {
  if (mode !== 'editor') {
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
      variant={isPreview ? 'default' : 'ghost'}
      size="default"
      onClick={onToggle}
      className="h-control-h"
    >
      {isPreview ? <EyeOff className="mr-1.5 h-4 w-4" /> : <Eye className="mr-1.5 h-4 w-4" />}
      {isPreview ? '원본보기' : '미리보기'}
    </Button>
  );
}
