'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@ssoo/web-ui';

export interface AssistantSessionHistoryItem {
  id: string;
  title: string;
  updatedAt: string;
  persistedToDb?: boolean;
  active?: boolean;
}

interface AssistantSessionHistoryListProps {
  items: AssistantSessionHistoryItem[];
  isActive: (item: AssistantSessionHistoryItem) => boolean;
  onSelect: (item: AssistantSessionHistoryItem) => void;
  emptyText?: string;
  variant?: 'panel' | 'compact';
}

export function AssistantSessionHistoryList({
  items,
  isActive,
  onSelect,
  emptyText = '이전 대화 세션이 없습니다.',
  variant = 'panel',
}: AssistantSessionHistoryListProps) {
  const STEP = 5;
  const [visibleCount, setVisibleCount] = useState(STEP);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;

  useEffect(() => {
    setVisibleCount(STEP);
  }, [items.length]);

  if (items.length === 0) {
    return <p className="px-1 py-1 text-caption text-ssoo-primary/60">{emptyText}</p>;
  }

  const containerClass = variant === 'panel' ? 'space-y-1' : 'space-y-1.5';

  return (
    <div className={containerClass}>
      {visibleItems.map((item) => (
        <div
          key={item.id}
          className={`flex items-center gap-1 rounded-md px-1 py-1 text-caption transition-colors ${
            isActive(item)
              ? 'bg-ssoo-content-bg text-ssoo-primary'
              : 'hover:bg-ssoo-content-bg/60'
          }`}
        >
          <Button variant="plain" size="plain"
            type="button"
            onClick={() => onSelect(item)}
            className="min-w-0 flex-1 rounded-md px-1 py-1 text-left"
            title={item.title}
          >
            <p className="truncate text-label-sm text-ssoo-primary">{item.title}</p>
            <p className="mt-0.5 text-caption text-ssoo-primary/60">
              {new Date(item.updatedAt).toLocaleString('ko-KR', { hour12: false })}
            </p>
          </Button>
        </div>
      ))}
      {hasMore && (
        <Button variant="plain" size="plain"
          type="button"
          onClick={() => setVisibleCount((prev) => Math.min(prev + STEP, items.length))}
          className="w-full rounded-md border border-ssoo-content-border bg-white px-2 py-1.5 text-caption text-ssoo-primary transition-colors hover:bg-ssoo-content-bg"
        >
          more (+{Math.min(STEP, items.length - visibleCount)})
        </Button>
      )}
    </div>
  );
}
