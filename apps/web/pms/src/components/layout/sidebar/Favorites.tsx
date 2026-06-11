'use client';

import type { MouseEvent } from 'react';
import { useMenuStore } from '@/stores';
import { useOpenTabWithConfirm } from '@/hooks';
import { Star, X } from 'lucide-react';
import { getIconComponent } from '@/lib/utils/icons';
import { SsooSidebarEmptyState, SsooSidebarList, SsooSidebarListItem } from '@ssoo/web-shell';

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
    <SsooSidebarList padded={false}>
      {favorites.map((favorite) => {
        const IconComponent = getIconComponent(favorite.icon);

        return (
          <SsooSidebarListItem
            key={favorite.id}
            icon={IconComponent ?? undefined}
            leadingSlot={
              IconComponent ? null : (
                <Star className="h-4 w-4 flex-shrink-0 fill-yellow-400 text-yellow-400" />
              )
            }
            label={favorite.menuName}
            title={favorite.menuName}
            onSelect={() => {
              void handleClick(favorite);
            }}
            trailingAction={
              <button
                type="button"
                onClick={(e) => handleRemove(e, favorite.menuId)}
                className="flex h-control-h-sm w-control-h-sm flex-shrink-0 items-center justify-center rounded opacity-0 transition-opacity hover:bg-gray-200 group-hover:opacity-100"
                title="즐겨찾기 해제"
              >
                <X className="h-3 w-3 text-gray-500" />
              </button>
            }
          />
        );
      })}
    </SsooSidebarList>
  );
}
