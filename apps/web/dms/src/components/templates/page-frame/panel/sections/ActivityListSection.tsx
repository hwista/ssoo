'use client';

import * as React from 'react';
import { Undo2 } from 'lucide-react';
import { SsooActivityListSection } from '@ssoo/web-shell';
import type {
  SsooActivityAction,
  SsooActivityItem,
  SsooActivityListSectionProps,
} from '@ssoo/web-shell';
import { Button } from '@ssoo/web-ui';
import { cn } from '@/lib/utils';
import { CollapsibleSection } from '../CollapsibleSection';
import { createDmsCollapsibleSectionControlSlots } from '../sectionControlSlots';

export type ActivityAction = SsooActivityAction;
export type ActivityItem = SsooActivityItem;
export interface ActivityListSectionProps extends SsooActivityListSectionProps {
  legacyVisuals?: boolean;
}

function LegacyActivityListSection({
  controlSlots,
  restoreIconSlot,
  ...props
}: SsooActivityListSectionProps) {
  const {
    title,
    items,
    onItemClick,
    emptyText = '-',
    icon,
    badge,
    highlightedItemIds,
    deletedItemIds,
    nonRestorableItemIds,
    onItemRestore,
    defaultOpen = true,
    locked = false,
    sectionVariant = 'default',
    variant = 'default',
    itemAppearance = 'default',
    enableIncrementalLoad = false,
    pageSize = 5,
    loadMoreLabel = (remaining) => `more (+${remaining})`,
    children,
  } = props;

  const [visibleCount, setVisibleCount] = React.useState(pageSize);
  const usePaging = enableIncrementalLoad && pageSize > 0;

  React.useEffect(() => {
    setVisibleCount(pageSize);
  }, [items.length, pageSize]);

  const visibleItems = usePaging ? items.slice(0, visibleCount) : items;
  const hasMore = usePaging && visibleCount < items.length;
  const remainingCount = usePaging ? items.length - visibleCount : 0;
  const compact = variant === 'compact';
  const isLink = itemAppearance === 'link';
  const restoreIcon = restoreIconSlot ?? <Undo2 className="h-3 w-3" />;
  const titleCls = cn(
    'truncate text-ssoo-primary',
    compact ? 'text-label-sm' : 'text-label-sm',
    isLink && 'underline decoration-1 underline-offset-2 hover:decoration-2',
  );

  const renderItemTitle = (item: ActivityItem, isDeleted: boolean) => (
    item.titleNode ? (
      <div className={cn('min-w-0', isDeleted && 'line-through text-destructive/60')}>
        {item.titleNode}
      </div>
    ) : (
      <p className={cn(titleCls, isDeleted && 'line-through text-destructive/60')}>{item.title}</p>
    )
  );

  return (
    <CollapsibleSection
      title={title}
      icon={icon}
      badge={badge}
      defaultOpen={defaultOpen}
      locked={locked}
      variant={sectionVariant}
      controlSlots={controlSlots}
    >
      {items.length === 0 ? (
        <p className="py-1 text-caption text-gray-400">{emptyText}</p>
      ) : (
        <div className="space-y-1.5">
          {visibleItems.map((item) => {
            const isDeleted = Boolean(deletedItemIds?.has(item.id));
            return (
              <div
                key={item.id}
                className={cn(
                  'flex items-center gap-1 rounded-md px-1 py-1 text-caption transition-colors',
                  isDeleted
                    ? 'border border-destructive/30 bg-destructive/5'
                    : highlightedItemIds?.has(item.id)
                      ? 'border border-destructive/30 bg-destructive/5'
                      : item.active
                        ? 'bg-ssoo-content-border text-label-sm text-ssoo-primary'
                        : 'hover:bg-ssoo-content-bg/60'
                )}
              >
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  {onItemClick && !isDeleted ? (
                    <Button
                      variant="plain"
                      size="plain"
                      type="button"
                      className="flex min-w-0 flex-1 items-start justify-start gap-1.5 rounded-md px-1 py-1 text-left font-normal text-inherit shadow-none whitespace-normal focus-visible:ring-0 [&_svg]:h-3 [&_svg]:w-3"
                      onClick={() => onItemClick(item)}
                    >
                      {item.icon ? <span className="mt-0.5 shrink-0">{item.icon}</span> : null}
                      <div className="min-w-0 flex-1">
                        {renderItemTitle(item, isDeleted)}
                        {item.content ? (
                          <p className={cn('mt-0.5 whitespace-pre-wrap text-ssoo-primary/75', isDeleted && 'line-through text-destructive/50')}>
                            {item.content}
                          </p>
                        ) : null}
                        {item.meta ? (
                          <p className="mt-0.5 text-caption text-ssoo-primary/60">{item.meta}</p>
                        ) : null}
                      </div>
                    </Button>
                  ) : (
                    <div className="flex min-w-0 flex-1 items-start gap-1.5 px-1 py-1">
                      {item.icon ? <span className="mt-0.5 shrink-0">{item.icon}</span> : null}
                      <div className="min-w-0 flex-1">
                        {renderItemTitle(item, isDeleted)}
                        {item.content ? (
                          <p className={cn('mt-0.5 whitespace-pre-wrap text-ssoo-primary/75', isDeleted && 'line-through text-destructive/50')}>
                            {item.content}
                          </p>
                        ) : null}
                        {item.meta ? (
                          <p className="mt-0.5 text-caption text-ssoo-primary/60">{item.meta}</p>
                        ) : null}
                      </div>
                    </div>
                  )}
                  {isDeleted && onItemRestore && !nonRestorableItemIds?.has(item.id) ? (
                    <div className="mt-0.5 flex shrink-0 items-center gap-1 pr-1">
                      <Button
                        variant="plain"
                        size="plain"
                        type="button"
                        onClick={() => onItemRestore(item)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded border border-destructive/20 text-destructive/50 shadow-none transition-colors hover:border-ssoo-primary/40 hover:text-ssoo-primary focus-visible:ring-0 [&_svg]:h-3 [&_svg]:w-3"
                        title="되돌리기"
                        aria-label="되돌리기"
                      >
                        {restoreIcon}
                      </Button>
                    </div>
                  ) : !isDeleted && item.actions?.filter((action) => action.kind === 'icon').length ? (
                    <div className="mt-0.5 flex shrink-0 items-center gap-1 pr-1">
                      {item.actions.filter((action) => action.kind === 'icon').map((action) => (
                        <Button
                          variant="plain"
                          size="plain"
                          key={action.id}
                          type="button"
                          onClick={action.onClick}
                          className={cn(
                            'inline-flex h-6 w-6 items-center justify-center rounded border shadow-none transition-colors focus-visible:ring-0 [&_svg]:h-3 [&_svg]:w-3',
                            action.tone === 'danger'
                              ? 'border-red-200 text-red-500 hover:border-red-300 hover:bg-red-50'
                              : 'border-ssoo-content-border text-ssoo-primary/70 hover:border-ssoo-primary/40 hover:text-ssoo-primary'
                          )}
                          title={action.title ?? action.label}
                          aria-label={action.ariaLabel ?? action.title ?? action.label}
                        >
                          {action.icon}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
                {!isDeleted && item.actions?.filter((action) => action.kind !== 'icon').length ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {item.actions.filter((action) => action.kind !== 'icon').map((action) => (
                      <Button
                        variant="plain"
                        size="plain"
                        key={action.id}
                        type="button"
                        onClick={action.onClick}
                        className={cn(
                          'rounded border px-2 py-0.5 text-caption font-normal shadow-none focus-visible:ring-0',
                          action.tone === 'danger'
                            ? 'border-red-200 text-red-500'
                            : 'border-ssoo-content-border text-ssoo-primary hover:border-ssoo-primary/40'
                        )}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
          {hasMore ? (
            <Button
              variant="plain"
              size="plain"
              type="button"
              onClick={() => setVisibleCount((prev) => Math.min(prev + pageSize, items.length))}
              className="w-full rounded-md border border-ssoo-content-border bg-white px-2 py-1.5 text-caption font-normal text-ssoo-primary shadow-none transition-colors hover:bg-ssoo-content-bg focus-visible:ring-0"
            >
              {loadMoreLabel(remainingCount)}
            </Button>
          ) : null}
        </div>
      )}
      {children}
    </CollapsibleSection>
  );
}

export function ActivityListSection({
  controlSlots,
  restoreIconSlot,
  legacyVisuals = false,
  ...props
}: ActivityListSectionProps) {
  if (legacyVisuals) {
    return (
      <LegacyActivityListSection
        {...props}
        controlSlots={controlSlots}
        restoreIconSlot={restoreIconSlot}
      />
    );
  }

  return (
    <SsooActivityListSection
      {...props}
      controlSlots={createDmsCollapsibleSectionControlSlots(controlSlots)}
      restoreIconSlot={restoreIconSlot ?? <Undo2 className="h-3 w-3" />}
    />
  );
}
