'use client';

import { Button } from '@ssoo/web-ui';
import { SsooErrorNotice } from '@ssoo/web-shell';
import { useUserList } from '@/hooks/queries/useUsers';
import { useOrganizationList } from '@/hooks/queries/useOrganizations';
import { useTabStore } from '@/stores/tab.store';
import { getAdminTabOptions } from '@/components/layout/navigation';
import type { ProgramContextValue } from './program-context';

export function ProgramContext({ context, basePath }: { context: ProgramContextValue; basePath: string }) {
  const users = useUserList({ page: 1, limit: 100 }, true);
  const organizations = useOrganizationList(true);
  const openTab = useTabStore(state => state.openTab);
  const user = users.data?.data.find(item => item.id === context.userId);
  const organization = organizations.data?.data?.find(item => item.orgId === context.organizationId);
  return <div className="space-y-2" aria-label="현재 관리 대상">
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
      <span className="font-medium">조회 대상</span>
      {context.userId && <span>사용자: {user ? `${user.userName} · ${user.loginId}` : `#${context.userId}`}</span>}
      {context.organizationId && <span>조직: {organization ? `${organization.orgName} · ${organization.orgCode}` : `#${context.organizationId}`}</span>}
      {context.serviceCode && <span>앱: {context.serviceCode.toUpperCase()}</span>}
      <Button variant="outline" size="sm" onClick={() => openTab(getAdminTabOptions(basePath))}>대상 조건 해제</Button>
    </div>
    {(context.userId && users.isError) || (context.organizationId && organizations.isError) ? <SsooErrorNotice message="대상 이름을 불러오지 못했습니다. 식별자 조건은 유지됩니다." actions={[{ label: '대상 다시 조회', onClick: () => Promise.all([users.refetch(), organizations.refetch()]) }]} /> : null}
  </div>;
}
