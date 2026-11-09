'use client';

import { useId, useState } from 'react';
import { NativeSelect } from '@ssoo/web-ui';
import { SsooErrorNotice, SsooSearchInput } from '@ssoo/web-shell';
import { useUserList } from '@/hooks/queries/useUsers';
import { useOrganizationList } from '@/hooks/queries/useOrganizations';

export function ParticipationTargets({ userId, organizationId, onUser, onOrganization, lockUser = false, lockOrganization = false, disabled = false }: {
  userId: string; organizationId: string; onUser: (value: string) => void; onOrganization: (value: string) => void;
  lockUser?: boolean; lockOrganization?: boolean; disabled?: boolean;
}) {
  const users = useUserList({ page: 1, limit: 100 }, true);
  const organizations = useOrganizationList(true);
  const [userSearch, setUserSearch] = useState('');
  const [organizationSearch, setOrganizationSearch] = useState('');
  const id = useId();
  const visibleUsers = users.data?.data.filter(user => user.id === userId || `${user.userName} ${user.loginId} ${user.email ?? ''}`.toLowerCase().includes(userSearch.trim().toLowerCase())) ?? [];
  const visibleOrganizations = organizations.data?.data?.filter(org => org.orgClass === 'permanent' && (org.orgId === organizationId || `${org.orgName} ${org.orgCode} ${org.parent?.orgName ?? ''}`.toLowerCase().includes(organizationSearch.trim().toLowerCase()))) ?? [];
  return <div className="grid gap-3 sm:grid-cols-2">
    <div className="space-y-2 text-sm">
      <label htmlFor={`${id}-user`}>사용자</label>
      {!lockUser && <SsooSearchInput id={`${id}-user-search`} name="participation-target-person-query" ariaLabel="배치 대상 사용자 찾기" intent="entity-lookup" value={userSearch} onChange={event => setUserSearch(event.target.value)} placeholder="이름·로그인 ID·이메일" disabled={disabled} />}
      <NativeSelect id={`${id}-user`} required value={userId} disabled={disabled || lockUser || users.isFetching || users.isError} onChange={event => onUser(event.target.value)}>
        <option value="">사용자 선택</option>{userId && !visibleUsers.some(user => user.id === userId) ? <option value={userId}>선택한 사용자 #{userId}</option> : null}
        {visibleUsers.map(user => <option key={user.id} value={user.id} disabled={!user.isActive}>{user.userName} · {user.loginId}{!user.isActive ? ' (중지)' : ''}</option>)}
      </NativeSelect>
      {!lockUser && <p className="text-xs text-muted-foreground">{visibleUsers.length}명 표시</p>}
    </div>
    <div className="space-y-2 text-sm">
      <label htmlFor={`${id}-organization`}>조직</label>
      {!lockOrganization && <SsooSearchInput id={`${id}-organization-search`} name="participation-target-organization-query" ariaLabel="배치 대상 조직 찾기" intent="entity-lookup" value={organizationSearch} onChange={event => setOrganizationSearch(event.target.value)} placeholder="조직명·코드·상위 조직" disabled={disabled} />}
      <NativeSelect id={`${id}-organization`} required value={organizationId} disabled={disabled || lockOrganization || organizations.isFetching || organizations.isError} onChange={event => onOrganization(event.target.value)}>
        <option value="">조직 선택</option>{organizationId && !visibleOrganizations.some(org => org.orgId === organizationId) ? <option value={organizationId}>선택한 조직 #{organizationId}</option> : null}
        {visibleOrganizations.map(org => <option key={org.orgId} value={org.orgId} disabled={!org.isActive}>{org.parent ? `${org.parent.orgName} › ` : ''}{org.orgName} · {org.orgCode}{!org.isActive ? ' (중지)' : ''}</option>)}
      </NativeSelect>
      {!lockOrganization && <p className="text-xs text-muted-foreground">{visibleOrganizations.length}개 표시</p>}
    </div>
    {users.isError || organizations.isError ? <SsooErrorNotice message="사용자 또는 조직 목록을 불러오지 못했습니다." actions={[{ label: '다시 시도', intent: 'retry', onClick: () => Promise.all([users.refetch(), organizations.refetch()]) }]} /> : null}
  </div>;
}

export function toLocalInput(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export function toIsoInput(value: string) { return value ? new Date(value).toISOString() : null; }
