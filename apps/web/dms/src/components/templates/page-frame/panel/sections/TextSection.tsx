'use client';

import { SsooTextSection } from '@ssoo/web-shell';
import type { SsooTextSectionProps } from '@ssoo/web-shell';
import { createDmsCollapsibleSectionControlSlots } from '../sectionControlSlots';

export type TextSectionProps = SsooTextSectionProps;

export function TextSection({ controlSlots, ...props }: TextSectionProps) {
  return (
    <SsooTextSection
      {...props}
      controlSlots={createDmsCollapsibleSectionControlSlots(controlSlots)}
    />
  );
}
