'use client';

import { useMenuStore } from '@/stores';
import { useOpenTabWithConfirm } from '@/hooks';
import { Star, X } from 'lucide-react';
import { getIconComponent } from '@/lib/utils/icons';

/**
 * 사이드바 즐겨찾기 목록
 * - 각 항목에 삭제 버튼 포함
 */
export function Favorites() {
  const { favorites, removeFavorite } = useMenuStore();
  const openTabWithConfirm = useOpenTabWithConfirm();

  if (favorites.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-gray-400">
        즐겨찾기한 메뉴가 없습니다.
      </div>
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

  const handleRemove = (e: React.MouseEvent, menuId: string) => {
    e.stopPropagation();
    removeFavorite(menuId);
  };

  return (
    <div className="space-y-0.5">
      {favorites.map((favorite) => {
        const IconComponent = getIconComponent(favorite.icon);

        return (
          <div
            key={favorite.id}
            className="flex items-center gap-2 w-full h-control-h px-3 text-sm text-gray-700 hover:bg-ssoo-sitemap-bg rounded-md transition-colors group"
          >
            <button
              onClick={() => handleClick(favorite)}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              {IconComponent ? (
                <IconComponent className="w-4 h-4 text-gray-500 flex-shrink-0" />
              ) : (
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
              )}
              <span className="truncate">{favorite.menuName}</span>
            </button>
            <button
              onClick={(e) => handleRemove(e, favorite.menuId)}
              className="opacity-0 group-hover:opacity-100 h-control-h-sm w-control-h-sm flex items-center justify-center hover:bg-gray-200 rounded transition-opacity flex-shrink-0"
              title="즐겨찾기 해제"
            >
              <X className="w-3 h-3 text-gray-500" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
