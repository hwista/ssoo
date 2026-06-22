'use client';

import { useCallback } from 'react';
import { SsooAppHeader, useSsooGlobalHeaderSearch } from '@ssoo/web-shell';
import { Plus } from 'lucide-react';
import { useAccessStore, useTabStore } from '@/stores';
import { UserMenu } from './UserMenu';
import { HeaderNotifications } from './HeaderNotifications';

interface HeaderProps {
  variant?: 'workspace' | 'settings';
}

/**
 * DMS 상단 헤더 컴포넌트
 * - 통합 검색
 * - 새 도큐먼트 버튼 (탭 내 런처 페이지로 이동)
 * - 알림
 * - 사용자 프로필
 */
export function Header({ variant = 'workspace' }: HeaderProps) {
  if (variant === 'settings') {
    return <SsooAppHeader mode="primary" />;
  }

  return <WorkspaceHeader />;
}

function WorkspaceHeader() {
  const { openTab, updateTab } = useTabStore();
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
      search={globalHeaderSearch.search}
      primaryAction={{
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
