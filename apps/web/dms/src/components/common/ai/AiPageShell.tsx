'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AiPageShellProps {
  title: string;
  description?: string;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function AiPageShell({
  title,
  description,
  toolbar,
  footer,
  children,
  className,
  contentClassName,
}: AiPageShellProps) {
  return (
    <div className={cn('flex h-full flex-col', className)}>
      <header className="border-b border-ssoo-content-border px-6 py-4">
        <h1 className="text-xl font-semibold text-ssoo-primary">{title}</h1>
        {description && (
          <p className="text-sm text-ssoo-primary/70">{description}</p>
        )}
      </header>

      {toolbar && (
        <section className="border-b border-ssoo-content-border px-6 py-4">
          {toolbar}
        </section>
      )}

      <section className={cn('flex-1 overflow-auto px-6 py-6', contentClassName)}>
        {children}
      </section>

      {footer && (
        <footer className="border-t border-ssoo-content-border px-6 py-4">
          {footer}
        </footer>
      )}
    </div>
  );
}
