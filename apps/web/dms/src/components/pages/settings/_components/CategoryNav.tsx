import type { ComponentType } from 'react';

interface NavSection {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export function CategoryNav({
  sections,
  activeSection,
  onSelect,
}: {
  sections: NavSection[];
  activeSection: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="space-y-1">
      {sections.map((section) => {
        const Icon = section.icon;
        const isActive = section.id === activeSection;
        return (
          <button
            key={section.id}
            onClick={() => onSelect(section.id)}
            className={[
              'flex h-control-h w-full items-center gap-2 rounded-md px-3 text-sm transition-colors',
              isActive
                ? 'bg-ssoo-primary text-white'
                : 'text-ssoo-primary hover:bg-ssoo-content-bg',
            ].join(' ')}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{section.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
