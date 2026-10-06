'use client';

import type { CrmDomainAccessSnapshot } from '@ssoo/types/crm';
import { useCallback, useEffect, useState } from 'react';

interface BackendSuccessResponse<T> {
  success: boolean;
  data: T;
}

export function useCrmDomainAccess(accessToken?: string | null, ownerOrganizationId?: string) {
  const [requestVersion, setRequestVersion] = useState(0);
  const retry = useCallback(() => setRequestVersion(version => version + 1), []);
  const [access, setAccess] = useState<CrmDomainAccessSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setAccess(null);
    setError(null);
    if (!accessToken) {
      setAccess(null);
      setError(null);
      return () => controller.abort();
    }
    fetch(`/api/crm/access${ownerOrganizationId ? `?ownerOrganizationId=${encodeURIComponent(ownerOrganizationId)}` : ''}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmDomainAccessSnapshot> | null;
        if (!response.ok || !payload?.success) throw new Error('CRM 권한을 확인할 수 없습니다.');
        if (controller.signal.aborted) return;
        setAccess(payload.data);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : 'CRM 권한을 확인할 수 없습니다.');
      });
    return () => controller.abort();
  }, [accessToken, ownerOrganizationId, requestVersion]);

  return { access, error, retry, isLoading: access === null && error === null };
}
