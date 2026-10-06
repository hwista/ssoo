'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSharedAccessToken } from '@ssoo/web-auth';

export type CrmSourceCodeGroup = 'payment_term' | 'biz_type' | 'group_type';

export interface CrmCommonCodeOption {
  value: string;
  label: string;
  active?: boolean;
}

interface CodeItemResponse {
  codeValue: string;
  displayNameKo: string;
  sortOrder: number;
  isActive: boolean;
}

interface CodeListResponse {
  success: boolean;
  data?: CodeItemResponse[];
}

const requestCache = new Map<string, Promise<CrmCommonCodeOption[]>>();

async function fetchGroup(group: CrmSourceCodeGroup, force: boolean): Promise<CrmCommonCodeOption[]> {
  const accessToken = getSharedAccessToken();
  const key = `${group}:${accessToken ?? ''}`;
  const existing = requestCache.get(key);
  if (existing && !force) return existing;
  const request = fetch(`/api/codes?codeGroup=${encodeURIComponent(group)}`, {
    cache: 'no-store',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  })
    .then(async (response) => {
      const payload = await response.json().catch(() => null) as CodeListResponse | null;
      if (!response.ok || payload?.success !== true) throw new Error('공통코드를 불러오지 못했습니다.');
      return (payload.data ?? [])
        .sort((a, b) => a.sortOrder - b.sortOrder || a.codeValue.localeCompare(b.codeValue))
        .map((item) => ({ value: item.codeValue, label: item.displayNameKo, active: item.isActive }));
    })
    .finally(() => { if (requestCache.get(key) === request) requestCache.delete(key); });
  requestCache.set(key, request);
  return request;
}

export function useCrmCommonCodeOptions(groups: CrmSourceCodeGroup[]) {
  const groupKey = groups.join(',');
  const [options, setOptions] = useState<Partial<Record<CrmSourceCodeGroup, CrmCommonCodeOption[]>>>({});
  const [allOptions, setAllOptions] = useState<Partial<Record<CrmSourceCodeGroup, CrmCommonCodeOption[]>>>({});
  const [error, setError] = useState<string | null>(null);

  const requestVersion = useRef(0);
  const reload = useCallback(async (force = true) => {
    const version = ++requestVersion.current;
    try {
      const loaded = await Promise.all(groups.map(async (group) => [group, await fetchGroup(group, force)] as const));
      if (version !== requestVersion.current) return;
      setAllOptions(Object.fromEntries(loaded));
      setOptions(Object.fromEntries(loaded.map(([group, items]) => [group, items.filter((item) => item.active)])));
      setError(null);
    } catch (nextError) {
      if (version !== requestVersion.current) return;
      setError(nextError instanceof Error ? nextError.message : '공통코드를 불러오지 못했습니다.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupKey]);

  useEffect(() => {
    void reload(false);
    const handleFocus = () => void reload();
    window.addEventListener('focus', handleFocus);
    return () => {
      requestVersion.current += 1;
      window.removeEventListener('focus', handleFocus);
    };
  }, [reload]);

  return { options, allOptions, error, reload };
}

export function withCurrentCodeOption(
  options: CrmCommonCodeOption[],
  value: string,
  fallbackLabel?: string,
): CrmCommonCodeOption[] {
  if (!value || options.some((option) => option.value === value)) return options;
  return [{ value, label: fallbackLabel ?? value }, ...options];
}
