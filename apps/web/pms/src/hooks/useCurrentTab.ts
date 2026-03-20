'use client';

import { createContext, useContext } from 'react';
import type { TabItem } from '@/types/tab';

export const TabContext = createContext<TabItem | null>(null);

export function useCurrentTab(): TabItem | null {
  return useContext(TabContext);
}
