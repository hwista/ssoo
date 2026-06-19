'use client';

import { ChevronDown, ChevronRight, Lock } from 'lucide-react';
import type { SsooCollapsibleSectionControlSlots } from '@ssoo/web-shell';

export function createDmsCollapsibleSectionControlSlots(
  overrides?: SsooCollapsibleSectionControlSlots
): SsooCollapsibleSectionControlSlots {
  return {
    collapseIcon: overrides?.collapseIcon ?? (
      <ChevronDown className="h-3.5 w-3.5 text-ssoo-primary/50" />
    ),
    expandIcon: overrides?.expandIcon ?? (
      <ChevronRight className="h-3.5 w-3.5 text-ssoo-primary/50" />
    ),
    lockedIcon: overrides?.lockedIcon ?? (
      <Lock className="h-3.5 w-3.5 shrink-0 text-ssoo-primary/45" aria-label="잠김" />
    ),
  };
}
