'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';

interface SectionProps {
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
export function Section({
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  children,
  headerAction,
}: SectionProps) {
  return (
    <div className="border-b border-gray-200">
      <div className="flex items-center w-full h-control-h px-3 hover:bg-ssoo-sitemap-bg transition-colors">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 flex-1 h-full"
        >
          <Icon className="w-4 h-4 text-ssoo-primary" />
          <span className="text-sm font-medium text-ssoo-primary">{title}</span>
        </button>
        <div className="flex items-center gap-1">
          {headerAction}
          <button onClick={onToggle} className="h-control-h-sm w-control-h-sm flex items-center justify-center">
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
