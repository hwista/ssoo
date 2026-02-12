'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AiPageShellProps {
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function AiPageShell({
  toolbar,
  footer,
  children,
  className,
  contentClassName,
}: AiPageShellProps) {
  return (
    <div className={cn('flex h-full flex-col', className)}>
      {toolbar && (
        <section className="border-b border-ssoo-content-border px-4 py-2 min-h-[52px] flex items-center">
          {toolbar}
        </section>
      )}

      <section className={cn('flex-1 overflow-auto p-4', contentClassName)}>
        {children}
      </section>

      {footer && (
        <footer className="border-t border-ssoo-content-border px-4 py-2 min-h-[52px] flex items-center">
          {footer}
        </footer>
      )}
    </div>
  );
}
