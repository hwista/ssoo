'use client';

import { useAdminStats } from '@/hooks/queries/useStats';

export default function DashboardPage() {
  const { data: statsResponse, isLoading, error, refetch } = useAdminStats();
  const stats = statsResponse?.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">대시보드</h1>
        <p className="mt-1 text-sm text-muted-foreground">시스템 관리 현황</p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          통계를 불러오지 못했습니다.
          <button onClick={() => refetch()} className="ml-2 underline">다시 시도</button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="사용자" value={isLoading ? '…' : String(stats?.activeUsers ?? '—')} description="활성 사용자" />
        <StatCard title="역할" value={isLoading ? '…' : String(stats?.roles ?? '—')} description="등록된 역할" />
        <StatCard title="조직" value={isLoading ? '…' : String(stats?.organizations ?? '—')} description="등록된 조직" />
        <StatCard title="권한" value={isLoading ? '…' : String(stats?.permissions ?? '—')} description="등록된 권한" />
      </div>
    </div>
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
