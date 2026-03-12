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
