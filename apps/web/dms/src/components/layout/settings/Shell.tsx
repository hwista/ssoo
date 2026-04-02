'use client';

import { useMemo, useState } from 'react';
import type { ComponentType, KeyboardEvent } from 'react';
import { ArrowLeft, FolderTree, Shield, SlidersHorizontal } from 'lucide-react';
import { SettingsPage } from '@/components/pages/settings/SettingsPage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useSettingsShellStore, useSettingsStore } from '@/stores';
import { LAYOUT_SIZES } from '@/lib/constants/layout';
import { cn } from '@/lib/utils';
import {
  SETTINGS_SCOPE_LABELS,
  searchSettingEntries,
} from '@/components/pages/settings/_config/settingsPageConfig';
import type { SettingsScope } from '@/types/settings';
import { UserMenu } from '../UserMenu';
import { SearchInput } from '../sidebar/SearchInput';
import { Section } from '../sidebar/Section';

interface SettingsShellSidebarProps {
  isCompactMode?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const SCOPE_META: Record<
  SettingsScope,
  { title: string; icon: ComponentType<{ className?: string }> }
> = {
  system: {
    title: SETTINGS_SCOPE_LABELS.system,
    icon: Shield,
  },
  personal: {
    title: SETTINGS_SCOPE_LABELS.personal,
    icon: SlidersHorizontal,
  },
};

export function SettingsShellSidebar({
  isCompactMode = false,
  isOpen = true,
  onClose,
}: SettingsShellSidebarProps) {
  const access = useSettingsStore((state) => state.access);
  const { activeScope, activeSectionId, exitSettings, openSection, setScope } = useSettingsShellStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScopeMenuExpanded, setIsScopeMenuExpanded] = useState(true);

  const canManageSystem = Boolean(access?.canManageSystem ?? true);
  const canManagePersonal = Boolean(access?.canManagePersonal ?? true);

  const scopePermissions: Record<SettingsScope, boolean> = {
    system: canManageSystem,
    personal: canManagePersonal,
  };

  const searchResults = useMemo(() => {
    return searchSettingEntries(searchQuery)
      .filter((result) => (result.scope === 'system' ? canManageSystem : canManagePersonal))
      .slice(0, 8);
  }, [canManagePersonal, canManageSystem, searchQuery]);

  const handleSelectResult = (scope: SettingsScope, sectionId: string) => {
    openSection(scope, sectionId);
    setSearchQuery('');
    setIsSearchOpen(false);
    if (isCompactMode) {
      onClose?.();
    }
  };

  const handleSearchChange = (nextQuery: string) => {
    setSearchQuery(nextQuery);
    if (!nextQuery.trim()) {
      setIsSearchOpen(false);
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && searchResults[0]) {
      event.preventDefault();
      handleSelectResult(searchResults[0].scope, searchResults[0].sectionId);
      return;
    }

    if (event.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  const shouldShowResults = isSearchOpen && searchQuery.trim().length > 0;

  return (
      <aside
        className={cn(
        'fixed left-0 top-0 z-30 flex h-full flex-col overflow-hidden border-r border-ssoo-content-border bg-ssoo-content-bg font-sans',
        'transition-transform duration-300 ease-in-out',
        isCompactMode && 'shadow-xl',
        isCompactMode && !isOpen && '-translate-x-full'
      )}
      style={{ width: LAYOUT_SIZES.sidebar.expandedWidth }}
    >
      <div className="flex h-header-h items-center border-b border-ssoo-content-border bg-ssoo-primary px-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={exitSettings}
          aria-label="설정 모드 닫기"
          className="h-9 w-9 rounded bg-white text-ssoo-primary hover:bg-white/90 hover:text-ssoo-primary"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="ml-2 min-w-0">
          <p className="truncate text-title-card text-white">설정</p>
        </div>
      </div>

      <div className="border-b border-gray-200 p-2">
        <div className="relative">
          <SearchInput
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setIsSearchOpen(false), 120);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="설정 검색..."
            clearAriaLabel="설정 검색 초기화"
          />

          {shouldShowResults && (
            <div className="absolute left-0 top-[calc(100%+4px)] z-20 w-full overflow-hidden rounded-lg border border-ssoo-content-border bg-white shadow-lg">
              {searchResults.length > 0 ? (
                <div className="max-h-80 overflow-y-auto py-1">
                  {searchResults.map((result) => {
                    const isCurrentSection =
                      result.scope === activeScope && result.sectionId === activeSectionId;

                    return (
                      <button
                        key={result.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSelectResult(result.scope, result.sectionId)}
                        className={cn(
                          'flex w-full items-start justify-between gap-3 px-3 py-2 text-left transition-colors',
                          isCurrentSection ? 'bg-ssoo-content-bg/70' : 'hover:bg-ssoo-content-bg/50'
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-label-md text-ssoo-primary">
                            {result.title}
                          </span>
                          <span className="mt-0.5 block truncate text-caption text-ssoo-primary/70">
                            {result.subtitle}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full border border-ssoo-content-border bg-ssoo-content-bg px-2 py-0.5 text-caption text-ssoo-primary/70">
                          {result.kind === 'section' ? '섹션' : '필드'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-3 py-2 text-body-sm text-ssoo-primary/70">
                  일치하는 설정이 없습니다.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ScrollArea variant="sidebar" className="flex-1">
        <Section
          title="설정 메뉴"
          icon={FolderTree}
          isExpanded={isScopeMenuExpanded}
          onToggle={() => setIsScopeMenuExpanded((prev) => !prev)}
        >
          <nav className="space-y-0.5 py-1" aria-label="설정 범위">
            {(['system', 'personal'] as const).map((scope) => {
              const { title, icon: ScopeIcon } = SCOPE_META[scope];
              const isDisabled = !scopePermissions[scope];
              const isActive = activeScope === scope;

              return (
                <button
                  key={scope}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    setScope(scope);
                    if (isCompactMode) {
                      onClose?.();
                    }
                  }}
                  className={cn(
                    'group flex h-control-h w-full cursor-pointer items-center gap-2 rounded-md px-3 text-left text-body-sm transition-colors',
                    isActive
                      ? 'bg-ssoo-content-border text-label-md text-ssoo-primary'
                      : 'text-gray-700 hover:bg-ssoo-sitemap-bg',
                    isDisabled && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <ScopeIcon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      isActive ? 'text-ssoo-primary' : 'text-gray-500'
                    )}
                  />
                  <span className={cn('flex-1 truncate', isActive ? 'text-ssoo-primary' : 'text-gray-700')}>
                    {title}
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

export function SettingsShellHeader() {
  return (
    <header className="flex h-header-h items-center justify-end gap-2 bg-ssoo-primary px-4">
      <div className="flex shrink-0 items-center">
        <UserMenu />
      </div>
    </header>
  );
}

export function SettingsShellContent() {
  return (
    <div className="min-h-0 flex-1 overflow-hidden bg-gray-50">
      <SettingsPage />
    </div>
  );
}
