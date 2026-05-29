import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FileNode, BookmarkItem } from '@/types';
import { filesApi } from '@/lib/api/endpoints/files';
import { logger, PerformanceTimer } from '@/lib/utils/errorUtils';
import { getFileNodeDisplayTitle } from '@/lib/utils/fileTree';
import { resolveDocPath } from '@/lib/utils/linkUtils';
import {
  getCurrentUserScopeId,
  isUserScopeTransition,
  registerUserScopedReset,
  shouldResetPersistedUserState,
} from '@/lib/user-scope';

// 파일 트리를 플랫 맵으로 변환 (PMS buildMenuMap 대응)
const buildFileMap = (nodes: FileNode[]): Map<string, FileNode> => {
  const map = new Map<string, FileNode>();

  const traverse = (items: FileNode[]) => {
    for (const item of items) {
      map.set(item.path, item);
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    }
  };

  traverse(nodes);
  return map;
};

const resolveBookmarkTitle = (
  bookmark: Pick<BookmarkItem, 'path' | 'title'>,
  fileMap: Map<string, FileNode>,
): string => {
  const documentPath = resolveDocPath(bookmark.path);
  if (!documentPath) {
    return bookmark.title;
  }

  const node = fileMap.get(documentPath);
  if (!node) {
    return bookmark.title;
  }

  return getFileNodeDisplayTitle(node);
};

const reconcileBookmarksWithFileMap = (
  bookmarks: BookmarkItem[],
  fileMap: Map<string, FileNode>,
): BookmarkItem[] => {
  let changed = false;
  const nextBookmarks = bookmarks.map((bookmark) => {
    const title = resolveBookmarkTitle(bookmark, fileMap);
    if (title === bookmark.title) {
      return bookmark;
    }

    changed = true;
    return {
      ...bookmark,
      title,
    };
  });

  return changed ? nextBookmarks : bookmarks;
};

interface FileStoreState {
  // 데이터
  files: FileNode[];
  // 플랫 맵 (빠른 조회용 - PMS menuMap 대응)
  fileMap: Map<string, FileNode>;
  // 책갈피 (PMS favorites 대응)
  bookmarks: BookmarkItem[];
  // 로딩 상태
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  // 마지막 갱신 시각
  lastUpdatedAt: Date | null;
  /**
   * 현재 files/fileMap 이 어느 사용자 응답인지 추적. 계정 전환 전 요청이 늦게
   * 완료되어도 새 사용자 화면에 이전 트리가 재주입되지 않도록 확인한다.
   */
  filesOwnerUserId: string | null;
  /**
   * 현 bookmarks 가 어느 사용자 소속인지 추적. user 변경 시 cross-user 잔존 방지.
   */
  ownerUserId: string | null;
}

interface FileStoreActions {
  // 파일 트리 로드
  loadFileTree: () => Promise<{ success: boolean; error?: string }>;
  refreshFileTree: () => Promise<void>;
  // 데이터 설정
  setFiles: (files: FileNode[]) => void;
  // 유틸리티
  getFileByPath: (path: string) => FileNode | undefined;
  // 책갈피 관련 (PMS menu.store 패턴)
  addBookmark: (bookmark: Omit<BookmarkItem, 'addedAt'>) => void;
  removeBookmark: (bookmarkId: string) => void;
  isBookmarked: (id: string) => boolean;
  // 로딩 상태
  setLoading: (loading: boolean) => void;
  // 초기화
  clearFiles: () => void;
}

interface FileStore extends FileStoreState, FileStoreActions {}

let fileTreeRequestSeq = 0;

interface FileTreeRequestScope {
  seq: number;
  userId: string;
}

function beginFileTreeRequest(userId: string): FileTreeRequestScope {
  fileTreeRequestSeq += 1;
  return {
    seq: fileTreeRequestSeq,
    userId,
  };
}

function invalidateFileTreeRequests(): void {
  fileTreeRequestSeq += 1;
}

function isCurrentFileTreeRequest(scope: FileTreeRequestScope): boolean {
  return scope.seq === fileTreeRequestSeq && scope.userId === getCurrentUserScopeId();
}

function toFileNodes(data: unknown): FileNode[] {
  return Array.isArray(data) ? data as FileNode[] : [];
}

