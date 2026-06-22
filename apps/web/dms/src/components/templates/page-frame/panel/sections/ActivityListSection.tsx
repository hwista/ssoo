'use client';

import { Undo2 } from 'lucide-react';
import { SsooActivityListSection } from '@ssoo/web-shell';
import type {
  SsooActivityAction,
  SsooActivityItem,
  SsooActivityListSectionProps,
} from '@ssoo/web-shell';
import { createDmsCollapsibleSectionControlSlots } from '../sectionControlSlots';

export type ActivityAction = SsooActivityAction;
export type ActivityItem = SsooActivityItem;
export type ActivityListSectionProps = SsooActivityListSectionProps;

export function ActivityListSection({
  controlSlots,
  restoreIconSlot,
  ...props
}: ActivityListSectionProps) {
  return (
    <SsooActivityListSection
      {...props}
      controlSlots={createDmsCollapsibleSectionControlSlots(controlSlots)}
      restoreIconSlot={restoreIconSlot ?? <Undo2 className="h-3 w-3" />}
    />
  );
}
