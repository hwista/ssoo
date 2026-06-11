'use client';

import { useMenuStore, useSidebarStore, useTabStore } from '@/stores';
import { useOpenTabWithConfirm } from '@/hooks';
import { MenuItem } from '@/types';
import { ChevronRight, Folder, FolderOpen, FileText, Shield } from 'lucide-react';
import { getIconComponent } from '@/lib/utils/icons';
import { SsooSidebarEmptyState, SsooSidebarTree, filterSsooSidebarTree } from '@ssoo/web-shell';

/**
 * 사이드바 관리자 메뉴 트리
 * - is_admin_menu = true 메뉴 표시
 * - isAdmin 사용자에게만 표시됨 (상위에서 제어)
 */
export function AdminMenu() {
  const { adminMenus } = useMenuStore();
  const { expandedMenuIds, searchQuery, toggleMenuExpand } = useSidebarStore();
  const { tabs, activeTabId } = useTabStore();
  const openTabWithConfirm = useOpenTabWithConfirm();
  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  const displayTree = searchQuery ? filterSsooSidebarTree(adminMenus, searchQuery, {
    getNodeSearchText: (item) => [item.menuName, item.menuCode],
    getNodeChildren: (item) => item.children ?? [],
    cloneNodeWithChildren: (item, children) => ({ ...item, children }),
  }) : adminMenus;

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

  if (displayTree.length === 0) {
    return (
      <SsooSidebarEmptyState className="px-3 py-4 text-center text-sm">
        {searchQuery ? '검색 결과가 없습니다.' : '관리자 메뉴가 없습니다.'}
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
      onNodeSelect={handleNodeSelect}
      disclosureIcon={ChevronRight}
    />
  );
}

/**
 * 관리자 메뉴 섹션 (export용)
 */
export { Shield as AdminIcon };
