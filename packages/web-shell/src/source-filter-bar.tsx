'use client';

import type { ReactNode } from 'react';
import { SegmentedControl, SegmentedControlItem } from '@ssoo/web-ui';

export interface SsooSourceFilterItem {
  key: string;
  label: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  badge?: number | string | null;
  title?: string;
}

export interface SsooSourceFilterBarProps {
  filters: readonly SsooSourceFilterItem[];
  onSelect?: (filter: SsooSourceFilterItem) => void;
  className?: string;
}

function formatBadge(badge: number | string | null | undefined): string | null {
  if (typeof badge === 'number') {
    if (!Number.isFinite(badge) || badge < 0) return null;
    return badge > 99 ? '99+' : String(badge);
  }
  const text = badge?.trim();
  return text && text.length > 0 ? text : null;
}

export function SsooSourceFilterBar({
  filters,
  onSelect,
  className,
}: SsooSourceFilterBarProps) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <SegmentedControl className={className}>
      {filters.map((filter) => {
        const badge = formatBadge(filter.badge);
        return (
          <SegmentedControlItem
            key={filter.key}
            title={filter.title}
            selected={Boolean(filter.selected)}
            disabled={filter.disabled}
            onClick={() => onSelect?.(filter)}
            badge={badge}
          >
            {filter.label}
          </SegmentedControlItem>
        );
      })}
    </SegmentedControl>
  );
}
