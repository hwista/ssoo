'use client';

import { useRef, useState, useEffect } from 'react';
import { SsooHeader, SsooHeaderActionButton, SsooHeaderIconButton, SsooHeaderSearchBox } from '@ssoo/web-shell';
import { Search, Plus, Bell } from 'lucide-react';
import { useTabStore } from '@/stores';
import { UserMenu } from './UserMenu';

/**
 * 상단 헤더 컴포넌트
 * - 로고
 * - 햄버거 메뉴 (사이드바 토글)
 * - 빠른 생성 버튼
 * - 알림
 * - 사용자 프로필
 */
export function Header() {
  const actionsRef = useRef<HTMLDivElement>(null);
  const [actionsWidth, setActionsWidth] = useState(0);
  const openTab = useTabStore((state) => state.openTab);

  const handleCreateProject = () => {
    openTab({
      menuCode: 'PMS-REQUEST-CREATE',
      menuId: 'pms-request-create',
      title: '새 프로젝트',
      path: '/request/create',
      icon: 'Plus',
    });
  };

  useEffect(() => {
    const el = actionsRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setActionsWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <SsooHeader
      mode="primary"
      searchSlot={
        <SsooHeaderSearchBox
          placeholder="통합 검색... (준비 중)"
          disabled
          iconSlot={<Search className="h-4 w-4 text-white/50" />}
        />
      }
      actionsSlot={
        <div ref={actionsRef} className="flex items-center gap-2">
          {/* 빠른 생성 */}
          <SsooHeaderActionButton onClick={handleCreateProject} title="새 프로젝트 요청 탭 열기">
            <Plus className="h-4 w-4" />
            <span>새 프로젝트</span>
          </SsooHeaderActionButton>

          {/* 알림 */}
          <SsooHeaderIconButton title="알림">
            <Bell className="h-5 w-5 text-white" />
            {/* 알림 뱃지 (임시) */}
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-ls-red" />
          </SsooHeaderIconButton>

          {/* 사용자 프로필 */}
          <UserMenu dropdownWidth={actionsWidth} />
        </div>
      }
      actionsClassName="gap-0"
    />
  );
}
