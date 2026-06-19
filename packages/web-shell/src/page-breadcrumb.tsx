'use client';

import type { ReactNode } from 'react';
import {
  SSOO_PAGE_CHROME_CLASSES,
  SSOO_PAGE_CHROME_METRICS,
} from './page-chrome-metrics';
import { Button } from '@ssoo/web-ui';

export interface SsooPageBreadcrumbItem {
  id?: string;
  label: ReactNode;
  path?: string;
  title?: string;
}

export interface SsooPageBreadcrumbProps {
  items: SsooPageBreadcrumbItem[];
  lastItemLabel?: ReactNode;
  rootIconSlot?: ReactNode;
  separatorSlot?: ReactNode;
  onRootClick?: () => void;
  onItemClick?: (item: SsooPageBreadcrumbItem, index: number) => void;
  isEditing?: boolean;
  ariaLabel?: string;
  className?: string;
}

function DefaultSeparator() {
  return (
    <span
      aria-hidden
      className="mx-1 h-2 w-2 shrink-0 rotate-[-45deg] border-b border-r border-gray-400"
    />
  );
}

export function SsooPageBreadcrumb({
  items,
  lastItemLabel,
  rootIconSlot,
  separatorSlot,
  onRootClick,
  onItemClick,
  isEditing = false,
  ariaLabel = '페이지 경로',
  className,
}: SsooPageBreadcrumbProps) {
  if (items.length === 0) {
    return null;
  }

  const pathNavigationEnabled = typeof onItemClick === 'function';
  const separator = separatorSlot ?? <DefaultSeparator />;
  const breadcrumbClassName = [
    SSOO_PAGE_CHROME_CLASSES.breadcrumb,
    className,
  ].filter(Boolean).join(' ');

  return (
    <nav
      className={breadcrumbClassName}
      style={{
        height: SSOO_PAGE_CHROME_METRICS.breadcrumbHeightPx,
        minHeight: SSOO_PAGE_CHROME_METRICS.breadcrumbHeightPx,
      }}
      aria-label={ariaLabel}
    >
      {rootIconSlot ? (
        onRootClick ? (
          <Button variant="plain" size="plain"
            type="button"
            onClick={onRootClick}
            className="flex shrink-0 items-center transition-colors hover:text-ssoo-primary"
            aria-label="루트로 이동"
          >
            {rootIconSlot}
          </Button>
        ) : (
          <span className="flex shrink-0 items-center ssoo-text-primary-70">{rootIconSlot}</span>
        )
      ) : null}

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const label = isLast && lastItemLabel ? lastItemLabel : item.label;
        const key = item.id ?? item.path ?? index;

        return (
          <span key={key} className="contents">
            {separator}
            {isLast ? (
              <span
                className="flex shrink-0 items-center gap-1 text-label-md text-ssoo-primary"
                title={item.title}
              >
                {label}
                {isEditing ? (
                  <span className="inline-block h-1.5 w-1.5 rounded-full ssoo-bg-primary-60" />
                ) : null}
              </span>
            ) : pathNavigationEnabled ? (
              <Button variant="plain" size="plain"
                type="button"
                onClick={() => onItemClick?.(item, index)}
                className="shrink-0 transition-colors hover:text-ssoo-primary hover:underline"
                title={item.title}
              >
                {label}
              </Button>
            ) : (
              <span className="shrink-0 text-gray-500" title={item.title}>
                {label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
