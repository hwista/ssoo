'use client';

import type { MouseEvent } from 'react';
import { useMenuStore, useSidebarStore, useTabStore } from '@/stores';
import { useOpenTabWithConfirm } from '@/hooks';
import { MenuItem } from '@/types';
import { ChevronRight, Folder, FolderOpen, FileText, Star } from 'lucide-react';
import { getIconComponent } from '@/lib/utils/icons';
import { SsooSidebarEmptyState, SsooSidebarTree, filterSsooSidebarTree } from '@ssoo/web-shell';

/**
 * 사이드바 메뉴 트리
 */
export function MenuTree() {
  const { generalMenus, isFavorite, addFavorite, removeFavorite } = useMenuStore();
  const { expandedMenuIds, searchQuery, toggleMenuExpand } = useSidebarStore();
  const { tabs, activeTabId } = useTabStore();
  const openTabWithConfirm = useOpenTabWithConfirm();
  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  const displayTree = searchQuery ? filterSsooSidebarTree(generalMenus, searchQuery, {
    getNodeSearchText: (item) => [item.menuName, item.menuCode],
    getNodeChildren: (item) => item.children ?? [],
    cloneNodeWithChildren: (item, children) => ({ ...item, children }),
  }) : generalMenus;

  const handleNodeSelect = async (item: MenuItem) => {
    if (item.menuType === 'group') {
      toggleMenuExpand(item.menuId);
      return;
    }

    if (item.menuPath) {
      await openTabWithConfirm({
        menuCode: item.menuCode,
        menuId: item.menuId,
        title: item.menuName,
        icon: item.icon,
        path: item.menuPath,
      });
    }
  };

  const handleFavoriteToggle = (event: MouseEvent<HTMLButtonElement>, item: MenuItem) => {
    event.stopPropagation();

    if (isFavorite(item.menuId)) {
      removeFavorite(item.menuId);
      return;
    }

    addFavorite({
      menuId: item.menuId,
      menuCode: item.menuCode,
      menuName: item.menuName,
      menuPath: item.menuPath || '',
      icon: item.icon,
    });
  };

  if (displayTree.length === 0) {
    return (
      <SsooSidebarEmptyState className="px-3 py-4 text-center text-sm">
        {searchQuery ? '검색 결과가 없습니다.' : '메뉴가 없습니다.'}
      </SsooSidebarEmptyState>
    );
  }

  return (
    <SsooSidebarTree<MenuItem>
      nodes={displayTree}
      getNodeId={(item) => item.menuId}
      getNodeLabel={(item) => item.menuName}
      getNodeTitle={(item) => item.menuName}
      getNodeChildren={(item) => item.children ?? []}
      isNodeFolder={(item) => item.menuType === 'group'}
      isNodeExpanded={(item) => expandedMenuIds.has(item.menuId)}
      isNodeActive={(item) => item.menuType !== 'group' && activeTab?.menuId === item.menuId}
      getNodeIcon={(item, state) => {
        const CustomIcon = getIconComponent(item.icon);
        return CustomIcon || (state.folder ? (state.expanded ? FolderOpen : Folder) : FileText);
      }}
      renderNodeTrailingAction={(item, state) => {
        if (state.folder) {
          return null;
        }

        const favorite = isFavorite(item.menuId);

        return (
          <button
            type="button"
            onClick={(event) => handleFavoriteToggle(event, item)}
            className={`flex h-control-h-sm w-control-h-sm items-center justify-center rounded opacity-0 transition-opacity hover:bg-gray-200 group-hover:opacity-100 ${
              favorite ? 'opacity-100' : ''
            }`}
            aria-label={favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          >
            <Star
              className={`h-3.5 w-3.5 ${
                favorite
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-400'
              }`}
            />
          </button>
        );
      }}
      onNodeSelect={handleNodeSelect}
      disclosureIcon={ChevronRight}
    />
  );
}
