'use client';

import { useState } from 'react';
import { ShellPageContainer, SsooAppFrame } from '@ssoo/web-shell';
import { SNS_SHELL_SIZES } from '@/lib/constants/layout';
import { Header } from './Header';
import { SecondaryStrip } from './SecondaryStrip';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setIsSidebarCollapsed((current) => !current);

  return (
    <SsooAppFrame
      mode="social"
      sidebarMode="collapsible"
      sidebarExpanded={!isSidebarCollapsed}
      collapsedSidebarWidth={SNS_SHELL_SIZES.sidebar.collapsedWidth}
      sidebarWidth={SNS_SHELL_SIZES.sidebar.expandedWidth}
      sidebarSlot={
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      }
      headerSlot={<Header />}
      tabBarSlot={<SecondaryStrip />}
      contentSlot={
        <ShellPageContainer as="div" className="max-w-[1440px] px-4 py-6">
          {children}
        </ShellPageContainer>
      }
      className="bg-gray-50"
      contentClassName="bg-background"
    />
  );
}
