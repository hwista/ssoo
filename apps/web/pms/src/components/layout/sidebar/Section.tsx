'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronDown, ChevronRight, MoreVertical, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';

interface SectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  /** 추가 액션 버튼 (접기 토글 왼쪽에 표시) */
  headerAction?: ReactNode;
}

/**
 * 사이드바 섹션 래퍼 컴포넌트
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

interface ContextMenuItem {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface ContextMenuButtonProps {
  items: ContextMenuItem[];
}

/**
 * 세로 점 3개 버튼 + 플로팅 컨텍스트 메뉴
 */
export function ContextMenuButton({ items }: ContextMenuButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleItemClick = (item: ContextMenuItem) => {
    if (!item.disabled) {
      item.onClick();
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="h-control-h-sm w-control-h-sm flex items-center justify-center hover:bg-gray-200 rounded transition-colors"
        title="더 보기"
      >
        <MoreVertical className="w-4 h-4 text-gray-500" />
      </button>
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1"
        >
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
              className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                item.disabled
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ExpandCollapseToggleProps {
  isAllExpanded: boolean;
  onToggle: () => void;
}

/**
 * 모두 펼치기/모두 접기 토글 버튼
 */
export function ExpandCollapseToggle({ isAllExpanded, onToggle }: ExpandCollapseToggleProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="h-control-h-sm w-control-h-sm flex items-center justify-center hover:bg-gray-200 rounded transition-colors"
      title={isAllExpanded ? '모두 접기' : '모두 펼치기'}
    >
      {isAllExpanded ? (
        <ChevronsDownUp className="w-4 h-4 text-gray-500" />
      ) : (
        <ChevronsUpDown className="w-4 h-4 text-gray-500" />
      )}
    </button>
  );
}
