'use client';

import { ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ScrollToLatestButtonProps {
  visible: boolean;
  onClick: () => void;
  label?: string;
  className?: string;
}

export function ScrollToLatestButton({
  visible,
  onClick,
  label = '최신 위치로 이동',
  className,
}: ScrollToLatestButtonProps) {
  if (!visible) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'pointer-events-auto absolute bottom-4 right-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-ssoo-content-border bg-white text-ssoo-primary shadow-lg transition-colors hover:border-ssoo-primary/40 hover:bg-ssoo-content-bg',
        className,
      )}
      title={label}
      aria-label={label}
    >
      <ArrowDown className="h-4 w-4" />
    </button>
  );
}
