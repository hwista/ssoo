'use client';

import * as React from 'react';
import { X } from 'lucide-react';
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
  /** 칩 삭제 콜백. 전달 시 각 칩에 X 삭제 버튼 표시 */
  onChipRemove?: (chip: ChipItem) => void;
  emptyText?: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  sectionVariant?: CollapsibleSectionVariant;
  /** 칩 리스트 하단에 렌더링할 추가 콘텐츠 */
  children?: React.ReactNode;
}

export function ChipListSection({
  title,
  chips,
  onChipClick,
  onChipRemove,
  emptyText = '-',
  icon,
  defaultOpen = true,
  sectionVariant = 'default',
  children,
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
            const removable = Boolean(onChipRemove);
            const baseCls = 'inline-flex max-w-full items-center gap-1 truncate rounded-full border border-ssoo-content-border bg-white px-3 py-1.5 text-xs text-ssoo-primary';
            const hoverCls = clickable ? ' transition-colors hover:border-ssoo-primary/40 hover:bg-ssoo-content-bg' : '';

            const chipContent = (
              <>
                {chip.label}
                {removable && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onChipRemove?.(chip); }}
                    className="transition-colors hover:text-red-500"
                    aria-label={`"${chip.label}" 삭제`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </>
            );

            return clickable ? (
              <button
                key={chip.id}
                type="button"
                onClick={() => onChipClick?.(chip)}
                title={chip.title ?? chip.label}
                className={baseCls + hoverCls}
              >
                {chipContent}
              </button>
            ) : (
              <span key={chip.id} title={chip.title ?? chip.label} className={baseCls + hoverCls}>
                {chipContent}
              </span>
            );
          })}
        </div>
      )}
      {children}
    </CollapsibleSection>
  );
}
