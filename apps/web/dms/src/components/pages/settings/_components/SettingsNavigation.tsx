'use client';

import { useState } from 'react';
import type { ComponentType } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Section } from '@/components/layout/sidebar/Section';
import type { SettingSection } from '../_config/settingsPageConfig';

interface SettingsNavigationProps {
  title: string;
  icon: ComponentType<{ className?: string }>;
  sections: SettingSection[];
  activeSectionId: string;
  onSelect: (sectionId: string) => void;
}

export function SettingsNavigation({
  title,
  icon: Icon,
  sections,
  activeSectionId,
  onSelect,
}: SettingsNavigationProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col border-r border-ssoo-content-border bg-ssoo-content-bg font-sans">
      <ScrollArea variant="sidebar" className="flex-1">
        <Section
          title={title}
          icon={Icon}
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded((prev) => !prev)}
        >
          <nav className="space-y-0.5 py-1" aria-label={`${title} 세부 메뉴`}>
            {sections.map((section) => {
              const SectionIcon = section.icon;
              const isActive = section.id === activeSectionId;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onSelect(section.id)}
                  className={cn(
                    'group flex h-control-h w-full cursor-pointer items-center gap-2 rounded-md px-3 text-left text-body-sm transition-colors',
                    isActive
                      ? 'bg-ssoo-content-border text-label-md text-ssoo-primary'
                      : 'text-gray-700 hover:bg-ssoo-sitemap-bg'
                  )}
                >
                  <SectionIcon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      isActive ? 'text-ssoo-primary' : 'text-gray-500'
                    )}
                  />
                  <span className={cn('flex-1 truncate', isActive ? 'text-ssoo-primary' : 'text-gray-700')}>
                    {section.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </Section>
      </ScrollArea>
    </aside>
  );
}
