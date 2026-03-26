'use client';

import { useMenuStore, useSidebarStore, useTabStore } from '@/stores';
import { useOpenTabWithConfirm } from '@/hooks';
import { MenuItem } from '@/types';
import { ChevronRight, Folder, FolderOpen, FileText, Shield } from 'lucide-react';
import { getIconComponent } from '@/lib/utils/icons';

interface AdminMenuTreeNodeProps {
  item: MenuItem;
  level: number;
}

/**
 * 관리자 메뉴 트리 노드
 */
function AdminMenuTreeNode({ item, level }: AdminMenuTreeNodeProps) {
  const { expandedMenuIds, toggleMenuExpand } = useSidebarStore();
  const { tabs, activeTabId } = useTabStore();
  const openTabWithConfirm = useOpenTabWithConfirm();
  
  const isExpanded = expandedMenuIds.has(item.menuId);
  const isFolder = item.menuType === 'group';
  const hasChildren = item.children && item.children.length > 0;
  
  // 현재 활성 탭과 매칭되는지 확인
  const activeTab = tabs.find(tab => tab.id === activeTabId);
  const isActive = !isFolder && activeTab?.menuId === item.menuId;
  
  const CustomIcon = getIconComponent(item.icon);
  const IconComponent = CustomIcon 
    || (isFolder ? (isExpanded ? FolderOpen : Folder) : FileText);

  const handleClick = async () => {
    if (isFolder) {
      toggleMenuExpand(item.menuId);
    } else if (item.menuPath) {
      await openTabWithConfirm({
        menuCode: item.menuCode,
        menuId: item.menuId,
        title: item.menuName,
        icon: item.icon,
        path: item.menuPath,
      });
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={`flex items-center gap-1 w-full h-control-h px-2 text-sm rounded-md transition-colors cursor-pointer group ${
          isActive 
            ? 'bg-ssoo-content-border text-ssoo-primary font-medium' 
            : 'hover:bg-ssoo-sitemap-bg text-gray-700'
        }`}
        style={{ paddingLeft: `${8 + level * 16}px` }}
      >
        {/* 폴더 확장/축소 아이콘 */}
        {isFolder && hasChildren ? (
          <ChevronRight
            className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
        ) : (
          <span className="w-4 h-4 flex-shrink-0" />
        )}

        {/* 메뉴 아이콘 */}
        <IconComponent className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-ssoo-primary' : 'text-gray-500'}`} />

        {/* 메뉴명 */}
        <span className={`flex-1 truncate ${isActive ? 'text-ssoo-primary' : 'text-gray-700'}`}>{item.menuName}</span>
      </div>

      {/* 자식 메뉴 */}
      {isFolder && hasChildren && isExpanded && (
        <div>
          {item.children?.map((child) => (
            <AdminMenuTreeNode key={child.menuId} item={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 사이드바 관리자 메뉴 트리
 * - is_admin_menu = true 메뉴 표시
 * - isAdmin 사용자에게만 표시됨 (상위에서 제어)
 */
export function AdminMenu() {
  const { adminMenus } = useMenuStore();
  const { searchQuery } = useSidebarStore();
  
  // 간단한 검색 필터
  const filterMenus = (items: MenuItem[], query: string): MenuItem[] => {
    if (!query.trim()) return items;
    const lowerQuery = query.toLowerCase();
    
    return items.reduce<MenuItem[]>((acc, item) => {
      const matchesName = item.menuName.toLowerCase().includes(lowerQuery);
      const matchesCode = item.menuCode.toLowerCase().includes(lowerQuery);
      const filteredChildren = item.children ? filterMenus(item.children, query) : [];
      
      if (matchesName || matchesCode || filteredChildren.length > 0) {
        acc.push({
          ...item,
          children: filteredChildren.length > 0 ? filteredChildren : item.children,
        });
      }
      return acc;
    }, []);
  };

  const displayTree = searchQuery ? filterMenus(adminMenus, searchQuery) : adminMenus;

  if (displayTree.length === 0) {
    return (
      <div className="px-3 py-4 text-sm text-gray-400 text-center">
        {searchQuery ? '검색 결과가 없습니다.' : '관리자 메뉴가 없습니다.'}
      </div>
    );
  }

  return (
    <div className="py-1">
      {displayTree.map((item) => (
        <AdminMenuTreeNode key={item.menuId} item={item} level={0} />
      ))}
    </div>
  );
}

/**
 * 관리자 메뉴 섹션 (export용)
 */
export { Shield as AdminIcon };
