'use client';

import { SsooKeyValueSection } from '@ssoo/web-shell';
import type {
  SsooKeyValueItem,
  SsooKeyValueSectionProps,
} from '@ssoo/web-shell';
import { createDmsCollapsibleSectionControlSlots } from '../sectionControlSlots';

export type KeyValueItem = SsooKeyValueItem;
export type KeyValueSectionProps = SsooKeyValueSectionProps;

export function KeyValueSection({ controlSlots, ...props }: KeyValueSectionProps) {
  return (
    <SsooKeyValueSection
      {...props}
      controlSlots={createDmsCollapsibleSectionControlSlots(controlSlots)}
    />
  );
}
