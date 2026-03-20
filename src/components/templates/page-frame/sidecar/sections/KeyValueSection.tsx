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
  highlighted?: boolean;
}

export interface KeyValueSectionProps {
  title: string;
  items: KeyValueItem[];
  emptyText?: string;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  defaultOpen?: boolean;
  sectionVariant?: CollapsibleSectionVariant;
  children?: React.ReactNode;
}

export function KeyValueSection({
  title,
  items,
  emptyText = '-',
  icon,
  headerRight,
  defaultOpen = true,
  sectionVariant = 'default',
  children,
}: KeyValueSectionProps) {
  const visibleItems = items.filter((item) => !item.hidden);

  return (
    <CollapsibleSection
      title={title}
      icon={icon}
      headerRight={headerRight}
      defaultOpen={defaultOpen}
      variant={sectionVariant}
    >
      {visibleItems.length === 0 && !children ? (
        <p className="text-xs text-gray-400 py-1">{emptyText}</p>
      ) : visibleItems.length > 0 ? (
        <dl className="space-y-2 text-sm">
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
              <dd className="min-w-0 text-right text-ssoo-primary">
                {item.value ?? '-'}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {children}
    </CollapsibleSection>
  );
}
