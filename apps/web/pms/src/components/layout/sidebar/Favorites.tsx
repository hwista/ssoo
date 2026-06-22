'use client';

import type { MouseEvent } from 'react';
import { useMenuStore } from '@/stores';
import { useOpenTabWithConfirm } from '@/hooks';
import { Star, X } from 'lucide-react';
import { getIconComponent } from '@/lib/utils/icons';
import {
  SsooSidebarEmptyState,
  SsooSidebarSearchableTree,
  SsooSidebarTreeActionButton,
  SsooSidebarTreeNodeIcon,
} from '@ssoo/web-shell';

/**
 * 사이드바 즐겨찾기 목록
 * - 각 항목에 삭제 버튼 포함
 */
export function Favorites() {
  const { favorites, removeFavorite } = useMenuStore();
  const openTabWithConfirm = useOpenTabWithConfirm();

  if (favorites.length === 0) {
    return (
      <SsooSidebarEmptyState>
        즐겨찾기한 메뉴가 없습니다.
      </SsooSidebarEmptyState>
    );
  }

  const handleClick = async (favorite: typeof favorites[0]) => {
    await openTabWithConfirm({
      menuCode: favorite.menuCode,
      menuId: favorite.menuId,
      title: favorite.menuName,
      icon: favorite.icon,
      path: favorite.menuPath,
    });
    // URL 변경 없음
  };

  const handleRemove = (e: MouseEvent<HTMLButtonElement>, menuId: string) => {
    e.stopPropagation();
    removeFavorite(menuId);
  };

  return (
    <SsooSidebarSearchableTree<(typeof favorites)[number]>
      nodes={favorites}
      getNodeId={(favorite) => favorite.id}
      getNodeLabel={(favorite) => favorite.menuName}
      getNodeTitle={(favorite) => favorite.menuName}
      getNodeSearchText={(favorite) => [favorite.menuName, favorite.menuCode, favorite.menuPath ?? '']}
      renderNodeIcon={(favorite) => {
        const IconComponent = getIconComponent(favorite.icon);
        return IconComponent ? (
          <SsooSidebarTreeNodeIcon icon={IconComponent} />
        ) : (
          <SsooSidebarTreeNodeIcon icon={Star} tone="warning" filled />
        );
      }}
      renderNodeTrailingAction={(favorite) => (
        <SsooSidebarTreeActionButton
          label="즐겨찾기 해제"
          icon={X}
          onClick={(event) => handleRemove(event, favorite.menuId)}
        />
      )}
      onNodeSelect={(favorite) => {
        void handleClick(favorite);
      }}
      emptyState={<SsooSidebarEmptyState>즐겨찾기한 메뉴가 없습니다.</SsooSidebarEmptyState>}
    />
  );
}
