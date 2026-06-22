'use client';

import { SsooCollapsibleSection } from '@ssoo/web-shell';
import type {
  SsooCollapsibleSectionProps,
  SsooCollapsibleSectionVariant,
} from '@ssoo/web-shell';
import { createDmsCollapsibleSectionControlSlots } from './sectionControlSlots';

export type CollapsibleSectionVariant = SsooCollapsibleSectionVariant;
export type CollapsibleSectionProps = SsooCollapsibleSectionProps;

export function CollapsibleSection({ controlSlots, ...props }: CollapsibleSectionProps) {
  return (
    <SsooCollapsibleSection
      {...props}
      controlSlots={createDmsCollapsibleSectionControlSlots(controlSlots)}
    />
  );
}
