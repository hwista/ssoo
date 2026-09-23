'use client';

import { useCallback, type ComponentProps } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SsooAppHeader, useSsooGlobalHeaderSearch } from '@ssoo/web-shell';
import { Menu, Plus, X } from 'lucide-react';
import { useAccessStore, useTabStore } from '@/stores';
import { GLOBAL_SEARCH_PATH } from '@/lib/constants/routes';
import { UserMenu } from './UserMenu';
import { HeaderNotifications } from './HeaderNotifications';

interface HeaderProps {
  variant?: 'workspace' | 'settings';
  mobile?: boolean;
  mobileMenuOpen?: boolean;
  onMobileMenuClick?: () => void;
}

/**
 * DMS 상단 헤더 컴포넌트
 * - 통합 검색
 * - 새 도큐먼트 버튼 (탭 내 런처 페이지로 이동)
 * - 알림
 * - 사용자 프로필
 */
export function Header({
  variant = 'workspace',
  mobile = false,
  mobileMenuOpen = false,
  onMobileMenuClick,
}: HeaderProps) {
  const mobileHeaderProps: Pick<ComponentProps<typeof SsooAppHeader>, 'leading' | 'leadingAction'> = mobile ? {
    leading: { title: 'DMS / 문서', subtitle: variant === 'settings' ? '환경설정' : '문서 관리' },
    leadingAction: {
      iconSlot: mobileMenuOpen ? <X /> : <Menu />,
      'aria-controls': 'dms-mobile-sidebar',
      'aria-expanded': mobileMenuOpen,
      'aria-label': mobileMenuOpen ? '모바일 메뉴 닫기' : '모바일 메뉴 열기',
      title: mobileMenuOpen ? '모바일 메뉴 닫기' : '모바일 메뉴 열기',
      onClick: onMobileMenuClick,
    },
  } : {};

  if (variant === 'settings') {
    return <SsooAppHeader mode="primary" {...mobileHeaderProps} />;
  }

  return (
    <WorkspaceHeader
      mobile={mobile}
      mobileHeaderProps={mobileHeaderProps}
    />
  );
}

interface WorkspaceHeaderProps {
  mobile: boolean;
  mobileHeaderProps: Pick<ComponentProps<typeof SsooAppHeader>, 'leading' | 'leadingAction'>;
}

function WorkspaceHeader({ mobile, mobileHeaderProps }: WorkspaceHeaderProps) {
  const { openTab, updateTab } = useTabStore();
  const pathname = usePathname();
  const router = useRouter();
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const canUseSearch = accessSnapshot?.features.canUseSearch ?? false;
  const canWriteDocuments = accessSnapshot?.features.canWriteDocuments ?? false;

  const globalHeaderSearch = useSsooGlobalHeaderSearch({
    disabled: !canUseSearch,
    clearOnOpen: true,
    onOpenSearch: ({ path, title, icon }) => {
      const tabId = openTab({
        id: 'global-search',
        title,
        path,
        icon,
        closable: true,
        activate: true,
      });
      if (tabId) {
        updateTab(tabId, {
          title,
          path,
          icon,
        });
        if (pathname === GLOBAL_SEARCH_PATH) router.replace(path);
      }
    },
  });

  const handleCreateDocument = useCallback(() => {
    if (!canWriteDocuments) {
      return;
    }
    openTab({
      id: `new-doc-${Date.now()}`,
      title: '새 문서',
      path: '/doc/new',
      icon: 'FileText',
      closable: true,
      activate: true,
    });
  }, [canWriteDocuments, openTab]);

  return (
    <SsooAppHeader
      mode="primary"
      {...mobileHeaderProps}
      search={mobile ? null : globalHeaderSearch.search}
      primaryAction={mobile ? null : {
        label: '새 문서',
        iconSlot: <Plus />,
        type: 'button',
        onClick: handleCreateDocument,
        disabled: !canWriteDocuments,
        tone: 'primary-on-color',
        title: '새 문서를 작성합니다.',
      }}
      notificationSlot={<HeaderNotifications />}
      userMenuSlot={({ dropdownWidth }) => <UserMenu dropdownWidth={dropdownWidth} />}
    />
  );
}
