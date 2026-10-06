'use client';

import { SsooErrorNotice, SsooErrorPanel } from '@ssoo/web-shell';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarPlus, Trash2 } from 'lucide-react';
import { Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';
import { businessYearsApi } from '@/lib/businessYears';
import { useCrmBusinessYears } from '@/lib/useCrmBusinessYears';
import { useCrmDomainAccess } from '@/lib/useCrmDomainAccess';
import { useAuthStore } from '@/stores/auth.store';

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string }; message?: string } } }).response;
    return response?.data?.error?.message ?? response?.data?.message ?? '요청 처리에 실패했습니다.';
  }
  return error instanceof Error ? error.message : '요청 처리에 실패했습니다.';
}

interface BusinessYearManagementPageProps {
  path?: string;
}

export function BusinessYearManagementPage({ path }: BusinessYearManagementPageProps) {
  const searchParams = useSearchParams();
  const sourceCompatible = searchParams.get('mode') === 'source-compatible'
    || new URLSearchParams(path?.split('?')[1] ?? '').get('mode') === 'source-compatible';
  const [yearText, setYearText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const yearsQuery = useCrmBusinessYears();
  const accessToken = useAuthStore((state) => state.accessToken);
  const { access, error: accessError, retry: retryAccess } = useCrmDomainAccess(accessToken);
  const [saving, setSaving] = useState(false);
  const years = useMemo(() => [...yearsQuery.years].sort((a, b) => b.year - a.year), [yearsQuery.years]);
  const sourceYears = years;
  const pending = saving || yearsQuery.isLoading || Boolean(yearsQuery.error) || !access?.features.canManageBusinessYear;

  const addYear = async (candidate = yearText) => {
    if (pending) return;
    setNotice(null);
    const normalizedCandidate = candidate.trim();
    const year = Number.parseInt(normalizedCandidate, 10);
    if (!/^\d{4}$/.test(normalizedCandidate) || year < 2000 || year > 2100) {
      setError('2000년부터 2100년 사이의 4자리 연도를 입력하세요.');
      return;
    }
    if (years.some((item) => item.year === year)) {
      setError('이미 등록된 사업연도입니다.');
      return;
    }
    setSaving(true);
    try {
      setError(null);
      await businessYearsApi.create({ year });
      setYearText('');
      setNotice(`${year}년이 추가되었습니다.`);
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally { setSaving(false); }
  };

  const toggle = async (id: string, isActive: boolean) => {
    if (pending) return;
    setNotice(null);
    setSaving(true);
    try {
      setError(null);
      await businessYearsApi.update(id, { isActive: !isActive });
      setNotice(`${isActive ? '비활성화' : '활성화'}되었습니다.`);
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally { setSaving(false); }
  };

  const remove = async (id: string, name: string, isActive: boolean) => {
    if (pending) return;
    setNotice(null);
    if (isActive) {
      setError('활성 사업연도는 먼저 비활성화해야 삭제할 수 있습니다.');
      return;
    }
    if (!window.confirm(`“${name}”을 영구 삭제하시겠습니까?`)) return;
    setSaving(true);
    try {
      setError(null);
      await businessYearsApi.remove(id);
      setNotice('사업연도가 삭제되었습니다.');
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally { setSaving(false); }
  };

  const promptAndAddYear = () => {
    const candidate = window.prompt('추가할 사업년도를 입력하세요. (예: 2028)');
    if (candidate === null) return;
    void addYear(candidate);
  };

  const loadError = yearsQuery.error || accessError;
  const queryNotice = loadError ? <SsooErrorPanel error={loadError} onRetry={() => { retryAccess(); void yearsQuery.reload(); }} /> : null;
  const permissionNotice = access && !access.features.canManageBusinessYear
    ? <p className="text-sm text-muted-foreground">조회 전용입니다. 사업연도 관리 권한이 필요합니다.</p> : null;

  if (sourceCompatible) {
    return (
      <main
        className="flex min-h-full flex-col gap-5 bg-muted/20 p-4 sm:p-6"
        data-testid="business-year-management"
        data-source-surface="business-years"
      >
        {queryNotice}{permissionNotice}
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">사업년도 관리</h1>
            <p className="mt-1 text-sm text-muted-foreground">계약대비실적·내부원가에서 사용할 사업년도를 관리합니다.</p>
          </div>
          <Button onClick={promptAndAddYear} disabled={pending} data-testid="business-year-add">+ 년도 추가</Button>
        </header>

        <p className="rounded-lg border border-ssoo-warning-border bg-ssoo-warning-bg px-4 py-3 text-sm text-ssoo-warning">
          ☆ &nbsp;관리자 전용 페이지입니다. 활성화된 년도만 화면에 표시됩니다.
        </p>

        {notice ? <p className="rounded-md border border-ssoo-success-border bg-ssoo-success-bg p-3 text-sm text-ssoo-success">{notice}</p> : null}
        {error ? <SsooErrorNotice as="p" compact className="p-3" error={error} /> : null}

        <section className="overflow-hidden rounded-lg border bg-background">
          <div className="overflow-x-auto">
            <Table className="min-w-[640px] text-sm">
              <TableHeader className="bg-muted/60 text-left text-xs text-muted-foreground">
                <TableRow>
                  <TableHead className="px-4 py-3">년도</TableHead>
                  <TableHead className="px-4 py-3">순서</TableHead>
                  <TableHead className="px-4 py-3">상태</TableHead>
                  <TableHead className="px-4 py-3">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y">
                {yearsQuery.isLoading ? (
                  <TableRow><TableCell colSpan={4} className="px-4 py-10 text-center text-muted-foreground">사업년도를 불러오는 중입니다.</TableCell></TableRow>
                ) : sourceYears.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="px-4 py-10 text-center text-muted-foreground">등록된 사업년도가 없습니다.</TableCell></TableRow>
                ) : sourceYears.map((item) => (
                  <TableRow key={item.id} data-testid={`business-year-row-${item.year}`}>
                    <TableCell className="px-4 py-3 font-medium">{item.displayName}</TableCell>
                    <TableCell className="px-4 py-3">{item.sortOrder}</TableCell>
                    <TableCell className="px-4 py-3"><span className={item.isActive ? 'text-ssoo-success' : 'text-muted-foreground'}>{item.isActive ? '활성' : '비활성'}</span></TableCell>
                    <TableCell className="px-4 py-3"><div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => void toggle(item.id, item.isActive)} disabled={pending}>{item.isActive ? '비활성화' : '활성화'}</Button>
                      <Button size="sm" variant="destructive" onClick={() => void remove(item.id, item.displayName, item.isActive)} disabled={pending || item.isActive}>삭제</Button>
                    </div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
        <footer className="text-xs text-muted-foreground">{sourceYears.length}건</footer>
      </main>
    );
  }

  return (
    <main className="flex min-h-full flex-col gap-5 bg-muted/20 p-4 sm:p-6" data-testid="business-year-management">
      {queryNotice}{permissionNotice}
      <header>
        <h1 className="text-xl font-semibold text-foreground">사업연도 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">CRM 계획·실적 화면에서 사용할 사업연도를 추가하고 활성 상태를 관리합니다.</p>
      </header>

      <section className="flex flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-end">
        <label className="grid flex-1 gap-1.5 text-sm font-medium">
          추가할 연도
          <Input inputMode="numeric" maxLength={4} placeholder="예: 2028" value={yearText} disabled={saving} onChange={(event) => setYearText(event.target.value)} data-testid="business-year-input" />
        </label>
        <Button onClick={() => void addYear()} disabled={pending} data-testid="business-year-add"><CalendarPlus className="mr-2 h-4 w-4" />연도 추가</Button>
      </section>

      {notice ? <p className="rounded-md border border-ssoo-success-border bg-ssoo-success-bg p-3 text-sm text-ssoo-success">{notice}</p> : null}
      {error ? <SsooErrorNotice as="p" compact className="p-3" error={error} /> : null}

      <section className="overflow-hidden rounded-lg border bg-background">
        <div className="overflow-x-auto">
          <Table className="min-w-[640px] text-sm">
            <TableHeader className="bg-muted/60 text-left text-xs text-muted-foreground"><TableRow><TableHead className="px-4 py-3">사업연도</TableHead><TableHead className="px-4 py-3 text-center">정렬</TableHead><TableHead className="px-4 py-3 text-center">상태</TableHead><TableHead className="px-4 py-3 text-right">관리</TableHead></TableRow></TableHeader>
            <TableBody className="divide-y">
              {yearsQuery.isLoading ? <TableRow><TableCell colSpan={4} className="px-4 py-10 text-center text-muted-foreground">사업연도를 불러오는 중입니다.</TableCell></TableRow>
                : years.length === 0 ? <TableRow><TableCell colSpan={4} className="px-4 py-10 text-center text-muted-foreground">등록된 사업연도가 없습니다.</TableCell></TableRow>
                  : years.map((item) => (
                    <TableRow key={item.id} data-testid={`business-year-row-${item.year}`}>
                      <TableCell className="px-4 py-3 font-medium">{item.displayName}</TableCell>
                      <TableCell className="px-4 py-3 text-center">{item.sortOrder}</TableCell>
                      <TableCell className="px-4 py-3 text-center"><span className={item.isActive ? 'text-ssoo-success' : 'text-muted-foreground'}>{item.isActive ? '활성' : '비활성'}</span></TableCell>
                      <TableCell className="px-4 py-3"><div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => void toggle(item.id, item.isActive)} disabled={pending}>{item.isActive ? '비활성화' : '활성화'}</Button>
                        <Button size="sm" variant="destructive" onClick={() => void remove(item.id, item.displayName, item.isActive)} disabled={pending || item.isActive}><Trash2 className="mr-1 h-3.5 w-3.5" />삭제</Button>
                      </div></TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
        <footer className="border-t px-4 py-3 text-xs text-muted-foreground">{years.length}건</footer>
      </section>
    </main>
  );
}

export default BusinessYearManagementPage;
