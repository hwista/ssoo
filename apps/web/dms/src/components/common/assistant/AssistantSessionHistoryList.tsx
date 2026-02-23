'use client';

import { CloudOff, CloudUpload } from 'lucide-react';

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
  onTogglePersist?: (item: AssistantSessionHistoryItem) => void;
  emptyText?: string;
  variant?: 'panel' | 'sidecar';
}

export function AssistantSessionHistoryList({
  items,
  isActive,
  onSelect,
  onTogglePersist,
  emptyText = '이전 대화 세션이 없습니다.',
  variant = 'panel',
}: AssistantSessionHistoryListProps) {
  if (items.length === 0) {
    return <p className="px-1 py-1 text-xs text-ssoo-primary/60">{emptyText}</p>;
  }

  const sizeClass = variant === 'panel' ? 'h-7 w-7' : 'h-6 w-6';
  const containerClass = variant === 'panel' ? 'space-y-1' : 'space-y-1.5';

  return (
    <div className={containerClass}>
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex items-center gap-1 rounded-md px-1 py-1 text-xs transition-colors ${
            isActive(item)
              ? 'bg-ssoo-content-bg text-ssoo-primary'
              : 'hover:bg-ssoo-content-bg/60'
          }`}
        >
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="min-w-0 flex-1 rounded-md px-1 py-1 text-left"
            title={item.title}
          >
            <p className="truncate font-medium text-ssoo-primary">{item.title}</p>
            <p className="mt-0.5 text-[10px] text-ssoo-primary/60">
              {new Date(item.updatedAt).toLocaleString('ko-KR', { hour12: false })}
            </p>
          </button>
          {onTogglePersist && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onTogglePersist(item);
              }}
              className={`inline-flex ${sizeClass} items-center justify-center rounded-md border border-ssoo-content-border text-ssoo-primary/70 transition-colors hover:border-ssoo-primary/40 hover:text-ssoo-primary`}
              title={item.persistedToDb ? 'DB 저장 해제' : 'DB에 저장'}
              aria-label={item.persistedToDb ? 'DB 저장 해제' : 'DB에 저장'}
            >
              {item.persistedToDb ? <CloudOff className="h-3.5 w-3.5" /> : <CloudUpload className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
