'use client';

import Link from 'next/link';
import { useDmsAdminOverview } from '@/hooks/queries/useDmsAdmin';

export default function DmsAdminPage() {
  const { data: response, isLoading, error, refetch } = useDmsAdminOverview();
  const overview = response?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">DMS 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">문서 관리 시스템 운영 개요</p>
        </div>
        <div className="flex items-center gap-3">
          {overview?.generatedAt && (
            <p className="text-xs text-muted-foreground">
              업데이트: {new Date(overview.generatedAt).toLocaleString('ko-KR')}
            </p>
          )}
          <Link
            href="/dms/documents"
            className="rounded-md border bg-card px-3 py-1.5 text-xs hover:bg-accent"
          >
            문서 관리 →
          </Link>
          <Link
            href="/dms/templates"
            className="rounded-md border bg-card px-3 py-1.5 text-xs hover:bg-accent"
          >
            템플릿 관리 →
          </Link>
          <Link
            href="/dms/git"
            className="rounded-md border bg-card px-3 py-1.5 text-xs hover:bg-accent"
          >
            Git 관측 →
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          DMS 개요를 불러오지 못했습니다.
          <button onClick={() => refetch()} className="ml-2 underline">다시 시도</button>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">문서</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="활성 문서"
            value={isLoading ? '…' : String(overview?.documents.active ?? '—')}
            description={`총 ${overview?.documents.total ?? '—'}건`}
          />
          <StatCard
            title="최근 7일 갱신"
            value={isLoading ? '…' : String(overview?.documents.recentlyUpdated ?? '—')}
            description="updated_at 기준"
          />
          <StatCard
            title="조직 공개"
            value={isLoading ? '…' : String(overview?.documents.byVisibility.organization ?? '—')}
            description="visibility = organization"
          />
          <StatCard
            title="전체 공개"
            value={isLoading ? '…' : String(overview?.documents.byVisibility.public ?? '—')}
            description="visibility = public"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">템플릿 · 권한</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="활성 템플릿"
            value={isLoading ? '…' : String(overview?.templates.active ?? '—')}
            description={`총 ${overview?.templates.total ?? '—'}건`}
          />
          <StatCard
            title="활성 권한 부여"
            value={isLoading ? '…' : String(overview?.grants.activeGrants ?? '—')}
            description="dm_document_grant_r"
          />
          <StatCard
            title="대기 중 요청"
            value={isLoading ? '…' : String(overview?.grants.pendingRequests ?? '—')}
            description="status = pending"
          />
          <StatCard
            title="비공개 (self)"
            value={isLoading ? '…' : String(overview?.documents.byVisibility.self ?? '—')}
            description="visibility = self"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Sync 상태 분포</h2>
        <div className="rounded-lg border bg-card p-4 text-sm">
          {isLoading ? (
            <span className="text-muted-foreground">로딩 중…</span>
          ) : overview && Object.keys(overview.documents.bySyncStatus).length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {Object.entries(overview.documents.bySyncStatus).map(([code, count]) => (
                <div key={code} className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                  <span className="font-mono text-xs text-muted-foreground">{code}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">집계할 문서가 없습니다.</span>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">문서 보유 상위 사용자</h2>
        <div className="rounded-lg border bg-card">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">로딩 중…</p>
          ) : overview && overview.topOwners.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">사용자</th>
                  <th className="px-4 py-2 text-right font-medium">문서 수</th>
                </tr>
              </thead>
              <tbody>
                {overview.topOwners.map((row) => (
                  <tr key={row.ownerUserId} className="border-b last:border-b-0">
                    <td className="px-4 py-2">
                      {row.loginId ?? <span className="text-muted-foreground">user#{row.ownerUserId}</span>}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold">{row.documentCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">집계할 데이터가 없습니다.</p>
          )}
        </div>
      </section>
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
