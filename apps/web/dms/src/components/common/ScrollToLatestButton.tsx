'use client';

import { ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@ssoo/web-ui';

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
    <Button
      variant="outline"
      size="icon"
      type="button"
      onClick={onClick}
      className={cn(
        'pointer-events-auto absolute bottom-4 right-4 z-20 h-9 w-9 rounded-full shadow-lg hover:border-ssoo-primary/40',
        className,
      )}
      title={label}
      aria-label={label}
    >
      <ArrowDown className="h-4 w-4" />
    </Button>
  );
}
