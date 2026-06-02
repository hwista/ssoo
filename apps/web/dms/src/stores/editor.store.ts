'use client';

import { useCallback, useMemo } from 'react';
import { useTabInstanceId } from '@/components/layout/tab-instance/TabInstanceContext';
import {
  createEditorTabActions,
  initialEditorTabState,
  useEditorMultiStore,
} from './editor-core.store';

/**
 * 탭별 에디터 스토어 훅
 *
 * TabInstanceProvider에서 주입된 tabId를 자동 해석하여
 * 해당 탭의 에디터 상태와 액션을 반환합니다.
 *
 * ⚠️ TabInstanceProvider 내부에서만 사용 가능
 * (ContentArea가 keep-alive 탭마다 Provider를 감싸줌)
 */
export function useEditorStore() {
  const tabId = useTabInstanceId();

  const tabState = useEditorMultiStore(
    useCallback((state) => state.editors[tabId] ?? initialEditorTabState, [tabId])
  );

  const actions = useMemo(() => createEditorTabActions(tabId), [tabId]);

  return { ...tabState, ...actions };
}

/**
 * 활성 탭의 에디터 파일 경로 (Sidebar 등 탭 컨텍스트 외부용)
 *
 * @param activeTabId - 탭 스토어의 activeTabId를 직접 전달
 */
export function useActiveEditorFilePath(activeTabId: string | null): string | null {
  return useEditorMultiStore(
    useCallback(
      (state) => (activeTabId ? (state.editors[activeTabId]?.currentFilePath ?? null) : null),
      [activeTabId]
    )
  );
}

/**
 * 열린 문서 탭들의 파일 경로.
 *
 * 협업 WebSocket 구독은 활성 탭만 보면 inactive keep-alive 탭의 lock 상태가
 * stale 해질 수 있으므로, 현재 열린 문서 경로 전체를 구독 대상으로 제공한다.
 */
export function useOpenEditorFilePaths(): string[] {
  const editors = useEditorMultiStore((state) => state.editors);

  return useMemo(() => {
    const paths = new Set<string>();
    for (const editor of Object.values(editors)) {
      if (editor.contentType !== 'document') {
        continue;
      }
      const path = editor.currentFilePath?.trim();
      if (path) {
        paths.add(path);
      }
    }
    return Array.from(paths).sort();
  }, [editors]);
}
