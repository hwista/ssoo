'use client';

import { useMemo } from 'react';
import type { PmsAccessSnapshot } from '@ssoo/types/pms';
import { useAccessStore } from '@/stores/access.store';
import { useMenuStore } from '@/stores/menu.store';

interface UsePmsAccessResult {
  snapshot: PmsAccessSnapshot;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  lastUpdatedAt: Date | null;
}

export function usePmsAccess(): UsePmsAccessResult {
  const generalMenus = useMenuStore((state) => state.generalMenus);
  const adminMenus = useMenuStore((state) => state.adminMenus);
  const favorites = useMenuStore((state) => state.favorites);
  const isLoading = useAccessStore((state) => state.isLoading);
  const hasLoaded = useAccessStore((state) => state.hasLoaded);
  const error = useAccessStore((state) => state.error);
  const lastUpdatedAt = useMenuStore((state) => state.lastUpdatedAt);

  const snapshot = useMemo<PmsAccessSnapshot>(
    () => ({
      // PMS keeps the live navigation-centric snapshot in menu.store because
      // favorite mutations happen from the shell after the initial access hydrate.
      generalMenus,
      adminMenus,
      favorites,
    }),
    [adminMenus, favorites, generalMenus],
  );

  return {
    snapshot,
    isLoading,
    hasLoaded,
    error,
    lastUpdatedAt,
  };
}
