'use client';

import * as React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SecondGridToggleButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export function SecondGridToggleButton({
  isOpen,
  onToggle,
  className,
}: SecondGridToggleButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        'flex h-5 w-12 items-center justify-center',
        'rounded-b-md bg-ssoo-content-bg hover:bg-ssoo-sitemap-bg',
        'border border-b-0 border-ssoo-content-border',
        'transition-all duration-300 ease-in-out',
        className
      )}
      onClick={onToggle}
      aria-label={isOpen ? '상세 그리드 접기' : '상세 그리드 펼치기'}
    >
      {isOpen ? (
        <ChevronDown className="h-4 w-4 text-ssoo-primary/70" />
      ) : (
        <ChevronUp className="h-4 w-4 text-ssoo-primary/70" />
      )}
    </Button>
  );
}

interface SecondGridPanelProps {
  isOpen: boolean;
  height: number | string;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

export function SecondGridPanel({
  isOpen,
  height,
  onToggle,
  children,
  className,
}: SecondGridPanelProps) {
  const resolvedHeight = typeof height === 'number' ? `${height}px` : height;
  const maxHeight = `calc(${resolvedHeight} + 24px)`;

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 overflow-visible">
      <div
        className={cn(
          'rounded-lg border border-gray-200 bg-gray-50 shadow-lg',
          'transition-[max-height,opacity,transform] duration-300 ease-in-out',
          isOpen
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-2 pointer-events-none',
          className
        )}
        style={{ maxHeight: isOpen ? maxHeight : '0px', overflow: 'hidden' }}
      >
        <div className="bg-gray-50">
          <div className="overflow-auto" style={{ height: resolvedHeight }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
