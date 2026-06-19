'use client';

import { useState } from 'react';
import { useDmsAdminDocuments } from '@/hooks/queries/useDmsAdmin';
import { Button, Input, NativeSelect, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';

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
          <h1 className="text-2xl font-bold text-foreground">DMS 문서 현황</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            플랫폼 운영자용 read-only 문서 현황입니다. 문서 도메인의 설정·제어·운영 owner는 DMS이며, 이 화면은 경로 검색, 가시성 / sync 상태 / 활성 여부 필터만 제공합니다.
          </p>
        </div>
        <Button variant="plain" size="plain"
          onClick={() => refetch()}
          className="rounded-md border bg-card px-3 py-1.5 text-xs hover:bg-accent"
          disabled={isFetching}
        >
          {isFetching ? '갱신 중…' : '새로고침'}
        </Button>
      </div>

      <form
        className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQ(qInput.trim());
        }}
      >
        <Input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="경로 검색 (relativePath)"
          className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
        />
        <NativeSelect
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
        </NativeSelect>
        <Input
          value={syncStatusCode}
          onChange={(e) => {
            setPage(1);
            setSyncStatusCode(e.target.value);
          }}
          placeholder="sync 상태 (예: synced)"
          className="rounded-md border bg-background px-3 py-2 text-sm"
        />
        <NativeSelect
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
        </NativeSelect>
        <Button variant="plain" size="plain"
          type="submit"
          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 md:col-span-5"
        >
          검색
        </Button>
      </form>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          문서 목록을 불러오지 못했습니다.
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <Table className="w-full text-sm">
          <TableHeader className="border-b bg-muted/40">
            <TableRow>
              <TableHead className="px-4 py-2 text-left font-medium">경로</TableHead>
              <TableHead className="px-4 py-2 text-left font-medium">가시성</TableHead>
              <TableHead className="px-4 py-2 text-left font-medium">Sync</TableHead>
              <TableHead className="px-4 py-2 text-left font-medium">활성</TableHead>
              <TableHead className="px-4 py-2 text-left font-medium">소유자</TableHead>
              <TableHead className="px-4 py-2 text-right font-medium">Rev</TableHead>
              <TableHead className="px-4 py-2 text-left font-medium">갱신</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  로딩 중…
                </TableCell>
              </TableRow>
            ) : result && result.items.length > 0 ? (
              result.items.map((doc) => (
                <TableRow key={doc.documentId} className="border-b last:border-b-0">
                  <TableCell className="px-4 py-2 font-mono text-xs">{doc.relativePath}</TableCell>
                  <TableCell className="px-4 py-2">{doc.visibilityScope}</TableCell>
                  <TableCell className="px-4 py-2 font-mono text-xs">{doc.syncStatusCode}</TableCell>
                  <TableCell className="px-4 py-2">
                    <span
                      className={
                        doc.isActive
                          ? 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-600'
                          : 'rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'
                      }
                    >
                      {doc.isActive ? 'active' : 'inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-2">
                    {doc.ownerLoginId ?? <span className="text-muted-foreground">user#{doc.ownerUserId}</span>}
                  </TableCell>
                  <TableCell className="px-4 py-2 text-right font-mono text-xs">{doc.revisionSeq}</TableCell>
                  <TableCell className="px-4 py-2 text-xs text-muted-foreground">
                    {new Date(doc.updatedAt).toLocaleString('ko-KR')}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  결과가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {result && result.total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            총 {result.total}건 · {result.page} / {totalPages} 페이지
          </p>
          <div className="flex gap-2">
            <Button variant="plain" size="plain"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isFetching}
              className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
            >
              이전
            </Button>
            <Button variant="plain" size="plain"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isFetching}
              className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
            >
              다음
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
