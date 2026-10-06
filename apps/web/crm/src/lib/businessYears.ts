import type { CrmBusinessYear, CrmBusinessYearCreateInput, CrmBusinessYearUpdateInput } from '@ssoo/types/crm';
import { getSharedAccessToken } from '@ssoo/web-auth';

export const CRM_BUSINESS_YEARS_CHANGED = 'crm-business-years-changed';

async function request<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  const accessToken = getSharedAccessToken();
  const response = await fetch(`/api/crm/business-years${path}`, {
    method, cache: 'no-store', signal,
    headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json() as { success: boolean; data: T; error?: { message?: string } };
  if (!response.ok || !payload.success) throw new Error(payload.error?.message || '사업연도 요청을 처리하지 못했습니다.');
  if (method !== 'GET') window.dispatchEvent(new Event(CRM_BUSINESS_YEARS_CHANGED));
  return payload.data;
}

export const businessYearsApi = {
  list: (signal?: AbortSignal) => request<CrmBusinessYear[]>('', 'GET', undefined, signal),
  create: (input: CrmBusinessYearCreateInput) => request<CrmBusinessYear>('', 'POST', input),
  update: (id: string, input: CrmBusinessYearUpdateInput) => request<CrmBusinessYear>(`/${encodeURIComponent(id)}`, 'PUT', input),
  remove: (id: string) => request<{ id: string }>(`/${encodeURIComponent(id)}`, 'DELETE'),
};
