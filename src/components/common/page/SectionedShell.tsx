'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SectionedShellProps {
  toolbar?: React.ReactNode;
  body: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  toolbarClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
}

export function SectionedShell({
  toolbar,
  body,
  footer,
  className,
  toolbarClassName,
  bodyClassName,
  footerClassName,
}: SectionedShellProps) {
  return (
    <div className={cn('flex h-full flex-col', className)}>
      {toolbar != null && (
        <section
          className={cn(
            'flex min-h-[52px] shrink-0 items-center border-b border-ssoo-content-border bg-transparent',
            toolbarClassName
          )}
        >
          {toolbar}
        </section>
      )}
      <section className={cn('min-h-0 flex-1 flex flex-col overflow-hidden', bodyClassName)}>
        {body}
      </section>
      {footer != null && (
        <footer
          className={cn(
            'flex shrink-0 items-center border-t border-ssoo-content-border bg-transparent',
            footerClassName
          )}
        >
          {footer}
        </footer>
      )}
    </div>
  );
}
