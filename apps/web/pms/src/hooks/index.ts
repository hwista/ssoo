/**
 * Custom Hooks
 *
 * 애플리케이션 전체에서 사용하는 커스텀 훅
 */

// React Query 훅 (데이터 페칭)
export {
  // Projects
  projectKeys,
  useProjectList,
  useProjectDetail,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  // Menus
  menuKeys,
  useMyMenus,
  useAddFavorite,
  useRemoveFavorite,
} from './queries';

// 인증 및 권한
export { useAuth } from './useAuth';

// Tab
export { useOpenTabWithConfirm } from './useOpenTabWithConfirm';

// 추후 추가
// export { useDebounce } from './useDebounce';
// export { useLocalStorage } from './useLocalStorage';
// export { useMediaQuery } from './useMediaQuery';
