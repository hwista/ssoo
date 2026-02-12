'use client';

import { createContext, useContext } from 'react';

/**
 * 탭 인스턴스 컨텍스트
 * 
 * Keep-Alive MDI에서 각 탭 컴포넌트가 "자신의 탭 ID"를 알 수 있도록 제공.
 * - ContentArea가 모든 탭을 동시에 마운트하므로,
 *   각 페이지 컴포넌트는 activeTabId가 아닌 자신의 tabId로 데이터를 조회해야 함.
 */
const TabInstanceContext = createContext<string | null>(null);

/**
 * 현재 탭 인스턴스의 ID를 반환하는 훅
 * 
 * @throws TabInstanceContext.Provider 밖에서 호출 시 에러
 */
export function useCurrentTabId(): string {
  const tabId = useContext(TabInstanceContext);
  if (tabId === null) {
    throw new Error('useCurrentTabId must be used within a TabInstanceProvider');
  }
  return tabId;
}

export { TabInstanceContext };
