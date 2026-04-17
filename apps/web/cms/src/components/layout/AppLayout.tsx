'use client';

import { ShellFrame, ShellPageContainer } from '@ssoo/web-shell';
import { CMS_SHELL_SIZES } from '@/lib/constants/layout';
import { Header } from './Header';
import { SecondaryStrip } from './SecondaryStrip';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <ShellFrame
      sidebar={<Sidebar />}
      mainOffset={CMS_SHELL_SIZES.sidebar.collapsedWidth}
      className="bg-gray-50"
    >
      <Header />
      <SecondaryStrip />
      <div className="flex-1 overflow-auto bg-background">
        <ShellPageContainer as="div" className="max-w-[1440px] px-4 py-6">
          {children}
        </ShellPageContainer>
      </div>
    </ShellFrame>
  );
}
