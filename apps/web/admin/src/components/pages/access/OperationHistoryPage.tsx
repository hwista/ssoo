'use client';
import { useEffect, useState } from 'react';
import { SsooWorkspacePage } from '@ssoo/web-shell';
import { getAdminBreadcrumb } from '@/components/layout/navigation';
import type { CommonOperationHistoryFilter } from '@ssoo/types/common';
import { OperationHistoryPanel } from './OperationHistoryButton';
import { AuditTab } from '../roles/AccessManagementPage';
export function OperationHistoryPage({ path = '' }: { path?: string }) {
  const params = new URLSearchParams(path.split('?')[1]);
  const initialFilter: CommonOperationHistoryFilter = {};
  for (const key of ['category', 'subjectId', 'userId', 'organizationId', 'roleId'] as const) { const value = params.get(key); if (value) initialFilter[key] = value; }
  const requestedEvents = new URLSearchParams(path.split('?')[1]).get('view') === 'events';
  const [events, setEvents] = useState(requestedEvents);
  useEffect(() => { setEvents(requestedEvents); }, [requestedEvents]);
  const actions = [
    { label: '변경 이력 조회', variant: events ? 'outline' as const : 'default' as const, onClick: () => setEvents(false) },
    { label: '최근 감사 이벤트', variant: events ? 'default' as const : 'outline' as const, onClick: () => setEvents(true) },
  ];
  if (!events) return <OperationHistoryPanel key={path} initialFilter={initialFilter} onNavigate={() => {}} standalone viewActions={actions} />;
  return <SsooWorkspacePage compact title="공통 변경 이력" description="최근 감사 이벤트를 확인합니다. 변경 이력 조회에서는 기간·대상·처리자별 전후 값을 비교할 수 있습니다."
    breadcrumbItems={getAdminBreadcrumb('/operation-history')} scrollBody headerActions={{ extraActions: actions }}>
    <AuditTab />
  </SsooWorkspacePage>;
}
