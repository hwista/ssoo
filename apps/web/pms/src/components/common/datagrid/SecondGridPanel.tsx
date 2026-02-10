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
        'flex h-12 w-5 items-center justify-center',
        'rounded-l-md bg-gray-100 hover:bg-gray-200',
        'border border-r-0 border-gray-200',
        'transition-all duration-300 ease-in-out',
        className
      )}
      onClick={onToggle}
      aria-label={isOpen ? '상세 그리드 접기' : '상세 그리드 펼치기'}
    >
      {isOpen ? (
        <ChevronDown className="h-4 w-4 text-gray-500" />
      ) : (
        <ChevronUp className="h-4 w-4 text-gray-500" />
      )}
    </Button>
  );
}

interface SecondGridPanelProps {
  isOpen: boolean;
  height: number;
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
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-2 z-10 rounded-lg border border-gray-200 bg-white shadow-lg',
        className
      )}
    >
      <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-transparent border-transparent pointer-events-none">
        <SecondGridToggleButton
          isOpen={isOpen}
          onToggle={onToggle}
          className="pointer-events-auto"
        />
      </div>
      <div className="pt-6">
        <div className="overflow-auto" style={{ height }}>
          {children}
        </div>
      </div>
    </div>
  );
}
