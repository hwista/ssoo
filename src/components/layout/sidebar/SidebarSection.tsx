'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';

interface SidebarSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  /** 추가 액션 버튼 (접기 토글 왼쪽에 표시) */
  headerAction?: React.ReactNode;
}

/**
 * 사이드바 섹션 래퍼 컴포넌트 (PMS 표준)
 * - 접기/펼치기 토글
 * - 아이콘 + 제목
 * - 선택적 추가 액션 버튼
 */
export function SidebarSection({
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  children,
  headerAction,
}: SidebarSectionProps) {
  return (
    <div className="border-b border-gray-200">
      <div className="flex items-center w-full px-3 py-2 hover:bg-ssoo-sitemap-bg transition-colors">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 flex-1"
        >
          <Icon className="w-4 h-4 text-ssoo-primary" />
          <span className="text-sm font-medium text-ssoo-primary">{title}</span>
        </button>
        <div className="flex items-center gap-1">
          {headerAction}
          <button onClick={onToggle} className="p-0.5">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-ssoo-primary" />
            ) : (
              <ChevronRight className="w-4 h-4 text-ssoo-primary" />
            )}
          </button>
        </div>
      </div>
      {isExpanded && <div className="pb-2">{children}</div>}
    </div>
  );
}
