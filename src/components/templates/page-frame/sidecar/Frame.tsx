'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SidecarFrameProps {
  title?: string;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function SidecarFrame({
  title,
  className,
  headerClassName,
  bodyClassName,
  footerClassName,
  children,
  footer,
}: SidecarFrameProps) {
  return (
    <div className={cn('flex h-full flex-col', className)}>
      {title ? (
        <div className={cn('border-b border-ssoo-content-border px-4 py-3', headerClassName)}>
          <h3 className="text-label-strong text-ssoo-primary">{title}</h3>
        </div>
      ) : null}
      <div className={cn('flex-1 overflow-auto', bodyClassName)}>
        {children}
      </div>
      {footer ? (
        <div className={cn('shrink-0 border-t border-ssoo-content-border', footerClassName)}>
          {footer}
        </div>
      ) : null}
    </div>
  );
}
