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
import {
  LayoutDashboard,
  Users,
  Building2,
  Shield,
  FileText,
  Menu,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: '대시보드', icon: LayoutDashboard },
  { href: '/users', label: '사용자 관리', icon: Users },
  { href: '/organizations', label: '조직 관리', icon: Building2 },
  { href: '/roles', label: '역할 & 권한', icon: Shield },
  { href: '/dms', label: 'DMS 관측', icon: FileText },
] as const;

interface AdminSidebarProps {
  width?: number;
  collapsedWidth?: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function AdminSidebar({
  width = 340,
  collapsedWidth = 56,
  isCollapsed,
  onToggleCollapse,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPlatformSectionExpanded, setIsPlatformSectionExpanded] = useState(true);

  return (
    <SsooSidebarShell
      mode="collapsible"
      expanded={!isCollapsed}
      width={width}
      collapsedWidth={collapsedWidth}
      headerSlot={
        <SsooSidebarBrandHeader
          title="SSOT"
          subtitle="Admin · 플랫폼 관리"
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
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <SsooCollapsedRailButton
                key={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive}
                onClick={() => router.push(item.href)}
              />
            );
          })}
        </nav>
      }
      beforeContentSlot={
        <SsooSidebarToolbar>
          <div className="flex items-center gap-1">
            <SsooSidebarSearchBox
              placeholder="관리 메뉴 검색... (준비 중)"
              disabled
              iconSlot={<Search className="h-4 w-4 text-gray-400" />}
            />
            <SsooSidebarToolbarAction
              label="관리 메뉴 새로고침은 권한 카탈로그 갱신 흐름에서 처리합니다."
              icon={RefreshCw}
              disabled
            />
          </div>
        </SsooSidebarToolbar>
      }
      contentSlot={
        <nav className="min-h-0 flex-1 overflow-auto">
          <SsooSidebarSection
            title="플랫폼 관리"
            icon={Shield}
            collapsible
            expanded={isPlatformSectionExpanded}
            onToggle={() => setIsPlatformSectionExpanded((current) => !current)}
            actionSlot={
              <SsooSidebarSectionChevron
                expanded={isPlatformSectionExpanded}
                expandedIcon={ChevronDown}
                collapsedIcon={ChevronRight}
              />
            }
          >
            <SsooSidebarList>
              {NAV_ITEMS.map((item) => {
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <SsooSidebarListItem
                    key={item.href}
                    label={item.label}
                    title={item.label}
                    icon={item.icon}
                    active={isActive}
                    onSelect={() => router.push(item.href)}
                  />
                );
              })}
            </SsooSidebarList>
          </SsooSidebarSection>
        </nav>
      }
      footerSlot={<SsooSidebarFooter collapsed={isCollapsed} revealOnHover={isCollapsed} />}
    />
  );
}
