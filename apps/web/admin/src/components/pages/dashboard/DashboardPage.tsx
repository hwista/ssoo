'use client';

import { SsooErrorNotice, SsooWorkspacePage } from '@ssoo/web-shell';
import { useAdminStats } from '@/hooks/queries/useStats';
import { Button } from '@ssoo/web-ui';
import { ADMIN_NAV_GROUPS, getAdminTabOptions, getAdminBreadcrumb } from '@/components/layout/navigation';
import { useTabStore } from '@/stores/tab.store';
import { LaunchReadinessPanel } from './LaunchReadinessPanel';

export default function DashboardPage() {
  const openTab = useTabStore(state => state.openTab);
  const { data: statsResponse, isLoading, error, refetch } = useAdminStats();
  const stats = statsResponse?.data;

  return (
    <SsooWorkspacePage compact title="대시보드" description="시스템 관리 현황" breadcrumbItems={getAdminBreadcrumb('/')} scrollBody>
      {error && (
        <SsooErrorNotice className="p-4">
          통계를 불러오지 못했습니다.
          <Button variant="plain" size="plain" onClick={() => refetch()} className="ml-2 underline">다시 시도</Button>
        </SsooErrorNotice>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="사용자" value={isLoading ? '…' : String(stats?.activeUsers ?? '—')} description="활성 사용자" />
        <StatCard title="역할" value={isLoading ? '…' : String(stats?.roles ?? '—')} description="등록된 역할" />
        <StatCard title="조직" value={isLoading ? '…' : String(stats?.organizations ?? '—')} description="등록된 조직" />
        <StatCard title="권한" value={isLoading ? '…' : String(stats?.permissions ?? '—')} description="등록된 권한" />
      </div>

      <section aria-label="공통 관리 프로그램" className="space-y-3">
        <h2 className="text-lg font-semibold">공통 관리</h2>
        <p className="text-sm text-muted-foreground">관리할 대상을 선택하세요. 사용자·조직 상세에서도 관련 소속, 이용권과 변경 이력을 이어서 확인할 수 있습니다.</p>
        <div className="grid gap-4 md:grid-cols-2">{ADMIN_NAV_GROUPS.map(group => <section key={group.id} className="rounded-lg border bg-card p-4" aria-label={group.title}>
          <h3 className="mb-2 font-semibold">{group.title}</h3>
          <ul className="space-y-3">{group.items.map(item => <li key={item.href}>
            <Button variant="link" onClick={() => openTab(getAdminTabOptions(item.href))}>{item.label}</Button>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </li>)}</ul>
        </section>)}</div>
      </section>
      <LaunchReadinessPanel />
    </SsooWorkspacePage>
  );
}

function StatCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
