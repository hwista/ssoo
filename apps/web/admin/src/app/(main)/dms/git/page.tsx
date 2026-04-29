'use client';

import { useState } from 'react';
import { useDmsAdminGitStatus, useDmsAdminGitHistory } from '@/hooks/queries/useDmsAdmin';

export default function DmsGitPage() {
  const [maxCount, setMaxCount] = useState(50);
  const { data: statusResp, isLoading: statusLoading, refetch: refetchStatus, isFetching: statusFetching } =
    useDmsAdminGitStatus('origin');
  const { data: historyResp, isLoading: historyLoading, refetch: refetchHistory, isFetching: historyFetching } =
    useDmsAdminGitHistory(maxCount);

  const status = statusResp?.data;
  const history = historyResp?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">DMS Git 관측</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            저장소 바인딩 / sync 상태 / 최근 커밋 로그.
          </p>
        </div>
        <button
          onClick={() => {
            refetchStatus();
            refetchHistory();
          }}
          className="rounded-md border bg-card px-3 py-1.5 text-xs hover:bg-accent"
          disabled={statusFetching || historyFetching}
        >
          {statusFetching || historyFetching ? '갱신 중…' : '새로고침'}
        </button>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">저장소 상태</h2>
        <div className="rounded-lg border bg-card p-4">
          {statusLoading ? (
            <p className="text-sm text-muted-foreground">로딩 중…</p>
          ) : status ? (
            <div className="space-y-3">
              {status.error && (
                <p className="text-sm text-destructive">에러: {status.error}</p>
              )}
              <div className="grid gap-2 md:grid-cols-2">
                <KvBlock title="Binding" value={status.binding} />
                <KvBlock title="Sync" value={status.sync} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">상태 정보가 없습니다.</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">최근 커밋</h2>
          <label className="text-xs text-muted-foreground">
            최대&nbsp;
            <input
              type="number"
              min={1}
              max={200}
              value={maxCount}
              onChange={(e) => setMaxCount(Math.max(1, Math.min(200, Number(e.target.value) || 50)))}
              className="w-20 rounded-md border bg-background px-2 py-1 text-xs"
            />
            &nbsp;건
          </label>
        </div>
        <div className="rounded-lg border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left font-medium">SHA</th>
                <th className="px-4 py-2 text-left font-medium">날짜</th>
                <th className="px-4 py-2 text-left font-medium">작성자</th>
                <th className="px-4 py-2 text-left font-medium">메시지</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    로딩 중…
                  </td>
                </tr>
              ) : history && history.items.length > 0 ? (
                history.items.map((entry) => (
                  <tr key={entry.hash} className="border-b last:border-b-0">
                    <td className="px-4 py-2 font-mono text-xs">{entry.hashShort}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{entry.date}</td>
                    <td className="px-4 py-2 text-xs">{entry.author}</td>
                    <td className="px-4 py-2 text-xs">{entry.message}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    {history?.error ? `에러: ${history.error}` : '커밋이 없습니다.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KvBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p>
      <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs">
        {value ? JSON.stringify(value, null, 2) : '—'}
      </pre>
    </div>
  );
}
