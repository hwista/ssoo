'use client';

import { useRef, useState, useEffect } from 'react';
import { Search, Plus, Bell } from 'lucide-react';
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
    <header className="h-header-h flex items-center justify-between px-4 bg-ssoo-primary">
      {/* 왼쪽: 통합 검색 (추후 Elasticsearch 또는 AI 챗 연동 예정) */}
      <div className="flex items-center flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="text"
            placeholder="통합 검색... (준비 중)"
            disabled
            className="w-full h-control-h pl-9 pr-4 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 cursor-not-allowed"
          />
        </div>
      </div>

      {/* 오른쪽: 액션 버튼들 */}
      <div ref={actionsRef} className="flex items-center gap-2">
        {/* 빠른 생성 */}
        <button
          className="flex items-center gap-1 h-control-h px-3 bg-white text-ssoo-primary text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>새 프로젝트</span>
        </button>

        {/* 알림 */}
        <button
          className="relative h-control-h w-control-h flex items-center justify-center hover:bg-white/10 rounded-md transition-colors"
          title="알림"
        >
          <Bell className="w-5 h-5 text-white" />
          {/* 알림 뱃지 (임시) */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-ls-red rounded-full" />
        </button>

        {/* 사용자 프로필 */}
        <UserMenu dropdownWidth={actionsWidth} />
      </div>
    </header>
  );
}
