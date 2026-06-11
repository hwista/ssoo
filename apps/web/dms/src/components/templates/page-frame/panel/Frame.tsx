'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PanelFrameProps {
  title?: string;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  bodyRef?: React.Ref<HTMLDivElement>;
  floatingContent?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function PanelFrame({
  title,
  className,
  headerClassName,
  bodyClassName,
  footerClassName,
  bodyRef,
  floatingContent,
  children,
  footer,
}: PanelFrameProps) {
  return (
    <div className={cn('relative flex h-full flex-col', className)}>
      {title ? (
        <div className={cn('border-b border-ssoo-content-border px-4 py-3', headerClassName)}>
          <h3 className="text-label-strong text-ssoo-primary">{title}</h3>
        </div>
      ) : null}
      <div ref={bodyRef} className={cn('flex-1 overflow-auto', bodyClassName)}>
        {children}
      </div>
      {footer ? (
        <div className={cn('shrink-0 border-t border-ssoo-content-border', footerClassName)}>
          {footer}
        </div>
      ) : null}
      {floatingContent ? (
        <div className="pointer-events-none absolute inset-0 z-20">
          {floatingContent}
        </div>
      ) : null}
    </div>
  );
}
