'use client';

import { Menu, Plus, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { SsooAppHeader, useSsooGlobalHeaderSearch } from '@ssoo/web-shell';
import { APP_HOME_PATH } from '@/lib/constants/routes';
import { useAccessStore, useTabStore } from '@/stores';
import { UserMenu } from './UserMenu';
import { HeaderNotifications } from './HeaderNotifications';

interface HeaderProps {
  mobile?: boolean;
  mobileMenuOpen?: boolean;
  onMobileMenuClick?: () => void;
}

export function Header({
  mobile = false,
  mobileMenuOpen = false,
  onMobileMenuClick,
}: HeaderProps) {
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const openTab = useTabStore((state) => state.openTab);
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const router = useRouter();
  const pathname = usePathname();
  const canReadFeed = accessSnapshot?.features.canReadFeed ?? false;
  const canCreatePost = accessSnapshot?.features.canCreatePost ?? false;

  const globalHeaderSearch = useSsooGlobalHeaderSearch({
    disabled: !canReadFeed,
    onOpenSearch: ({ query, encodedQuery, path, title }) => {
      const opened = openTab({
        id: query ? `sns-global-search-${encodedQuery}` : 'sns-global-search',
        title,
        path,
        closable: true,
        activate: true,
      });
      if (opened && pathname.startsWith('/post/')) router.push(path);
    },
  });

  return (
    <SsooAppHeader
      mode="primary"
      leading={mobile ? { title: `SNS / ${activeTab?.title ?? '피드'}`, subtitle: '소셜 협업' } : undefined}
      leadingAction={mobile ? {
        iconSlot: mobileMenuOpen ? <X /> : <Menu />,
        'aria-controls': 'sns-mobile-sidebar',
        'aria-expanded': mobileMenuOpen,
        'aria-label': mobileMenuOpen ? '모바일 메뉴 닫기' : '모바일 메뉴 열기',
        title: mobileMenuOpen ? '모바일 메뉴 닫기' : '모바일 메뉴 열기',
        onClick: onMobileMenuClick,
      } : null}
      search={mobile ? null : globalHeaderSearch.search}
      primaryAction={mobile ? null : {
        label: '새 게시물',
        iconSlot: <Plus />,
        type: 'button',
        onClick: () => {
          if (!canCreatePost) {
            return;
          }
          router.push(`${APP_HOME_PATH}?compose=1`);
        },
        disabled: !canCreatePost,
        tone: 'primary-on-color',
        title: '새 게시물 작성',
      }}
      notificationSlot={<HeaderNotifications />}
      userMenuSlot={({ dropdownWidth }) => <UserMenu dropdownWidth={dropdownWidth} />}
    />
  );
}
