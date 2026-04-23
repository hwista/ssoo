'use client';

import * as React from 'react';
import { Undo2 } from 'lucide-react';
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
  meta?: React.ReactNode;
  active?: boolean;
  actions?: ActivityAction[];
  /** 아이템 타이틀 왼쪽에 표시할 아이콘 */
  icon?: React.ReactNode;
}

export interface ActivityListSectionProps {
  title: string;
  items: ActivityItem[];
  onItemClick?: (item: ActivityItem) => void;
  emptyText?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  /** 하이라이트할 아이템 ID 목록 (변경 표시) */
  highlightedItemIds?: Set<string>;
  /** 소프트 삭제된 아이템 ID 목록 (취소선+붉은색+되돌리기) */
  deletedItemIds?: Set<string>;
  /** 삭제 표시만 하고 되돌리기 버튼을 숨길 아이템 ID 목록 */
  nonRestorableItemIds?: Set<string>;
  /** 소프트 삭제된 아이템 복원 콜백 */
  onItemRestore?: (item: ActivityItem) => void;
  defaultOpen?: boolean;
  sectionVariant?: CollapsibleSectionVariant;
  variant?: 'default' | 'compact';
  /** 아이템 title 외관. 'link'이면 하이퍼링크 스타일(underline) 적용 */
  itemAppearance?: 'default' | 'link';
  enableIncrementalLoad?: boolean;
  pageSize?: number;
  loadMoreLabel?: (remaining: number) => string;
  /** 리스트 하단에 렌더링할 추가 콘텐츠 */
  children?: React.ReactNode;
}

export function ActivityListSection({
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
  sectionVariant = 'default',
  variant = 'default',
  itemAppearance = 'default',
  enableIncrementalLoad = false,
  pageSize = 5,
  loadMoreLabel = (remaining) => `more (+${remaining})`,
  children,
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
  const isLink = itemAppearance === 'link';
  const titleCls = cn(
    'truncate text-ssoo-primary',
    compact ? 'text-label-sm' : 'text-label-sm',
    isLink && 'underline decoration-1 underline-offset-2 hover:decoration-2',
  );

  return (
    <CollapsibleSection
      title={title}
      icon={icon}
      badge={badge}
      defaultOpen={defaultOpen}
      variant={sectionVariant}
    >
      {items.length === 0 ? (
        <p className="py-1 text-caption text-gray-400">{emptyText}</p>
      ) : (
        <div className="space-y-1.5">
          {visibleItems.map((item) => {
            const isDeleted = deletedItemIds?.has(item.id);
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
                  <button
                    type="button"
                    className="min-w-0 flex-1 rounded-md px-1 py-1 text-left flex items-start gap-1.5"
                    onClick={() => onItemClick(item)}
                  >
                    {item.icon && <span className="mt-0.5 shrink-0">{item.icon}</span>}
                    <div className="min-w-0 flex-1">
                      <p className={cn(titleCls, isDeleted && 'line-through text-destructive/60')}>{item.title}</p>
                      {item.content ? (
                        <p className={cn('mt-0.5 whitespace-pre-wrap text-ssoo-primary/75', isDeleted && 'line-through text-destructive/50')}>{item.content}</p>
                      ) : null}
                      {item.meta ? (
                        <p className="mt-0.5 text-caption text-ssoo-primary/60">{item.meta}</p>
                      ) : null}
                    </div>
                  </button>
                ) : (
                  <div className="min-w-0 flex-1 px-1 py-1 flex items-start gap-1.5">
                    {item.icon && <span className="mt-0.5 shrink-0">{item.icon}</span>}
                    <div className="min-w-0 flex-1">
                      <p className={cn(titleCls, isDeleted && 'line-through text-destructive/60')}>{item.title}</p>
                      {item.content ? (
                        <p className={cn('mt-0.5 whitespace-pre-wrap text-ssoo-primary/75', isDeleted && 'line-through text-destructive/50')}>{item.content}</p>
                      ) : null}
                      {item.meta ? (
                        <p className="mt-0.5 text-caption text-ssoo-primary/60">{item.meta}</p>
                      ) : null}
                    </div>
                  </div>
                )}
                {isDeleted && onItemRestore && !nonRestorableItemIds?.has(item.id) ? (
                  <div className="mt-0.5 flex shrink-0 items-center gap-1 pr-1">
                    <button
                      type="button"
                      onClick={() => onItemRestore(item)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded border border-destructive/20 text-destructive/50 transition-colors hover:border-ssoo-primary/40 hover:text-ssoo-primary"
                      title="되돌리기"
                      aria-label="되돌리기"
                    >
                      <Undo2 className="h-3 w-3" />
                    </button>
                  </div>
                ) : !isDeleted && item.actions?.filter((action) => action.kind === 'icon').length ? (
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
              {!isDeleted && item.actions?.filter((action) => action.kind !== 'icon').length ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {item.actions.filter((action) => action.kind !== 'icon').map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={action.onClick}
                      className={cn(
                        'rounded border px-2 py-0.5 text-caption hover:border-ssoo-primary/40',
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
            );
          })}
          {hasMore ? (
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => Math.min(prev + pageSize, items.length))}
              className="w-full rounded-md border border-ssoo-content-border bg-white px-2 py-1.5 text-caption text-ssoo-primary transition-colors hover:bg-ssoo-content-bg"
            >
              {loadMoreLabel(remainingCount)}
            </button>
          ) : null}
        </div>
      )}
      {children}
    </CollapsibleSection>
  );
}
