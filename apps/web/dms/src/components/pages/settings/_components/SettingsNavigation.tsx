'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { FlatList, FlatListItem } from '@/components/layout/sidebar/FlatList';
import type { SettingSection } from '../_config/settingsPageConfig';

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
  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-ssoo-content-border bg-ssoo-content-bg font-sans">
      <ScrollArea variant="sidebar" className="flex-1">
        <FlatList as="nav" ariaLabel={`${title} 세부 메뉴`} className="py-2">
          {sections.map((section) => {
            const isActive = section.id === activeSectionId;

            return (
              <FlatListItem
                key={section.id}
                icon={section.icon}
                label={section.label}
                active={isActive}
                onSelect={() => onSelect(section.id)}
              />
            );
          })}
        </FlatList>
      </ScrollArea>
    </aside>
  );
}
