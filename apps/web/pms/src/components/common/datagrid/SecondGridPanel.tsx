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
  children: React.ReactNode;
  className?: string;
}

export function SecondGridPanel({
  isOpen,
  height,
  children,
  className,
}: SecondGridPanelProps) {
  const panelHeight = typeof height === 'number' ? `${height}px` : height;
  const maxHeight = `calc(${panelHeight} + 24px)`;

  return (
    <div
      className={cn(
        'absolute bottom-0 left-[5px] right-[5px] z-10 overflow-visible',
        className
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-lg border border-ssoo-content-border bg-ssoo-content-bg shadow-[0_-4px_16px_rgba(0,0,0,0.15)]',
          'transition-all duration-300 ease-in-out',
          isOpen ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2'
        )}
        style={{ maxHeight: isOpen ? maxHeight : 0 }}
      >
        <div className="bg-gray-50">
          <div className="overflow-auto" style={{ height: panelHeight }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
