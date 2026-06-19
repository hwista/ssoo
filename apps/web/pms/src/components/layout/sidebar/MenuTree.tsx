'use client';

import type { MouseEvent } from 'react';
import { useMenuStore, useSidebarStore, useTabStore } from '@/stores';
import { useOpenTabWithConfirm } from '@/hooks';
import { MenuItem } from '@/types';
import { ChevronRight, Folder, FolderOpen, FileText, Star } from 'lucide-react';
import { getIconComponent } from '@/lib/utils/icons';
import {
  SsooSidebarEmptyState,
  SsooSidebarSearchableTree,
  SsooSidebarTreeActionButton,
} from '@ssoo/web-shell';

/**
 * 사이드바 메뉴 트리
 */
export function MenuTree() {
  const { generalMenus, isFavorite, addFavorite, removeFavorite } = useMenuStore();
  const { expandedMenuIds, toggleMenuExpand } = useSidebarStore();
  const { tabs, activeTabId } = useTabStore();
  const openTabWithConfirm = useOpenTabWithConfirm();
  const activeTab = tabs.find((tab) => tab.id === activeTabId);

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

  return (
    <SsooSidebarSearchableTree<MenuItem>
      nodes={generalMenus}
      getNodeId={(item) => item.menuId}
      getNodeLabel={(item) => item.menuName}
      getNodeTitle={(item) => item.menuName}
      getNodeChildren={(item) => item.children ?? []}
      getNodeSearchText={(item) => [item.menuName, item.menuCode, item.menuPath ?? '']}
      cloneNodeWithChildren={(item, children) => ({ ...item, children })}
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
          <SsooSidebarTreeActionButton
            label={favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            icon={Star}
            active={favorite}
            tone="warning"
            onClick={(event) => handleFavoriteToggle(event, item)}
          />
        );
      }}
      onNodeSelect={handleNodeSelect}
      disclosureIcon={ChevronRight}
      emptyState={<SsooSidebarEmptyState>메뉴가 없습니다.</SsooSidebarEmptyState>}
    />
  );
}
