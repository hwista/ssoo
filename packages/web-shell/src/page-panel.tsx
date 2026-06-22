'use client';

import * as React from 'react';
import type { ReactNode } from 'react';
import { cn } from './cn';
import { Button } from '@ssoo/web-ui';

export interface SsooPanelFrameProps {
  title?: string;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  bodyRef?: React.Ref<HTMLDivElement>;
  floatingContent?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function SsooPanelFrame({
  title,
  className,
  headerClassName,
  bodyClassName,
  footerClassName,
  bodyRef,
  floatingContent,
  children,
  footer,
}: SsooPanelFrameProps) {
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
        <div className="pointer-events-none absolute inset-0 z-20">{floatingContent}</div>
      ) : null}
    </div>
  );
}

export type SsooCollapsibleSectionVariant = 'default' | 'dense';

export interface SsooCollapsibleSectionControlSlots {
  collapseIcon?: ReactNode;
  expandIcon?: ReactNode;
  lockedIcon?: ReactNode;
}

export interface SsooCollapsibleSectionProps {
  icon?: ReactNode;
  title: string;
  badge?: ReactNode;
  headerRight?: ReactNode;
  defaultOpen?: boolean;
  locked?: boolean;
  variant?: SsooCollapsibleSectionVariant;
  controlSlots?: SsooCollapsibleSectionControlSlots;
  children: ReactNode;
}

function findScrollParent(element: HTMLElement | null): HTMLElement | null {
  let current = element?.parentElement ?? null;
  while (current) {
    const overflowY = window.getComputedStyle(current).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function DefaultToggleIndicator({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'block h-2 w-2 shrink-0 border-b border-r ssoo-border-primary-50 transition-transform',
        open ? 'rotate-45' : '-rotate-45'
      )}
    />
  );
}

function DefaultLockedIndicator() {
  return (
    <span
      aria-label="잠김"
      className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border ssoo-border-primary-35"
    />
  );
}

