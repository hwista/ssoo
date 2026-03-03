'use client';

import * as React from 'react';
import { CollapsibleSection } from '../CollapsibleSection';

export interface ActivityAction {
  id: string;
  label: string;
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
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export function ActivityListSection({
  title,
  items,
  onItemClick,
  emptyText = '-',
  icon,
  defaultOpen = true,
  className,
  headerClassName,
  contentClassName,
}: ActivityListSectionProps) {
  return (
    <CollapsibleSection
      title={title}
      icon={icon}
      defaultOpen={defaultOpen}
      className={className}
      headerClassName={headerClassName}
      contentClassName={contentClassName}
    >
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 py-1">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={[
                'rounded border px-2 py-1.5 text-xs transition-colors',
                item.active
                  ? 'border-ssoo-primary/40 bg-ssoo-content-bg/60'
                  : 'border-ssoo-content-border bg-white',
              ].join(' ')}
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => onItemClick?.(item)}
                disabled={!onItemClick}
              >
                <p className="truncate text-ssoo-primary">{item.title}</p>
                {item.content ? (
                  <p className="mt-0.5 text-ssoo-primary/75 whitespace-pre-wrap">{item.content}</p>
                ) : null}
                {item.meta ? (
                  <p className="mt-1 text-[11px] text-ssoo-primary/55">{item.meta}</p>
                ) : null}
              </button>
              {item.actions?.length ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {item.actions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={action.onClick}
                      className="rounded border border-ssoo-content-border px-2 py-0.5 text-[11px] text-ssoo-primary hover:border-ssoo-primary/40"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}
