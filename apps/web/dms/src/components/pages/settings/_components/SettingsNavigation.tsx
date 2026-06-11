'use client';

import { SsooSettingsNavigation as SsooSettingsNavigationSurface } from '@ssoo/web-shell';
import {
  SETTINGS_SECTION_GROUP_LABELS,
  SETTINGS_SECTION_GROUP_ORDER,
  type SettingSection,
} from '../_config/settingsPageConfig';

interface SettingsNavigationProps {
  title: string;
  sections: SettingSection[];
  activeSectionId: string;
  onSelect: (sectionId: string) => void;
}

export function SettingsNavigation({
  title,
  sections,
  activeSectionId,
  onSelect,
}: SettingsNavigationProps) {
  const groupedSections = SETTINGS_SECTION_GROUP_ORDER.map((group) => ({
    id: group,
    label: SETTINGS_SECTION_GROUP_LABELS[group],
    items: sections
      .filter((section) => section.group === group)
      .map((section) => ({
        id: section.id,
        label: section.label,
        icon: section.icon,
      })),
  })).filter((entry) => entry.items.length > 0);

  return (
    <SsooSettingsNavigationSurface
      title={title}
      groups={groupedSections}
      activeItemId={activeSectionId}
      onSelect={onSelect}
    />
  );
}
