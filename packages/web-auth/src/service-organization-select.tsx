'use client';

import { useEffect, useId, useState } from 'react';
import type { OnboardingServiceCode } from '@ssoo/types/common';
import { NativeSelect } from '@ssoo/web-ui';
import { SsooErrorNotice } from '@ssoo/web-shell';
import { createSharedAxiosApiClient } from './axios-api-client';
import { getCommonSearchApiBaseUrl } from './search-routing';

/** The owner remains an individual; this selects the approved sharing audience. */
export function ServiceOrganizationSelect({ service, accessToken, value, onChange, disabled = false }: {
  service: OnboardingServiceCode;
  accessToken?: string | null;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setOrganizations([]); setError(null); setLoading(true);
    if (!accessToken) return () => controller.abort();
    const api = createSharedAxiosApiClient({ baseURL: getCommonSearchApiBaseUrl() });
    void api.get<{ success: boolean; data: Array<{ id: string; name: string }> }>(`/onboarding/business-organizations?service=${service}`, {
      headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal,
    }).then(result => {
      if (!result.data.success) throw new Error('공개 대상 조직을 조회할 수 없습니다.');
      if (!controller.signal.aborted) setOrganizations(result.data.data);
    })
      .catch(cause => { if (!controller.signal.aborted) setError(cause); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accessToken, service, retry]);
  return <div className="min-w-0 space-y-2">
    <label htmlFor={id} className="block text-sm">공개 대상 조직</label>
    <NativeSelect id={id} value={value} onChange={event => onChange(event.target.value)} disabled={disabled || loading || Boolean(error)}>
      <option value="">{loading ? '조직 확인 중…' : '조직 선택'}</option>
      {value && !organizations.some(org => org.id === value) ? <option value={value}>조직 #{value}</option> : null}
      {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
    </NativeSelect>
    {error ? <SsooErrorNotice error={error} actions={[{ label: '다시 시도', onClick: () => setRetry(count => count + 1) }]} /> : null}
    {!loading && !error && organizations.length === 0 ? <p className="text-sm text-muted-foreground">소속과 서비스 이용 승인을 받은 조직이 없습니다.</p> : null}
  </div>;
}
