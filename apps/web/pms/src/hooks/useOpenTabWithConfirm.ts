import { useCallback } from 'react';
import { useTabStore, useConfirmStore } from '@/stores';
import type { OpenTabOptions } from '@/types';

/**
 * 탭 초과 시 확인 다이얼로그를 표시하는 openTab 훅
 *
 * 사용법:
 * const openTabWithConfirm = useOpenTabWithConfirm();
 * openTabWithConfirm({ menuCode: 'PRJ001', ... });
 */
export function useOpenTabWithConfirm() {
  const { openTab, closeOldestTab, maxTabs } = useTabStore();
  const { confirm } = useConfirmStore();

  return useCallback(
    async (options: OpenTabOptions): Promise<string> => {
      const result = openTab(options);

      // 탭 초과 시 빈 문자열 반환됨
      if (result === '') {
        const confirmed = await confirm({
          title: '탭 개수 초과',
          description: `최대 ${maxTabs}개의 탭만 열 수 있습니다.\n가장 오래된 탭을 닫고 새 탭을 열까요?`,
          confirmText: '열기',
          cancelText: '취소',
        });

        if (confirmed) {
          closeOldestTab();
          return openTab(options);
        }
        return '';
      }

      return result;
    },
    [openTab, closeOldestTab, confirm, maxTabs]
  );
}
