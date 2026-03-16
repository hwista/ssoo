'use client';

import * as React from 'react';
import { Undo2, X } from 'lucide-react';
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
  /** 소프트 삭제된 칩 복원 콜백 */
  onChipRestore?: (chip: ChipItem) => void;
  /** 하이라이트할 칩 ID 목록 (변경 표시) */
  highlightedChipIds?: Set<string>;
  /** 소프트 삭제된 칩 ID 목록 (취소선+붉은색+되돌리기) */
  deletedChipIds?: Set<string>;
  emptyText?: string;
  icon?: React.ReactNode;
  /** 타이틀 우측 추가 요소 (접기 아이콘 왼쪽) */
  headerRight?: React.ReactNode;
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
  onChipRestore,
  highlightedChipIds,
  deletedChipIds,
  emptyText = '-',
  icon,
  headerRight,
  defaultOpen = true,
  sectionVariant = 'default',
  children,
}: ChipListSectionProps) {
  return (
    <CollapsibleSection
      title={title}
      icon={icon}
      headerRight={headerRight}
      defaultOpen={defaultOpen}
      variant={sectionVariant}
    >
      {chips.length === 0 ? (
        <p className="text-xs text-gray-400 py-1">{emptyText}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => {
            const clickable = Boolean(onChipClick);
            const isDeleted = deletedChipIds?.has(chip.id);
            const isHighlighted = !isDeleted && highlightedChipIds?.has(chip.id);
            const baseCls = isDeleted
              ? 'inline-flex max-w-full items-center gap-1 truncate rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-sm text-destructive/60 line-through'
              : isHighlighted
                ? 'inline-flex max-w-full items-center gap-1 truncate rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-sm text-ssoo-primary'
                : 'inline-flex max-w-full items-center gap-1 truncate rounded-full border border-ssoo-content-border bg-white px-3 py-1.5 text-sm text-ssoo-primary';
            const hoverCls = clickable && !isDeleted ? ' transition-colors hover:border-ssoo-primary/40 hover:bg-ssoo-content-bg' : '';

            const chipContent = (
              <>
                {chip.label}
                {isDeleted && onChipRestore ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onChipRestore(chip); }}
                    className="transition-colors text-destructive/50 hover:text-ssoo-primary"
                    aria-label={`"${chip.label}" 되돌리기`}
                    title="되돌리기"
                  >
                    <Undo2 className="h-3 w-3" />
                  </button>
                ) : onChipRemove && !isDeleted ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onChipRemove(chip); }}
                    className="transition-colors hover:text-red-500"
                    aria-label={`"${chip.label}" 삭제`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </>
            );

            return clickable && !isDeleted ? (
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
