'use client';

import * as React from 'react';
import { CollapsibleSection } from '../CollapsibleSection';
import { cn } from '@/lib/utils';
import type { CollapsibleSectionVariant } from '../CollapsibleSection';

export interface ActivityAction {
  id: string;
  label?: string;
  icon?: React.ReactNode;
  kind?: 'text' | 'icon';
  tone?: 'default' | 'danger';
  title?: string;
  ariaLabel?: string;
  onClick: () => void;
}

export interface ActivityItem {
  id: string;
  title: string;
  content?: string;
  meta?: string;
  active?: boolean;
  actions?: ActivityAction[];
}

export interface ActivityListSectionProps {
  title: string;
  items: ActivityItem[];
  onItemClick?: (item: ActivityItem) => void;
  emptyText?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  sectionVariant?: CollapsibleSectionVariant;
  variant?: 'default' | 'compact';
  enableIncrementalLoad?: boolean;
  pageSize?: number;
  loadMoreLabel?: (remaining: number) => string;
}

export function ActivityListSection({
  title,
  items,
  onItemClick,
  emptyText = '-',
  icon,
  badge,
  defaultOpen = true,
  sectionVariant = 'default',
  variant = 'default',
  enableIncrementalLoad = false,
  pageSize = 5,
  loadMoreLabel = (remaining) => `more (+${remaining})`,
}: ActivityListSectionProps) {
  const [visibleCount, setVisibleCount] = React.useState(pageSize);
  const usePaging = enableIncrementalLoad && pageSize > 0;

  React.useEffect(() => {
    setVisibleCount(pageSize);
  }, [items.length, pageSize]);

  const visibleItems = usePaging ? items.slice(0, visibleCount) : items;
  const hasMore = usePaging && visibleCount < items.length;
  const remainingCount = usePaging ? items.length - visibleCount : 0;
  const compact = variant === 'compact';

  return (
    <CollapsibleSection
      title={title}
      icon={icon}
      badge={badge}
      defaultOpen={defaultOpen}
      variant={sectionVariant}
    >
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 py-1">{emptyText}</p>
      ) : (
        <div className="space-y-1.5">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-1 rounded-md px-1 py-1 text-xs transition-colors',
                item.active
                  ? 'bg-ssoo-content-border text-ssoo-primary font-medium'
                  : 'hover:bg-ssoo-content-bg/60'
              )}
            >
              <div className="flex min-w-0 flex-1 items-start gap-2">
                {onItemClick ? (
                  <button
                    type="button"
                    className="min-w-0 flex-1 rounded-md px-1 py-1 text-left"
                    onClick={() => onItemClick(item)}
                  >
                    <p className={cn('truncate text-ssoo-primary', compact ? 'font-medium' : 'font-medium')}>{item.title}</p>
                    {item.content ? (
                      <p className="mt-0.5 whitespace-pre-wrap text-ssoo-primary/75">{item.content}</p>
                    ) : null}
                    {item.meta ? (
                      <p className="mt-0.5 text-[10px] text-ssoo-primary/60">{item.meta}</p>
                    ) : null}
                  </button>
                ) : (
                  <div className="min-w-0 flex-1 px-1 py-1">
                    <p className={cn('truncate text-ssoo-primary', compact ? 'font-medium' : 'font-medium')}>{item.title}</p>
                    {item.content ? (
                      <p className="mt-0.5 whitespace-pre-wrap text-ssoo-primary/75">{item.content}</p>
                    ) : null}
                    {item.meta ? (
                      <p className="mt-0.5 text-[10px] text-ssoo-primary/60">{item.meta}</p>
                    ) : null}
                  </div>
                )}
                {item.actions?.filter((action) => action.kind === 'icon').length ? (
                  <div className="mt-0.5 flex shrink-0 items-center gap-1 pr-1">
                    {item.actions.filter((action) => action.kind === 'icon').map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        onClick={action.onClick}
                        className={cn(
                          'inline-flex h-6 w-6 items-center justify-center rounded border transition-colors',
                          action.tone === 'danger'
                            ? 'border-red-200 text-red-500 hover:border-red-300 hover:bg-red-50'
                            : 'border-ssoo-content-border text-ssoo-primary/70 hover:border-ssoo-primary/40 hover:text-ssoo-primary'
                        )}
                        title={action.title ?? action.label}
                        aria-label={action.ariaLabel ?? action.title ?? action.label}
                      >
                        {action.icon}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              {item.actions?.filter((action) => action.kind !== 'icon').length ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {item.actions.filter((action) => action.kind !== 'icon').map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={action.onClick}
                      className={cn(
                        'rounded border px-2 py-0.5 text-[11px] hover:border-ssoo-primary/40',
                        action.tone === 'danger'
                          ? 'border-red-200 text-red-500'
                          : 'border-ssoo-content-border text-ssoo-primary'
                      )}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {hasMore ? (
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => Math.min(prev + pageSize, items.length))}
              className="w-full rounded-md border border-ssoo-content-border bg-white px-2 py-1.5 text-xs text-ssoo-primary transition-colors hover:bg-ssoo-content-bg"
            >
              {loadMoreLabel(remainingCount)}
            </button>
          ) : null}
        </div>
      )}
    </CollapsibleSection>
  );
}
