import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { FileNode, BookmarkItem } from '@/types';
import { logger, PerformanceTimer } from '@/lib/utils/errorUtils';
import { fileSystemService } from '@/server/services';

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

      // 파일 트리 로드
      loadFileTree: async () => {
        // 이미 초기화됨 - 중복 방지
        if (get().isInitialized) {
          logger.debug('파일 트리 이미 로드됨, 건너뜀');
          return { success: true };
        }

        const timer = new PerformanceTimer('파일 트리 로드');
        set({ isLoading: true, error: null });

        try {
          const result = await fileSystemService.getFileTree(undefined, { includeHidden: false });

          if (result.success && result.data) {
            const fileMap = buildFileMap(result.data);
            set({
              files: result.data,
              fileMap,
              isLoading: false,
              isInitialized: true,
              error: null,
              lastUpdatedAt: new Date(),
            });
            logger.info('파일 트리 로드 성공', { fileCount: result.data.length, mapSize: fileMap.size });
            timer.end({ success: true });
            return { success: true };
          } else {
            const errorMsg = result.error || '파일 트리 로드 실패';
            set({ isLoading: false, error: typeof errorMsg === 'string' ? errorMsg : '파일 트리 로드 실패' });
            timer.end({ success: false });
            return { success: false, error: typeof errorMsg === 'string' ? errorMsg : '파일 트리 로드 실패' };
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : '파일 트리 로드 실패';
          logger.error('파일 트리 로드 중 오류', error);
          set({ isLoading: false, error: errorMsg });
          timer.end({ success: false });
          return { success: false, error: errorMsg };
        }
      },

      // 파일 트리 새로고침
      refreshFileTree: async () => {
        const timer = new PerformanceTimer('파일 트리 새로고침');
        set({ isLoading: true, error: null });

        try {
          const result = await fileSystemService.getFileTree(undefined, { includeHidden: false });

          if (result.success && result.data) {
            const fileMap = buildFileMap(result.data);
            set({
              files: result.data,
              fileMap,
              isLoading: false,
              error: null,
              lastUpdatedAt: new Date(),
            });
            logger.info('파일 트리 새로고침 성공', { fileCount: result.data.length, mapSize: fileMap.size });
            timer.end({ success: true });
          } else {
            const errorMsg = result.error || '파일 트리 새로고침 실패';
            set({ isLoading: false, error: typeof errorMsg === 'string' ? errorMsg : '파일 트리 새로고침 실패' });
            logger.error('파일 트리 새로고침 실패', { error: errorMsg });
            timer.end({ success: false });
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : '파일 트리 새로고침 실패';
          logger.error('파일 트리 새로고침 중 오류', error);
          set({ isLoading: false, error: errorMsg });
          timer.end({ success: false });
        }
      },

      // 데이터 설정
      setFiles: (files) => {
        const fileMap = buildFileMap(files);
        set({ files, fileMap, lastUpdatedAt: new Date() });
      },

      // 경로로 파일 찾기 (O(1) - PMS getMenuByCode 대응)
      getFileByPath: (path: string): FileNode | undefined => {
        return get().fileMap.get(path);
      },

      // 책갈피 추가 (PMS addFavorite 대응)
      addBookmark: (bookmark: Omit<BookmarkItem, 'addedAt'>): void => {
        const { bookmarks } = get();
        if (bookmarks.some((b) => b.id === bookmark.id)) return;

        set({
          bookmarks: [
            ...bookmarks,
            { ...bookmark, addedAt: new Date() },
          ],
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
        return get().bookmarks.some((b) => b.id === id);
      },

      // 로딩 상태 설정
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // 파일 초기화
      clearFiles: () => {
        set({
          files: [],
          fileMap: new Map(),
          isLoading: false,
          isInitialized: false,
          error: null,
          lastUpdatedAt: null,
        });
      },
    }),
    {
      name: 'dms-file-store',
      storage: createJSONStorage(() => localStorage),
      // bookmarks만 persist (files는 서버에서 로드)
      partialize: (state) => ({
        bookmarks: state.bookmarks,
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
