'use client';

import type { ReactNode } from 'react';
import { cn } from './cn';
import { SSOO_PAGE_CHROME_CLASSES } from './page-chrome-metrics';

export interface SsooPageChromeStackProps {
  breadcrumbSlot: ReactNode;
  headerSlot: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SsooPageChromeStack({
  breadcrumbSlot,
  headerSlot,
  children,
  className,
}: SsooPageChromeStackProps) {
  return (
    <div className={cn(SSOO_PAGE_CHROME_CLASSES.stack, className)}>
      {breadcrumbSlot}
      {headerSlot}
      {children}
    </div>
  );
}
