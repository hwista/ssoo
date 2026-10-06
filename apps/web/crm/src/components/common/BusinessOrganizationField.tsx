"use client";

import { useEffect, useId, useState } from 'react';
import { NativeSelect } from '@ssoo/web-ui';
import { SsooErrorNotice } from '@ssoo/web-shell';
import { useAuthStore } from '@/stores/auth.store';

export function BusinessOrganizationFilter({ value = '' }: { value?: string }) {
  const [selection, setSelection] = useState(value);
  useEffect(() => setSelection(value), [value]);
  return <BusinessOrganizationField name="ownerOrganizationId" purpose="filter" autoSelect={false} value={selection} onChange={setSelection} />;
}

/** CRM writes select an approved organization separately from the responsible person. */
export function BusinessOrganizationField({ value, onChange, readOnly = false, autoSelect = true, name, purpose = 'record' }: {
  value: string; onChange: (value: string) => void; readOnly?: boolean; autoSelect?: boolean; name?: string; purpose?: 'record' | 'filter';
}) {
  const fieldId = useId();
  const accessToken = useAuthStore(state => state.accessToken);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setOrganizations([]);
    setError(null);
    setLoading(true);
    if (!accessToken) return () => controller.abort();
    void fetch('/api/crm/business-organizations', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const payload = await response.json();
        if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? payload?.message ?? '업무 조직을 조회할 수 없습니다.');
        if (!controller.signal.aborted) setOrganizations(payload.data);
      })
      .catch(cause => { if (!controller.signal.aborted) setError(cause); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accessToken, retry]);
  useEffect(() => {
    if (autoSelect && !readOnly && !value && organizations.length === 1) onChange(organizations[0].id);
  }, [organizations, value, readOnly, autoSelect, onChange]);
  return <div className="mb-4 min-w-0 space-y-2">
    <label htmlFor={fieldId} className="block text-sm">업무 조직</label>
      <NativeSelect id={fieldId} name={name} value={value} disabled={readOnly || loading || Boolean(error)} onChange={event => onChange(event.target.value)} required={!readOnly && purpose === 'record'}>
        <option value="">{readOnly ? '기존 자료 · 조직 미지정' : loading ? '조직 확인 중…' : '업무 조직 선택'}</option>
        {value && !organizations.some(org => org.id === value) ? <option value={value}>조직 #{value}</option> : null}
        {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
      </NativeSelect>
    <p className="text-xs text-muted-foreground">{purpose === 'filter' ? '선택한 조직을 기준으로 조회합니다. 새 계획과 보고 저장에는 업무 조직이 필요합니다.' : '담당자 변경과 관계없이 이 조직의 업무 자료로 유지됩니다.'}</p>
    {error ? <SsooErrorNotice error={error} actions={[{ label: '다시 시도', onClick: () => setRetry(count => count + 1) }]} /> : null}
    {!loading && !error && !readOnly && organizations.length === 0 ? <p className="text-sm text-muted-foreground">온보딩에서 조직 소속과 CRM 이용 승인을 먼저 받아 주세요.</p> : null}
  </div>;
}
