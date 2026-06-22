'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { SsooAppFrame } from '@ssoo/web-shell';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import { ContentArea } from './ContentArea';
import { getSnsShellTabOptions } from './shell-navigation';
import { useTabStore } from '@/stores';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setIsSidebarCollapsed((current) => !current);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openTab = useTabStore((state) => state.openTab);
  const currentPath = useMemo(() => {
    const search = searchParams.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    openTab(getSnsShellTabOptions(currentPath));
  }, [currentPath, openTab]);

  void children;

  return (
    <SsooAppFrame
      mode="social"
      sidebarMode="collapsible"
      sidebarExpanded={!isSidebarCollapsed}
      sidebarSlot={
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      }
      headerSlot={<Header />}
      tabBarSlot={<TabBar />}
      contentSlot={<ContentArea />}
    />
  );
}
