'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CrmBusinessYear } from '@ssoo/types/crm';
import { businessYearsApi, CRM_BUSINESS_YEARS_CHANGED } from './businessYears';

export function useCrmBusinessYears() {
  const [years, setYears] = useState<CrmBusinessYear[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setIsLoading(true);
    try {
      const nextYears = await businessYearsApi.list(controller.signal);
      if (controller.signal.aborted) return;
      setYears(nextYears);
      setHasLoaded(true);
      setError(null);
    } catch (cause: unknown) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '사업연도를 불러오지 못했습니다.');
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
    const refresh = () => { void reload(); };
    window.addEventListener('focus', refresh);
    window.addEventListener(CRM_BUSINESS_YEARS_CHANGED, refresh);
    return () => {
      activeRequest.current?.abort();
      window.removeEventListener('focus', refresh);
      window.removeEventListener(CRM_BUSINESS_YEARS_CHANGED, refresh);
    };
  }, [reload]);
  return { years, error, isLoading, hasLoaded, reload };
}

export function useCrmBusinessYearOptions(currentYear: number, fallbackYears: number[]) {
  const query = useCrmBusinessYears();
  const configuredYears = query.years.filter((item) => item.isActive).map((item) => item.year);
  const source = query.hasLoaded ? configuredYears : fallbackYears;
  return { years: [...new Set([currentYear, ...source])].sort((a, b) => a - b), error: query.error, reload: query.reload };
}
