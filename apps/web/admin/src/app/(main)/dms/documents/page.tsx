'use client';

import { useState } from 'react';
import { useDmsAdminDocuments } from '@/hooks/queries/useDmsAdmin';

const VISIBILITY_OPTIONS = [
  { value: '', label: '전체 가시성' },
  { value: 'self', label: 'self' },
  { value: 'organization', label: 'organization' },
  { value: 'public', label: 'public' },
];

const ACTIVE_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'true', label: '활성' },
  { value: 'false', label: '비활성' },
];

export default function DmsDocumentsPage() {
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const [visibilityScope, setVisibilityScope] = useState('');
  const [syncStatusCode, setSyncStatusCode] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const params = {
    q: q || undefined,
    visibilityScope: visibilityScope || undefined,
    syncStatusCode: syncStatusCode || undefined,
    isActive: activeFilter === '' ? undefined : activeFilter === 'true',
    page,
    limit,
  };

  const { data: response, isLoading, error, refetch, isFetching } = useDmsAdminDocuments(params);
  const result = response?.data;
  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">DMS 문서 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            관리자용 문서 목록. 경로 검색, 가시성 / sync 상태 / 활성 여부 필터를 지원합니다.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="rounded-md border bg-card px-3 py-1.5 text-xs hover:bg-accent"
          disabled={isFetching}
        >
          {isFetching ? '갱신 중…' : '새로고침'}
        </button>
      </div>

      <form
        className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQ(qInput.trim());
        }}
      >
        <input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="경로 검색 (relativePath)"
          className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
        />
        <select
          value={visibilityScope}
          onChange={(e) => {
            setPage(1);
            setVisibilityScope(e.target.value);
          }}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          {VISIBILITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          value={syncStatusCode}
          onChange={(e) => {
            setPage(1);
            setSyncStatusCode(e.target.value);
          }}
          placeholder="sync 상태 (예: synced)"
          className="rounded-md border bg-background px-3 py-2 text-sm"
        />
        <select
          value={activeFilter}
          onChange={(e) => {
            setPage(1);
            setActiveFilter(e.target.value);
          }}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          {ACTIVE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 md:col-span-5"
        >
          검색
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          문서 목록을 불러오지 못했습니다.
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-2 text-left font-medium">경로</th>
              <th className="px-4 py-2 text-left font-medium">가시성</th>
              <th className="px-4 py-2 text-left font-medium">Sync</th>
              <th className="px-4 py-2 text-left font-medium">활성</th>
              <th className="px-4 py-2 text-left font-medium">소유자</th>
              <th className="px-4 py-2 text-right font-medium">Rev</th>
              <th className="px-4 py-2 text-left font-medium">갱신</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  로딩 중…
                </td>
              </tr>
            ) : result && result.items.length > 0 ? (
              result.items.map((doc) => (
                <tr key={doc.documentId} className="border-b last:border-b-0">
                  <td className="px-4 py-2 font-mono text-xs">{doc.relativePath}</td>
                  <td className="px-4 py-2">{doc.visibilityScope}</td>
                  <td className="px-4 py-2 font-mono text-xs">{doc.syncStatusCode}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        doc.isActive
                          ? 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-600'
                          : 'rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'
                      }
                    >
                      {doc.isActive ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {doc.ownerLoginId ?? <span className="text-muted-foreground">user#{doc.ownerUserId}</span>}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{doc.revisionSeq}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {new Date(doc.updatedAt).toLocaleString('ko-KR')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {result && result.total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            총 {result.total}건 · {result.page} / {totalPages} 페이지
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isFetching}
              className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
            >
              이전
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isFetching}
              className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