export const useFileStore = create<FileStore>()(
  persist(
    (set, get) => ({
      // Initial State
      files: [],
      fileMap: new Map(),
      bookmarks: [],
      isLoading: false,
      isInitialized: false,
      error: null,
      lastUpdatedAt: null,
      filesOwnerUserId: null,
      ownerUserId: null,

      // 파일 트리 로드
      loadFileTree: async () => {
        const currentUserId = getCurrentUserScopeId();
        if (!currentUserId) {
          set({ isLoading: false, error: '인증 사용자 정보가 없어 파일 트리를 불러올 수 없습니다.' });
          return { success: false, error: '인증 사용자 정보가 없어 파일 트리를 불러올 수 없습니다.' };
        }

        // 이미 초기화됨 - 중복 방지
        if (get().isInitialized && get().filesOwnerUserId === currentUserId) {
          logger.debug('파일 트리 이미 로드됨, 건너뜀');
          return { success: true };
        }

        const requestScope = beginFileTreeRequest(currentUserId);
        const timer = new PerformanceTimer('파일 트리 로드');
        set({ isLoading: true, error: null });

        try {
          const result = await filesApi.getFileTree();
          const nextFiles = toFileNodes(result.data);

          if (result.success) {
            if (!isCurrentFileTreeRequest(requestScope)) {
              timer.end({ success: false, discarded: true });
              return { success: false, error: '사용자 전환으로 파일 트리 응답을 폐기했습니다.' };
            }
            const fileMap = buildFileMap(nextFiles);
            const { bookmarks, ownerUserId } = get();
            const nextBookmarks = ownerUserId === requestScope.userId
              ? reconcileBookmarksWithFileMap(bookmarks, fileMap)
              : bookmarks;
            set({
              files: nextFiles,
              fileMap,
              bookmarks: nextBookmarks,
              isLoading: false,
              isInitialized: true,
              error: null,
              lastUpdatedAt: new Date(),
              filesOwnerUserId: requestScope.userId,
            });
            logger.info('파일 트리 로드 성공', { fileCount: nextFiles.length, mapSize: fileMap.size });
            timer.end({ success: true });
            return { success: true };
          } else {
            if (!isCurrentFileTreeRequest(requestScope)) {
              timer.end({ success: false, discarded: true });
              return { success: false, error: '사용자 전환으로 파일 트리 응답을 폐기했습니다.' };
            }
            const errorMsg = result.error || '파일 트리 로드 실패';
            set({ isLoading: false, error: typeof errorMsg === 'string' ? errorMsg : '파일 트리 로드 실패' });
            timer.end({ success: false });
            return { success: false, error: typeof errorMsg === 'string' ? errorMsg : '파일 트리 로드 실패' };
          }
        } catch (error) {
          if (!isCurrentFileTreeRequest(requestScope)) {
            timer.end({ success: false, discarded: true });
            return { success: false, error: '사용자 전환으로 파일 트리 응답을 폐기했습니다.' };
          }
          const errorMsg = error instanceof Error ? error.message : '파일 트리 로드 실패';
          logger.error('파일 트리 로드 중 오류', error);
          set({ isLoading: false, error: errorMsg });
          timer.end({ success: false });
          return { success: false, error: errorMsg };
        }
      },

      // 파일 트리 새로고침
      refreshFileTree: async () => {
        const currentUserId = getCurrentUserScopeId();
        if (!currentUserId) {
          set({ isLoading: false, error: '인증 사용자 정보가 없어 파일 트리를 새로고침할 수 없습니다.' });
          return;
        }

        const requestScope = beginFileTreeRequest(currentUserId);
        const timer = new PerformanceTimer('파일 트리 새로고침');
        set({ isLoading: true, error: null });

        try {
          const result = await filesApi.getFileTree();
          const nextFiles = toFileNodes(result.data);

          if (result.success) {
            if (!isCurrentFileTreeRequest(requestScope)) {
              timer.end({ success: false, discarded: true });
              return;
            }
            const fileMap = buildFileMap(nextFiles);
            const { bookmarks, ownerUserId } = get();
            const nextBookmarks = ownerUserId === requestScope.userId
              ? reconcileBookmarksWithFileMap(bookmarks, fileMap)
              : bookmarks;
            set({
              files: nextFiles,
              fileMap,
              bookmarks: nextBookmarks,
              isLoading: false,
              isInitialized: true,
              error: null,
              lastUpdatedAt: new Date(),
              filesOwnerUserId: requestScope.userId,
            });
            logger.info('파일 트리 새로고침 성공', { fileCount: nextFiles.length, mapSize: fileMap.size });
            timer.end({ success: true });
          } else {
            if (!isCurrentFileTreeRequest(requestScope)) {
              timer.end({ success: false, discarded: true });
              return;
            }
            const errorMsg = result.error || '파일 트리 새로고침 실패';
            set({ isLoading: false, error: typeof errorMsg === 'string' ? errorMsg : '파일 트리 새로고침 실패' });
            logger.error('파일 트리 새로고침 실패', { error: errorMsg });
            timer.end({ success: false });
          }
        } catch (error) {
          if (!isCurrentFileTreeRequest(requestScope)) {
            timer.end({ success: false, discarded: true });
            return;
          }
          const errorMsg = error instanceof Error ? error.message : '파일 트리 새로고침 실패';
          logger.error('파일 트리 새로고침 중 오류', error);
          set({ isLoading: false, error: errorMsg });
          timer.end({ success: false });
        }
      },

      // 데이터 설정
      setFiles: (files) => {
        const currentUserId = getCurrentUserScopeId();
        const fileMap = buildFileMap(files);
        const { bookmarks, ownerUserId } = get();
        const nextBookmarks = ownerUserId === currentUserId
          ? reconcileBookmarksWithFileMap(bookmarks, fileMap)
          : bookmarks;
        set({
          files,
          fileMap,
          bookmarks: nextBookmarks,
          lastUpdatedAt: new Date(),
          filesOwnerUserId: currentUserId,
        });
      },

      // 경로로 파일 찾기 (O(1) - PMS getMenuByCode 대응)
      getFileByPath: (path: string): FileNode | undefined => {
        const state = get();
        if (state.filesOwnerUserId !== getCurrentUserScopeId()) {
          return undefined;
        }
        return state.fileMap.get(path);
      },

      // 책갈피 추가 (PMS addFavorite 대응)
      addBookmark: (bookmark: Omit<BookmarkItem, 'addedAt'>): void => {
        const currentUserId = getCurrentUserScopeId();
        if (!currentUserId) {
          logger.warn('책갈피 추가 건너뜀: 인증 사용자 정보 없음');
          return;
        }
        const { bookmarks, ownerUserId } = get();
        const scopedBookmarks = ownerUserId === currentUserId ? bookmarks : [];
        if (scopedBookmarks.some((b) => b.id === bookmark.id)) return;
        const resolvedTitle = get().filesOwnerUserId === currentUserId
          ? resolveBookmarkTitle(bookmark, get().fileMap)
          : bookmark.title;

        set({
          bookmarks: [
            ...scopedBookmarks,
            { ...bookmark, title: resolvedTitle, addedAt: new Date() },
          ],
          ownerUserId: currentUserId,
        });
      },

      // 책갈피 삭제 (PMS removeFavorite 대응)
      removeBookmark: (bookmarkId: string): void => {
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.id !== bookmarkId),
        }));
      },

      // 책갈피 여부 확인 (PMS isFavorite 대응)
      isBookmarked: (id: string): boolean => {
        const state = get();
        if (state.ownerUserId !== getCurrentUserScopeId()) {
          return false;
        }
        return state.bookmarks.some((b) => b.id === id);
      },

      // 로딩 상태 설정
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // 파일 초기화
      clearFiles: () => {
        invalidateFileTreeRequests();
        set({
          files: [],
          fileMap: new Map(),
          isLoading: false,
          isInitialized: false,
          error: null,
          lastUpdatedAt: null,
          filesOwnerUserId: null,
        });
      },
    }),
    {
      name: 'dms-file-store',
      storage: createJSONStorage(() => localStorage),
      // bookmarks 와 ownerUserId 만 persist (files 는 서버에서 로드, owner 추적은
      // cross-session 도 보존되어야 새 사용자 로그인 시 invalidation 가능)
      partialize: (state) => ({
        bookmarks: state.bookmarks,
        ownerUserId: state.ownerUserId,
      }),
      // Date 역직렬화
      onRehydrateStorage: () => (state) => {
        if (state?.bookmarks) {
          state.bookmarks = state.bookmarks.map((bookmark) => ({
            ...bookmark,
            addedAt: new Date(bookmark.addedAt),
          }));
        }
      },
    }
  )
);

// 사용자 변경 시 자체 invalidation: bookmarks 비우고 owner 갱신.
// logout 시점 (next === null) 에는 ownerUserId 를 보존해 다음 login 시 비교가 가능하도록.
registerUserScopedReset((next, prev) => {
  const state = useFileStore.getState();
  if (isUserScopeTransition(next, prev)) {
    state.clearFiles();
  }

  if (next === null) return;
  if (shouldResetPersistedUserState(next, state.ownerUserId, state.bookmarks.length > 0)) {
    useFileStore.setState({ bookmarks: [], ownerUserId: next });
  } else if (state.ownerUserId !== next) {
    useFileStore.setState({ ownerUserId: next });
  }
});