export function SsooCollapsibleSection({
  icon,
  title,
  badge,
  headerRight,
  defaultOpen = true,
  locked = false,
  variant = 'default',
  controlSlots,
  children,
}: SsooCollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const sectionRef = React.useRef<HTMLElement>(null);
  const headerRef = React.useRef<HTMLDivElement>(null);
  const shouldAlignOnOpenRef = React.useRef(false);

  React.useEffect(() => {
    setIsOpen(locked ? false : defaultOpen);
  }, [defaultOpen, locked]);

  const isDense = variant === 'dense';
  const canToggle = !locked;
  const toggle = () => {
    if (!canToggle) return;
    setIsOpen((previous) => {
      const next = !previous;
      if (next) {
        shouldAlignOnOpenRef.current = true;
      }
      return next;
    });
  };

  React.useEffect(() => {
    if (!isOpen || !shouldAlignOnOpenRef.current) {
      return;
    }

    shouldAlignOnOpenRef.current = false;
    const rafId = window.requestAnimationFrame(() => {
      const section = sectionRef.current;
      const header = headerRef.current;
      if (!section || !header) {
        return;
      }

      const scrollParent = findScrollParent(section);
      if (!scrollParent) {
        header.scrollIntoView({ block: 'start', behavior: 'smooth' });
        return;
      }

      const sectionRect = section.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();
      const parentRect = scrollParent.getBoundingClientRect();
      const needsAlignment = headerRect.top < parentRect.top || sectionRect.bottom > parentRect.bottom;
      if (!needsAlignment) {
        return;
      }

      scrollParent.scrollTo({
        top: scrollParent.scrollTop + headerRect.top - parentRect.top,
        behavior: 'smooth',
      });
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [isOpen]);

  return (
    <section ref={sectionRef} className="border-b border-ssoo-content-border last:border-b-0">
      <div
        ref={headerRef}
        className={cn(
          'flex w-full items-center text-ssoo-primary',
          isDense ? 'gap-2 px-3 py-2 text-label-strong' : 'gap-2 px-4 py-3 text-label-md'
        )}
      >
        <Button variant="plain" size="plain"
          type="button"
          onClick={toggle}
          disabled={!canToggle}
          className={cn(
            'flex items-center gap-2 transition-colors',
            canToggle ? 'ssoo-hover-text-primary-80' : 'cursor-default ssoo-text-primary-70'
          )}
        >
          <span
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center [&>svg]:m-0 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0"
            aria-hidden
          >
            {icon}
          </span>
          <span className="text-left">{title}</span>
        </Button>
        {headerRight}
        <span className="flex-1" />
        {badge}
        {locked ? (
          controlSlots?.lockedIcon ?? <DefaultLockedIndicator />
        ) : (
          <Button variant="plain" size="plain"
            type="button"
            onClick={toggle}
            className="shrink-0 transition-colors ssoo-hover-text-primary-80"
            aria-label={isOpen ? '섹션 접기' : '섹션 펼치기'}
          >
            {isOpen
              ? controlSlots?.collapseIcon ?? <DefaultToggleIndicator open />
              : controlSlots?.expandIcon ?? <DefaultToggleIndicator open={false} />}
          </Button>
        )}
      </div>
      {!locked && isOpen ? (
        <div className={cn(isDense ? 'px-3 pb-2.5' : 'px-4 pb-3')}>{children}</div>
      ) : null}
    </section>
  );
}

export interface SsooKeyValueItem {
  label: string;
  value?: ReactNode;
  icon?: ReactNode;
  indent?: boolean;
  hidden?: boolean;
  highlighted?: boolean;
}

export interface SsooKeyValueSectionProps {
  title: string;
  items: SsooKeyValueItem[];
  emptyText?: string;
  icon?: ReactNode;
  headerRight?: ReactNode;
  defaultOpen?: boolean;
  sectionVariant?: SsooCollapsibleSectionVariant;
  controlSlots?: SsooCollapsibleSectionControlSlots;
  children?: ReactNode;
}

export function SsooKeyValueSection({
  title,
  items,
  emptyText = '-',
  icon,
  headerRight,
  defaultOpen = true,
  sectionVariant = 'default',
  controlSlots,
  children,
}: SsooKeyValueSectionProps) {
  const visibleItems = items.filter((item) => !item.hidden);

  return (
    <SsooCollapsibleSection
      title={title}
      icon={icon}
      headerRight={headerRight}
      defaultOpen={defaultOpen}
      variant={sectionVariant}
      controlSlots={controlSlots}
    >
      {visibleItems.length === 0 && !children ? (
        <p className="py-1 text-caption text-gray-400">{emptyText}</p>
      ) : visibleItems.length > 0 ? (
        <dl className="space-y-2 text-body-sm">
          {visibleItems.map((item) => (
            <div
              key={item.label}
              className={cn(
                'flex items-center justify-between rounded-md',
                item.highlighted && 'border border-destructive/30 bg-destructive/5 px-2 py-1.5'
              )}
            >
              <dt className={cn('flex items-center text-gray-500', item.indent && 'pl-[18px]')}>
                {item.icon}
                {item.label}
              </dt>
              <dd className="min-w-0 text-right text-ssoo-primary">{item.value ?? '-'}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {children}
    </SsooCollapsibleSection>
  );
}

export interface SsooTextSectionProps {
  title: string;
  text?: string;
  content?: ReactNode;
  emptyText?: string;
  icon?: ReactNode;
  headerRight?: ReactNode;
  defaultOpen?: boolean;
  locked?: boolean;
  sectionVariant?: SsooCollapsibleSectionVariant;
  controlSlots?: SsooCollapsibleSectionControlSlots;
  preserveWhitespace?: boolean;
}

export function SsooTextSection({
  title,
  text,
  content,
  emptyText = '-',
  icon,
  headerRight,
  defaultOpen = true,
  locked = false,
  sectionVariant = 'default',
  controlSlots,
  preserveWhitespace = true,
}: SsooTextSectionProps) {
  const node = content ?? (
    text?.trim()
      ? (
        <p className={preserveWhitespace ? 'whitespace-pre-wrap text-caption leading-relaxed ssoo-text-primary-80' : 'text-caption leading-relaxed ssoo-text-primary-80'}>
          {text}
        </p>
      )
      : <p className="py-1 text-caption text-gray-400">{emptyText}</p>
  );

  return (
    <SsooCollapsibleSection
      title={title}
      icon={icon}
      headerRight={headerRight}
      defaultOpen={defaultOpen}
      locked={locked}
      variant={sectionVariant}
      controlSlots={controlSlots}
    >
      {node}
    </SsooCollapsibleSection>
  );
}

export interface SsooChipItem {
  id: string;
  label: string;
  title?: string;
}

export interface SsooChipListSectionProps {
  title: string;
  chips: SsooChipItem[];
  onChipClick?: (chip: SsooChipItem) => void;
  onChipRemove?: (chip: SsooChipItem) => void;
  onChipRestore?: (chip: SsooChipItem) => void;
  highlightedChipIds?: Set<string>;
  deletedChipIds?: Set<string>;
  emptyText?: string;
  icon?: ReactNode;
  headerRight?: ReactNode;
  defaultOpen?: boolean;
  locked?: boolean;
  sectionVariant?: SsooCollapsibleSectionVariant;
  controlSlots?: SsooCollapsibleSectionControlSlots;
  removeIconSlot?: ReactNode;
  restoreIconSlot?: ReactNode;
  children?: ReactNode;
}

export function SsooChipListSection({
  title,
  chips,
  onChipClick,
  onChipRemove,
  onChipRestore,
  highlightedChipIds,
  deletedChipIds,
  emptyText = '-',
  icon,
  headerRight,
  defaultOpen = true,
  locked = false,
  sectionVariant = 'default',
  controlSlots,
  removeIconSlot,
  restoreIconSlot,
  children,
}: SsooChipListSectionProps) {
  return (
    <SsooCollapsibleSection
      title={title}
      icon={icon}
      headerRight={headerRight}
      defaultOpen={defaultOpen}
      locked={locked}
      variant={sectionVariant}
      controlSlots={controlSlots}
    >
      {chips.length === 0 ? (
        <p className="py-1 text-caption text-gray-400">{emptyText}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => {
            const clickable = Boolean(onChipClick);
            const isDeleted = deletedChipIds?.has(chip.id);
            const isHighlighted = !isDeleted && highlightedChipIds?.has(chip.id);
            const baseCls = isDeleted
              ? 'inline-flex max-w-full items-center gap-1 truncate rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-caption text-destructive/60 line-through'
              : isHighlighted
                ? 'inline-flex max-w-full items-center gap-1 truncate rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-caption text-ssoo-primary'
                : 'inline-flex max-w-full items-center gap-1 truncate rounded-full border border-ssoo-content-border bg-white px-3 py-1.5 text-caption text-ssoo-primary';
            const hoverCls = clickable && !isDeleted ? ' transition-colors ssoo-hover-border-primary-40 hover:bg-ssoo-content-bg' : '';

            const chipContent = (
              <>
                {chip.label}
                {isDeleted && onChipRestore ? (
                  <Button variant="plain" size="plain"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onChipRestore(chip);
                    }}
                    className="text-destructive/50 transition-colors hover:text-ssoo-primary"
                    aria-label={`"${chip.label}" 되돌리기`}
                    title="되돌리기"
                  >
                    {restoreIconSlot}
                  </Button>
                ) : onChipRemove && !isDeleted ? (
                  <Button variant="plain" size="plain"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onChipRemove(chip);
                    }}
                    className="transition-colors hover:text-red-500"
                    aria-label={`"${chip.label}" 삭제`}
                  >
                    {removeIconSlot}
                  </Button>
                ) : null}
              </>
            );

            return clickable && !isDeleted ? (
              <Button variant="plain" size="plain"
                key={chip.id}
                type="button"
                onClick={() => onChipClick?.(chip)}
                title={chip.title ?? chip.label}
                className={baseCls + hoverCls}
              >
                {chipContent}
              </Button>
            ) : (
              <span key={chip.id} title={chip.title ?? chip.label} className={baseCls + hoverCls}>
                {chipContent}
              </span>
            );
          })}
        </div>
      )}
      {children}
    </SsooCollapsibleSection>
  );
}

export interface SsooActivityAction {
  id: string;
  label?: string;
  icon?: ReactNode;
  kind?: 'text' | 'icon';
  tone?: 'default' | 'danger';
  title?: string;
  ariaLabel?: string;
  onClick: () => void;
}

export interface SsooActivityItem {
  id: string;
  title: string;
  titleNode?: ReactNode;
  content?: string;
  meta?: ReactNode;
  active?: boolean;
  actions?: SsooActivityAction[];
  icon?: ReactNode;
}

export interface SsooActivityListSectionProps {
  title: string;
  items: SsooActivityItem[];
  onItemClick?: (item: SsooActivityItem) => void;
  emptyText?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  highlightedItemIds?: Set<string>;
  deletedItemIds?: Set<string>;
  nonRestorableItemIds?: Set<string>;
  onItemRestore?: (item: SsooActivityItem) => void;
  defaultOpen?: boolean;
  locked?: boolean;
  sectionVariant?: SsooCollapsibleSectionVariant;
  controlSlots?: SsooCollapsibleSectionControlSlots;
  variant?: 'default' | 'compact';
  itemAppearance?: 'default' | 'link';
  enableIncrementalLoad?: boolean;
  pageSize?: number;
  loadMoreLabel?: (remaining: number) => string;
  restoreIconSlot?: ReactNode;
  children?: ReactNode;
}

export function SsooActivityListSection({
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
  controlSlots,
  variant = 'default',
  itemAppearance = 'default',
  enableIncrementalLoad = false,
  pageSize = 5,
  loadMoreLabel = (remaining) => `more (+${remaining})`,
  restoreIconSlot,
  children,
}: SsooActivityListSectionProps) {
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
  const titleCls = cn(
    'truncate text-ssoo-primary',
    compact ? 'text-label-sm' : 'text-label-sm',
    isLink && 'underline decoration-1 underline-offset-2 hover:decoration-2'
  );
  const renderItemTitle = (item: SsooActivityItem, isDeleted: boolean) => (
    item.titleNode ? (
      <div className={cn('min-w-0', isDeleted && 'line-through text-destructive/60')}>
        {item.titleNode}
      </div>
    ) : (
      <p className={cn(titleCls, isDeleted && 'line-through text-destructive/60')}>{item.title}</p>
    )
  );

  return (
    <SsooCollapsibleSection
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
                        : 'ssoo-hover-bg-content-60'
                )}
              >
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  {onItemClick && !isDeleted ? (
                    <Button variant="plain" size="plain"
                      type="button"
                      className="flex min-w-0 flex-1 items-start gap-1.5 rounded-md px-1 py-1 text-left"
                      onClick={() => onItemClick(item)}
                    >
                      {item.icon ? <span className="mt-0.5 shrink-0">{item.icon}</span> : null}
                      <div className="min-w-0 flex-1">
                        {renderItemTitle(item, isDeleted)}
                        {item.content ? (
                          <p className={cn('mt-0.5 whitespace-pre-wrap ssoo-text-primary-75', isDeleted && 'line-through text-destructive/50')}>
                            {item.content}
                          </p>
                        ) : null}
                        {item.meta ? (
                          <p className="mt-0.5 text-caption ssoo-text-primary-60">{item.meta}</p>
                        ) : null}
                      </div>
                    </Button>
                  ) : (
                    <div className="flex min-w-0 flex-1 items-start gap-1.5 px-1 py-1">
                      {item.icon ? <span className="mt-0.5 shrink-0">{item.icon}</span> : null}
                      <div className="min-w-0 flex-1">
                        {renderItemTitle(item, isDeleted)}
                        {item.content ? (
                          <p className={cn('mt-0.5 whitespace-pre-wrap ssoo-text-primary-75', isDeleted && 'line-through text-destructive/50')}>
                            {item.content}
                          </p>
                        ) : null}
                        {item.meta ? (
                          <p className="mt-0.5 text-caption ssoo-text-primary-60">{item.meta}</p>
                        ) : null}
                      </div>
                    </div>
                  )}
                  {isDeleted && onItemRestore && !nonRestorableItemIds?.has(item.id) ? (
                    <div className="mt-0.5 flex shrink-0 items-center gap-1 pr-1">
                      <Button variant="plain" size="plain"
                        type="button"
                        onClick={() => onItemRestore(item)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded border border-destructive/20 text-destructive/50 transition-colors ssoo-hover-border-primary-40 hover:text-ssoo-primary"
                        title="되돌리기"
                        aria-label="되돌리기"
                      >
                        {restoreIconSlot}
                      </Button>
                    </div>
                  ) : !isDeleted && item.actions?.filter((action) => action.kind === 'icon').length ? (
                    <div className="mt-0.5 flex shrink-0 items-center gap-1 pr-1">
                      {item.actions.filter((action) => action.kind === 'icon').map((action) => (
                        <Button variant="plain" size="plain"
                          key={action.id}
                          type="button"
                          onClick={action.onClick}
                          className={cn(
                            'inline-flex h-6 w-6 items-center justify-center rounded border transition-colors',
                            action.tone === 'danger'
                              ? 'border-red-200 text-red-500 hover:border-red-300 hover:bg-red-50'
                              : 'border-ssoo-content-border ssoo-text-primary-70 ssoo-hover-border-primary-40 hover:text-ssoo-primary'
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
                      <Button variant="plain" size="plain"
                        key={action.id}
                        type="button"
                        onClick={action.onClick}
                        className={cn(
                          'rounded border px-2 py-0.5 text-caption ssoo-hover-border-primary-40',
                          action.tone === 'danger'
                            ? 'border-red-200 text-red-500'
                            : 'border-ssoo-content-border text-ssoo-primary'
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
            <Button variant="plain" size="plain"
              type="button"
              onClick={() => setVisibleCount((previous) => Math.min(previous + pageSize, items.length))}
              className="w-full rounded-md border border-ssoo-content-border bg-white px-2 py-1.5 text-caption text-ssoo-primary transition-colors hover:bg-ssoo-content-bg"
            >
              {loadMoreLabel(remainingCount)}
            </Button>
          ) : null}
        </div>
      )}
      {children}
    </SsooCollapsibleSection>
  );
}
