'use client';

import * as React from 'react';
import { ChevronDown, ChevronRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CollapsibleSectionVariant = 'default' | 'dense';

export interface CollapsibleSectionProps {
  icon?: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  /** 타이틀 우측에 렌더링할 추가 요소 (접기 아이콘 왼쪽) */
  headerRight?: React.ReactNode;
  defaultOpen?: boolean;
  locked?: boolean;
  variant?: CollapsibleSectionVariant;
  children: React.ReactNode;
}

export function CollapsibleSection({
  icon,
  title,
  badge,
  headerRight,
  defaultOpen = true,
  locked = false,
  variant = 'default',
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  React.useEffect(() => {
    setIsOpen(locked ? false : defaultOpen);
  }, [defaultOpen, locked]);

  const isDense = variant === 'dense';
  const canToggle = !locked;
  const toggle = () => {
    if (!canToggle) return;
    setIsOpen((prev) => !prev);
  };

  return (
    <section className="border-b border-ssoo-content-border last:border-b-0">
      <div
        className={cn(
          'flex w-full items-center text-ssoo-primary',
          isDense ? 'gap-2 px-3 py-2 text-label-strong' : 'gap-2 px-4 py-3 text-label-md'
        )}
      >
        <button
          type="button"
          onClick={toggle}
          disabled={!canToggle}
          className={cn(
            'flex items-center gap-2 transition-colors',
            canToggle ? 'hover:text-ssoo-primary/80' : 'cursor-default text-ssoo-primary/70',
          )}
        >
          <span
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center [&>svg]:m-0 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0"
            aria-hidden
          >
            {icon}
          </span>
          <span className="text-left">{title}</span>
        </button>
        {headerRight}
        <span className="flex-1" />
        {badge}
        {locked ? (
          <Lock className="h-3.5 w-3.5 shrink-0 text-ssoo-primary/45" aria-label="잠김" />
        ) : (
          <button
            type="button"
            onClick={toggle}
            className="shrink-0 transition-colors hover:text-ssoo-primary/80"
          >
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-ssoo-primary/50" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-ssoo-primary/50" />
            )}
          </button>
        )}
      </div>
      {!locked && isOpen && <div className={cn(isDense ? 'px-3 pb-2.5' : 'px-4 pb-3')}>{children}</div>}
    </section>
  );
}
