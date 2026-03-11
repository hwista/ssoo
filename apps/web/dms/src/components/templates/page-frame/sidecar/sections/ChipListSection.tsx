'use client';

import * as React from 'react';
import { CollapsibleSection } from '../CollapsibleSection';
import type { CollapsibleSectionVariant } from '../CollapsibleSection';

export interface ChipItem {
  id: string;
  label: string;
  title?: string;
}

export interface ChipListSectionProps {
  title: string;
  chips: ChipItem[];
  onChipClick?: (chip: ChipItem) => void;
  emptyText?: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  sectionVariant?: CollapsibleSectionVariant;
}

export function ChipListSection({
  title,
  chips,
  onChipClick,
  emptyText = '-',
  icon,
  defaultOpen = true,
  sectionVariant = 'default',
}: ChipListSectionProps) {
  return (
    <CollapsibleSection
      title={title}
      icon={icon}
      defaultOpen={defaultOpen}
      variant={sectionVariant}
    >
      {chips.length === 0 ? (
        <p className="text-xs text-gray-400 py-1">{emptyText}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => {
            const clickable = Boolean(onChipClick);
            const className = clickable
              ? 'max-w-full truncate rounded-full border border-ssoo-content-border bg-white px-3 py-1.5 text-xs text-ssoo-primary transition-colors hover:border-ssoo-primary/40 hover:bg-ssoo-content-bg'
              : 'max-w-full truncate rounded-full border border-ssoo-content-border bg-white px-3 py-1.5 text-xs text-ssoo-primary';

            return clickable ? (
              <button
                key={chip.id}
                type="button"
                onClick={() => onChipClick?.(chip)}
                title={chip.title ?? chip.label}
                className={className}
              >
                {chip.label}
              </button>
            ) : (
              <span key={chip.id} title={chip.title ?? chip.label} className={className}>
                {chip.label}
              </span>
            );
          })}
        </div>
      )}
    </CollapsibleSection>
  );
}
