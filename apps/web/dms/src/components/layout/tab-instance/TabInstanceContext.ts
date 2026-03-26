'use client';

import { createContext, createElement, useContext, type ReactNode } from 'react';

/**
 * Keep-Alive 탭 렌더링에서 각 서브트리에 자신의 탭 인스턴스 ID를 주입합니다.
 * activeTabId와 달리, 숨김 상태로 유지되는 탭도 자신의 tabId를 안정적으로 조회해야 합니다.
 */
const TabInstanceContext = createContext<string | null>(null);

interface TabInstanceProviderProps {
  tabId: string;
  children: ReactNode;
}

export function TabInstanceProvider({ tabId, children }: TabInstanceProviderProps) {
  return createElement(TabInstanceContext.Provider, { value: tabId }, children);
}

/**
 * 현재 렌더링 트리에 바인딩된 탭 인스턴스 ID를 반환합니다.
 *
 * @throws TabInstanceProvider 밖에서 호출 시 에러
 */
export function useTabInstanceId(): string {
  const tabId = useContext(TabInstanceContext);
  if (tabId === null) {
    throw new Error('useTabInstanceId must be used within a TabInstanceProvider');
  }
  return tabId;
}
