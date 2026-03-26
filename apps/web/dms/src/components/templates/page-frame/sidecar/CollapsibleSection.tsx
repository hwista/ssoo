'use client';

import * as React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CollapsibleSectionVariant = 'default' | 'dense';

export interface CollapsibleSectionProps {
  icon?: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  /** 타이틀 우측에 렌더링할 추가 요소 (접기 아이콘 왼쪽) */
  headerRight?: React.ReactNode;
  defaultOpen?: boolean;
  variant?: CollapsibleSectionVariant;
  children: React.ReactNode;
}

export function CollapsibleSection({
  icon,
  title,
  badge,
  headerRight,
  defaultOpen = true,
  variant = 'default',
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  React.useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  const isDense = variant === 'dense';

  return (
    <section className="border-b border-ssoo-content-border last:border-b-0">
      <div
        className={cn(
          'flex w-full items-center text-ssoo-primary',
          isDense ? 'gap-2 px-3 py-2 text-sm font-semibold' : 'gap-2 px-4 py-3 text-sm font-medium'
        )}
      >
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2 transition-colors hover:text-ssoo-primary/80"
        >
          {icon ?? <span className="h-4 w-4 shrink-0" aria-hidden />}
          <span className="text-left">{title}</span>
        </button>
        {headerRight}
        <span className="flex-1" />
        {badge}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="shrink-0 transition-colors hover:text-ssoo-primary/80"
        >
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-ssoo-primary/50" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-ssoo-primary/50" />
          )}
        </button>
      </div>
      {isOpen && <div className={cn(isDense ? 'px-3 pb-2.5' : 'px-4 pb-3')}>{children}</div>}
    </section>
  );
}
