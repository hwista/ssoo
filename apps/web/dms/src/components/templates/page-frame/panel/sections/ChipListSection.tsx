'use client';

import { Undo2, X } from 'lucide-react';
import { SsooChipListSection } from '@ssoo/web-shell';
import type { SsooChipItem, SsooChipListSectionProps } from '@ssoo/web-shell';
import { createDmsCollapsibleSectionControlSlots } from '../sectionControlSlots';

export type ChipItem = SsooChipItem;
export type ChipListSectionProps = SsooChipListSectionProps;

export function ChipListSection({
  controlSlots,
  removeIconSlot,
  restoreIconSlot,
  ...props
}: ChipListSectionProps) {
  return (
    <SsooChipListSection
      {...props}
      controlSlots={createDmsCollapsibleSectionControlSlots(controlSlots)}
      removeIconSlot={removeIconSlot ?? <X className="h-3 w-3" />}
      restoreIconSlot={restoreIconSlot ?? <Undo2 className="h-3 w-3" />}
    />
  );
}
