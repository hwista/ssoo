'use client';

import { Eye, EyeOff, GitCompareArrows } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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
    <SimpleTooltip content={isPreview ? '원본보기' : '미리보기'}>
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="bg-ssoo-content-bg hover:bg-ssoo-content-bg/80"
      >
        {isPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </SimpleTooltip>
  );
}

interface DiffToggleButtonProps {
  mode: 'viewer' | 'editor' | 'create';
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

export function DiffToggleButton({ mode, active, disabled = false, onToggle }: DiffToggleButtonProps) {
  if (mode !== 'editor' && mode !== 'create') {
    return null;
  }

  return (
    <SimpleTooltip content="이전보기">
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        disabled={disabled}
        className={active ? 'bg-ssoo-content-bg hover:bg-ssoo-content-bg/80' : undefined}
      >
        <GitCompareArrows className="h-4 w-4" />
      </Button>
    </SimpleTooltip>
  );
}

interface DiffTargetToggleProps {
  value: 'content' | 'metadata';
  onChange: (value: 'content' | 'metadata') => void;
}

export function DiffTargetToggle({ value, onChange }: DiffTargetToggleProps) {
  return (
    <div className="inline-flex h-control-h items-center rounded-md border border-ssoo-content-border bg-ssoo-content-bg p-1">
      <button
        type="button"
        onClick={() => onChange('content')}
        className={cn(
          'rounded px-3 py-1 text-[0.8125rem] transition-colors',
          value === 'content' ? 'bg-white text-ssoo-primary shadow-sm' : 'text-ssoo-primary/60 hover:text-ssoo-primary'
        )}
      >
        본문
      </button>
      <button
        type="button"
        onClick={() => onChange('metadata')}
        className={cn(
          'rounded px-3 py-1 text-[0.8125rem] transition-colors',
          value === 'metadata' ? 'bg-white text-ssoo-primary shadow-sm' : 'text-ssoo-primary/60 hover:text-ssoo-primary'
        )}
      >
        메타데이터
      </button>
    </div>
  );
}
