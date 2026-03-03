'use client';

import * as React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CollapsibleSectionProps {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export function CollapsibleSection({
  icon,
  title,
  badge,
  defaultOpen = true,
  children,
  className,
  headerClassName,
  contentClassName,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <section className={cn('border-b border-gray-200 last:border-b-0', className)}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          'flex w-full items-center py-2 text-sm font-semibold text-ssoo-primary transition-colors hover:text-ssoo-primary/80',
          headerClassName
        )}
      >
        {icon}
        <span className="flex-1 text-left">{title}</span>
        {badge}
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 ml-1 shrink-0 text-ssoo-primary/50" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 ml-1 shrink-0 text-ssoo-primary/50" />
        )}
      </button>
      {isOpen && <div className={cn('pb-3', contentClassName)}>{children}</div>}
    </section>
  );
}
