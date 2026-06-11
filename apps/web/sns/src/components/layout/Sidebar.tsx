'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  SsooCollapsedRailButton,
  SsooSidebarBrandHeader,
  SsooSidebarFooter,
  SsooSidebarList,
  SsooSidebarListItem,
  SsooSidebarSearchBox,
  SsooSidebarSection,
  SsooSidebarSectionChevron,
  SsooSidebarShell,
  SsooSidebarToolbar,
  SsooSidebarToolbarAction,
} from '@ssoo/web-shell';
import { ChevronDown, ChevronRight, LayoutGrid, Menu, RefreshCw, Search } from 'lucide-react';
import { useAccessStore } from '@/stores';
import { SNS_SHELL_NAV_ITEMS, getSnsShellSection } from './shell-navigation';

const SIDEBAR_COLLAPSED_WIDTH = 56;
const SIDEBAR_EXPANDED_WIDTH = 340;

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const currentSection = getSnsShellSection(pathname);
  const canReadFeed = useAccessStore((state) => state.snapshot?.features.canReadFeed ?? false);
  const [isSocialSectionExpanded, setIsSocialSectionExpanded] = useState(true);

  return (
    <SsooSidebarShell
      mode="collapsible"
      expanded={!isCollapsed}
      collapsedWidth={SIDEBAR_COLLAPSED_WIDTH}
      width={SIDEBAR_EXPANDED_WIDTH}
      headerSlot={
        <SsooSidebarBrandHeader
          title="SSOT"
          subtitle="SNS · 소셜 허브"
          collapsed={isCollapsed}
          revealOnHover={isCollapsed}
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
          {SNS_SHELL_NAV_ITEMS.map((item) => {
            const isActive = currentSection === item.key;
            const isDisabled = item.requiresFeedAccess && !canReadFeed;
            return (
              <SsooCollapsedRailButton
                key={item.key}
                label={item.label}
                icon={item.icon}
                active={isActive}
                disabled={isDisabled}
                onClick={() => {
                  if (!isDisabled) {
                    router.push(item.href);
                  }
                }}
              />
            );
          })}
        </nav>
      }
      beforeContentSlot={
        <SsooSidebarToolbar>
          <div className="flex items-center gap-1">
            <SsooSidebarSearchBox
              placeholder="소셜 메뉴 검색... (준비 중)"
              disabled
              iconSlot={<Search className="h-4 w-4 text-gray-400" />}
            />
            <SsooSidebarToolbarAction
              label="소셜 메뉴 새로고침은 SNS 접근 스냅샷 갱신 흐름에서 처리합니다."
              icon={RefreshCw}
              disabled
            />
          </div>
        </SsooSidebarToolbar>
      }
      contentSlot={
        <nav className="min-h-0 flex-1 overflow-auto">
          <SsooSidebarSection
            title="소셜 메뉴"
            icon={LayoutGrid}
            collapsible
            expanded={isSocialSectionExpanded}
            onToggle={() => setIsSocialSectionExpanded((current) => !current)}
            actionSlot={
              <SsooSidebarSectionChevron
                expanded={isSocialSectionExpanded}
                expandedIcon={ChevronDown}
                collapsedIcon={ChevronRight}
              />
            }
          >
            <SsooSidebarList as="nav" ariaLabel="소셜 메뉴">
              {SNS_SHELL_NAV_ITEMS.map((item) => {
                const isActive = currentSection === item.key;
                const isDisabled = item.requiresFeedAccess && !canReadFeed;
                const Icon = item.icon;

                return (
                  <SsooSidebarListItem
                    key={item.key}
                    label={item.label}
                    title={item.label}
                    description={item.description}
                    icon={Icon}
                    active={isActive}
                    disabled={isDisabled}
                    onSelect={() => {
                      if (isDisabled) {
                        return;
                      }
                      router.push(item.href);
                    }}
                  />
                );
              })}
            </SsooSidebarList>
          </SsooSidebarSection>
        </nav>
      }
      footerSlot={
        <SsooSidebarFooter
          title="SSOT SNS"
          description="소셜 허브"
          meta={null}
          collapsedLabel="SNS"
          collapsed={isCollapsed}
          revealOnHover={isCollapsed}
        />
      }
    />
  );
}
