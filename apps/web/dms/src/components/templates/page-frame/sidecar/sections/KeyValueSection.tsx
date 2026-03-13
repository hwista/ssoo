'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { CollapsibleSection } from '../CollapsibleSection';
import type { CollapsibleSectionVariant } from '../CollapsibleSection';

export interface KeyValueItem {
  label: string;
  value?: React.ReactNode;
  icon?: React.ReactNode;
  indent?: boolean;
  hidden?: boolean;
}

export interface KeyValueSectionProps {
  title: string;
  items: KeyValueItem[];
  emptyText?: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  sectionVariant?: CollapsibleSectionVariant;
}

export function KeyValueSection({
  title,
  items,
  emptyText = '-',
  icon,
  defaultOpen = true,
  sectionVariant = 'default',
}: KeyValueSectionProps) {
  const visibleItems = items.filter((item) => !item.hidden);

  return (
    <CollapsibleSection
      title={title}
      icon={icon}
      defaultOpen={defaultOpen}
      variant={sectionVariant}
    >
      {visibleItems.length === 0 ? (
        <p className="text-xs text-gray-400 py-1">{emptyText}</p>
      ) : (
        <dl className="space-y-2 text-sm">
          {visibleItems.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <dt className={cn('flex items-center text-gray-500', item.indent && 'pl-[18px]')}>
                {item.icon}
                {item.label}
              </dt>
              <dd className="min-w-0 text-right text-ssoo-primary">
                {item.value ?? '-'}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </CollapsibleSection>
  );
}
