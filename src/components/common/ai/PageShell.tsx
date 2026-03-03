'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AiPageShellProps {
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  toolbarClassName?: string;
}

export function AiPageShell({
  toolbar,
  footer,
  children,
  className,
  contentClassName,
  toolbarClassName,
}: AiPageShellProps) {
  return (
    <div className={cn('flex h-full flex-col', className)}>
      {toolbar && (
        <section className={cn('border-b border-ssoo-content-border px-4 py-2 min-h-[52px] flex items-center', toolbarClassName)}>
          {toolbar}
        </section>
      )}

      <section
        className={cn(
          'flex-1 overflow-auto border-x border-ssoo-content-border p-4',
          !footer && 'rounded-b-lg border-b',
          contentClassName
        )}
      >
        {children}
      </section>

      {footer && (
        <footer className="flex items-center rounded-b-lg border-x border-b border-t border-ssoo-content-border p-3">
          {footer}
        </footer>
      )}
    </div>
  );
}
