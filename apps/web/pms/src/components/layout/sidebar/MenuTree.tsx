'use client';

import { useMenuStore, useSidebarStore, useTabStore } from '@/stores';
import { useOpenTabWithConfirm } from '@/hooks';
import { MenuItem } from '@/types';
import { ChevronRight, Folder, FolderOpen, FileText, Star } from 'lucide-react';
import { getIconComponent } from '@/lib/utils/icons';

interface MenuTreeNodeProps {
  item: MenuItem;
  level: number;
}

/**
 * 메뉴 트리 노드
 */
function MenuTreeNode({ item, level }: MenuTreeNodeProps) {
  const { expandedMenuIds, toggleMenuExpand } = useSidebarStore();
  const { isFavorite, addFavorite, removeFavorite } = useMenuStore();
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
      // 탭만 열기 (URL 변경 없음)
      await openTabWithConfirm({
        menuCode: item.menuCode,
        menuId: item.menuId,
        title: item.menuName,
        icon: item.icon,
        path: item.menuPath,
      });
    }
  };

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFavorite(item.menuId)) {
      removeFavorite(item.menuId);
    } else {
      addFavorite({
        menuId: item.menuId,
        menuCode: item.menuCode,
        menuName: item.menuName,
        menuPath: item.menuPath || '',
        icon: item.icon,
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

        {/* 즐겨찾기 버튼 (메뉴만) */}
        {!isFolder && (
          <button
            onClick={handleFavoriteToggle}
            className={`opacity-0 group-hover:opacity-100 h-control-h-sm w-control-h-sm flex items-center justify-center hover:bg-gray-200 rounded transition-opacity ${
              isFavorite(item.menuId) ? 'opacity-100' : ''
            }`}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                isFavorite(item.menuId)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-400'
              }`}
            />
          </button>
        )}
      </div>

      {/* 자식 메뉴 */}
      {isFolder && hasChildren && isExpanded && (
        <div>
          {item.children?.map((child) => (
            <MenuTreeNode key={child.menuId} item={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 검색어에 따라 메뉴 트리 필터링
 */
function filterMenuTree(items: MenuItem[], query: string): MenuItem[] {
  if (!query.trim()) return items;
  
  const lowerQuery = query.toLowerCase();
  
  return items.reduce<MenuItem[]>((acc, item) => {
    const matchesName = item.menuName.toLowerCase().includes(lowerQuery);
    const matchesCode = item.menuCode.toLowerCase().includes(lowerQuery);
    
    // 자식 필터링
    const filteredChildren = item.children ? filterMenuTree(item.children, query) : [];
    
    // 본인이 매치되거나, 자식 중 매치되는 게 있으면 포함
    if (matchesName || matchesCode || filteredChildren.length > 0) {
      acc.push({
        ...item,
        children: filteredChildren.length > 0 ? filteredChildren : item.children,
      });
    }
    
    return acc;
  }, []);
}

/**
 * 사이드바 메뉴 트리
 */
export function MenuTree() {
  const { generalMenus } = useMenuStore();
  const { searchQuery } = useSidebarStore();
  
  const displayTree = searchQuery ? filterMenuTree(generalMenus, searchQuery) : generalMenus;

  if (displayTree.length === 0) {
    return (
      <div className="px-3 py-4 text-sm text-gray-400 text-center">
        {searchQuery ? '검색 결과가 없습니다.' : '메뉴가 없습니다.'}
      </div>
    );
  }

  return (
    <div className="py-1">
      {displayTree.map((item) => (
        <MenuTreeNode key={item.menuId} item={item} level={0} />
      ))}
    </div>
  );
}
