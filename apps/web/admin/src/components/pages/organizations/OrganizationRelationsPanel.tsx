'use client';

import { Button } from '@ssoo/web-ui';
import { SsooErrorNotice } from '@ssoo/web-shell';
import { useOrganizationImpact } from '@/hooks/queries/useOrganizations';
import { useTabStore } from '@/stores/tab.store';
import { getAdminTabOptions } from '@/components/layout/navigation';
import { programPath } from '../access/program-context';
import { OperationHistoryButton } from '../access/OperationHistoryButton';

export function OrganizationRelationsPanel({ organizationId, onNavigate }: { organizationId: string; onNavigate: () => void }) {
  const impact = useOrganizationImpact(organizationId);
  const openTab = useTabStore(state => state.openTab);
  const navigate = (path: string) => { if (openTab(getAdminTabOptions(programPath(path, { organizationId })))) onNavigate(); };
  return <div className="min-w-0 space-y-4">
    <section className="space-y-3 rounded-lg border p-3" aria-label="조직 변경 영향">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">연결 정보·중지 영향</h2><Button variant="outline" size="sm" onClick={() => impact.refetch()}>연결 정보 새로고침</Button></div>
      {impact.isError ? <SsooErrorNotice error={impact.error} /> : !impact.data ? <p role="status">연결 정보를 확인하는 중...</p> : <>
        <p className="text-sm">활성 하위 조직 {impact.data.children.length}개 · 종료 전 소속 {impact.data.memberships}건 · 미회수 이용권 {impact.data.grants}건 · 미회수 위임 {impact.data.authorities}건 · 활성 권한 관계 {impact.data.permissions}건 · 대기 신청 {impact.data.requests}건</p>
        {impact.data.children.length > 0 && <p className="text-sm">하위 조직: {impact.data.children.map(child => child.name).join(', ')}</p>}
        <p className="text-sm text-muted-foreground">{impact.data.canDeactivate ? '하위 조직·소속 정리가 완료되어 중지할 수 있습니다.' : '활성 하위 조직과 종료 전 소속을 먼저 정리해야 중지할 수 있습니다.'} 조직 중지 시 남은 이용권·승인 위임·조직 권한은 함께 회수됩니다. 재활성화 시 자동 복원되지 않습니다. 대기 신청은 승인 처리함에서 검토하세요.</p>
      </>}
      <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => navigate('/approval-authorities')}>승인 위임 관리</Button><Button variant="outline" size="sm" onClick={() => { if (openTab(getAdminTabOptions('/approvals'))) onNavigate(); }}>전체 담당 범위 신청 확인</Button><OperationHistoryButton filter={{ organizationId }} onNavigate={onNavigate} /></div>
    </section>
    <div className="space-y-3" aria-label="조직 관련 프로그램">
      <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => navigate('/memberships')}>조직 소속 관리</Button><Button variant="outline" onClick={() => navigate('/service-grants')}>조직 이용권 관리</Button><Button variant="outline" onClick={() => navigate('/organization-permissions')}>조직 공통 권한</Button></div>
    </div>
  </div>;
}
