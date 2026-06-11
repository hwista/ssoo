'use client';

import { useMemo, useState } from 'react';
import type { ComponentType, KeyboardEvent } from 'react';
import { ArrowLeft, Menu, Search as SearchIcon, Shield, SlidersHorizontal, X } from 'lucide-react';
import {
  SsooHeader,
  SsooCollapsedRailButton,
  SsooSidebarBrandHeader,
  SsooSidebarFooter,
  SsooSidebarList,
  SsooSidebarListItem,
  SsooSidebarSearchBox,
  SsooSidebarShell,
  SsooSidebarToolbar,
} from '@ssoo/web-shell';
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

interface SettingsShellSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
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
  isCollapsed,
  onToggleCollapse,
}: SettingsShellSidebarProps) {
  const access = useSettingsStore((state) => state.access);
  const { activeScope, activeSectionId, exitSettings, openSection, setScope } = useSettingsShellStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const canManageSystem = Boolean(access?.canManageSystem ?? false);
  const canManagePersonal = Boolean(access?.canManagePersonal ?? true);

  const scopePermissions: Record<SettingsScope, boolean> = {
    system: canManageSystem,
    personal: canManagePersonal,
  };
  const visibleScopes = useMemo<SettingsScope[]>(() => {
    const scopes: SettingsScope[] = [];
    if (canManageSystem) scopes.push('system');
    if (canManagePersonal) scopes.push('personal');
    return scopes;
  }, [canManagePersonal, canManageSystem]);

  const searchResults = useMemo(() => {
    return searchSettingEntries(searchQuery)
      .filter((result) => {
        if (result.scope === 'personal') {
          return canManagePersonal;
        }
        return canManageSystem;
      })
      .slice(0, 8);
  }, [canManagePersonal, canManageSystem, searchQuery]);

  const handleSelectResult = (scope: SettingsScope, sectionId: string) => {
    openSection(scope, sectionId);
    setSearchQuery('');
    setIsSearchOpen(false);
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
    <SsooSidebarShell
      mode="collapsible"
      expanded={!isCollapsed}
      width={LAYOUT_SIZES.sidebar.expandedWidth}
      collapsedWidth={LAYOUT_SIZES.sidebar.collapsedWidth}
      className="font-sans"
      headerSlot={
        <SsooSidebarBrandHeader
          title="설정"
          collapsed={isCollapsed}
          revealOnHover={isCollapsed}
          mark={
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
          }
          actionsSlot={
            <button
              type="button"
              onClick={onToggleCollapse}
              className="rounded-lg p-2 transition-colors hover:bg-white/10"
              title={isCollapsed ? '펼치기' : '접기'}
            >
              <Menu className="h-5 w-5 text-white" />
            </button>
          }
        />
      }
      railSlot={
        <nav className="flex flex-col items-center gap-1 py-2">
          {visibleScopes.map((scope) => {
            const { title, icon: ScopeIcon } = SCOPE_META[scope];
            const isDisabled = !scopePermissions[scope];
            const isActive = activeScope === scope;

            return (
              <SsooCollapsedRailButton
                key={scope}
                label={title}
                icon={ScopeIcon}
                active={isActive}
                disabled={isDisabled}
                onClick={() => setScope(scope)}
              />
            );
          })}
        </nav>
      }
      beforeContentSlot={
        <SsooSidebarToolbar>
          <div className="relative">
            <SsooSidebarSearchBox
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setIsSearchOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setIsSearchOpen(false), 120);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="설정 검색..."
              iconSlot={<SearchIcon className="h-4 w-4 text-gray-400" />}
              trailingSlot={
                searchQuery ? (
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSearchChange('')}
                    className="absolute right-2 top-1/2 flex h-control-h-sm w-control-h-sm -translate-y-1/2 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="설정 검색 초기화"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null
              }
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
        </SsooSidebarToolbar>
      }
      contentSlot={
        <ScrollArea variant="sidebar" className="flex-1">
          <SsooSidebarList as="nav" ariaLabel="설정 범위" className="py-2">
            {visibleScopes.map((scope) => {
              const { title, icon: ScopeIcon } = SCOPE_META[scope];
              const isDisabled = !scopePermissions[scope];
              const isActive = activeScope === scope;

              return (
                <SsooSidebarListItem
                  key={scope}
                  icon={ScopeIcon}
                  label={title}
                  active={isActive}
                  disabled={isDisabled}
                  onSelect={() => {
                    setScope(scope);
                  }}
                />
              );
            })}
          </SsooSidebarList>
        </ScrollArea>
      }
      footerSlot={<SsooSidebarFooter collapsed={isCollapsed} revealOnHover={isCollapsed} />}
    />
  );
}

export function SettingsShellHeader() {
  return (
    <SsooHeader
      mode="primary"
      actionsSlot={
        <UserMenu />
      }
    />
  );
}

export function SettingsShellContent() {
  return (
    <div className="min-h-0 flex-1 overflow-hidden bg-gray-50">
      <SettingsPage />
    </div>
  );
}
