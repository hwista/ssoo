'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronUp, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type {
  CrmOpportunity,
  CrmOpportunityLine,
  CrmOpportunityListResponse,
  CrmOpportunitySort,
  CrmOpportunityStatus,
} from '@ssoo/types/crm';
import { useAuthStore } from '@/stores/auth.store';
import { Button, Input, NativeSelect, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';

export interface OpportunityWorkspaceQuery {
  search: string;
  status: CrmOpportunityStatus | 'all';
  sort: CrmOpportunitySort;
  selected: string;
}

const statusLabels: Record<CrmOpportunityStatus, string> = {
  draft: '초안',
  qualified: '검증',
  proposal: '제안',
  won: '수주',
  lost: '실주',
  hold: '보류',
};

const statusTone: Record<CrmOpportunityStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  qualified: 'bg-blue-100 text-blue-800',
  proposal: 'bg-violet-100 text-violet-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-rose-100 text-rose-800',
  hold: 'bg-yellow-100 text-yellow-800',
};

const priorityLabels: Record<CrmOpportunity['priority'], string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

const sortLabels: Record<CrmOpportunitySort, string> = {
  'updated-desc': '최근 수정순',
  'revenue-desc': '매출 높은순',
  'margin-desc': '손익률 높은순',
};

const formatCurrency = (value: number) => `${Math.round(value / 100000000).toLocaleString('ko-KR')}억`;
const formatDate = (value: string) => new Date(value).toLocaleDateString('ko-KR');

function buildHref(query: OpportunityWorkspaceQuery, patch: Partial<Record<'search' | 'status' | 'sort' | 'selected', string>>) {
  const params = new URLSearchParams();
  const next = { ...query, ...patch };
  if (next.search) params.set('search', next.search);
  if (next.status && next.status !== 'all') params.set('status', next.status);
  if (next.sort && next.sort !== 'updated-desc') params.set('sort', next.sort);
  if (next.selected) params.set('selected', next.selected);
  const suffix = params.toString();
  return suffix ? `/?${suffix}` : '/';
}

function buildApiHref(query: OpportunityWorkspaceQuery) {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.status && query.status !== 'all') params.set('status', query.status);
  if (query.sort && query.sort !== 'updated-desc') params.set('sort', query.sort);
  const suffix = params.toString();
  return suffix ? `/api/crm/opportunities?${suffix}` : '/api/crm/opportunities';
}

export function OpportunityWorkspaceClient({ data, query }: { data: CrmOpportunityListResponse; query: OpportunityWorkspaceQuery }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [currentData, setCurrentData] = useState(data);
  const [isReloading, setIsReloading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { search, sort, status } = query;
  const apiHref = useMemo(
    () => buildApiHref({ search, sort, status, selected: '' }),
    [search, sort, status],
  );

  useEffect(() => {
    setCurrentData(data);
  }, [data]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const abortController = new AbortController();
    setIsReloading(true);
    setLoadError(null);
    fetch(apiHref, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: abortController.signal,
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || payload?.success !== true) {
          throw new Error(payload?.error?.message || payload?.message || 'CRM 영업기회 조회에 실패했습니다.');
        }
        setCurrentData(payload.data as CrmOpportunityListResponse);
      })
      .catch((error) => {
        if (abortController.signal.aborted) {
          return;
        }
        setLoadError(error instanceof Error ? error.message : 'CRM 영업기회 조회에 실패했습니다.');
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsReloading(false);
        }
      });

    return () => abortController.abort();
  }, [accessToken, apiHref]);

  const selected = query.selected
    ? currentData.items.find((item) => item.id === query.selected) ?? null
    : null;
  const totalPages = Math.max(1, Math.ceil(currentData.items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedItems = useMemo(
    () => currentData.items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [currentData.items, pageSize, safePage]
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <Breadcrumb items={['CRM', '영업기회 목록']} />
      {loadError ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{loadError}</div>
      ) : null}
      {isReloading ? (
        <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">인증된 CRM 원장 데이터를 조회하는 중입니다.</div>
      ) : null}
      <PageHeader query={query} isOpen={filtersOpen} onOpenChange={setFiltersOpen} />

      <section className="flex-1 min-h-0 bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid h-full min-h-[560px] grid-rows-[1fr_52px] xl:grid-cols-[1fr_420px] xl:grid-rows-[1fr_52px]">
          <div className="min-w-0 overflow-hidden border-b border-ssoo-content-border xl:border-b-0 xl:border-r">
            <OpportunityTable items={pagedItems} pageSize={pageSize} selectedId={selected?.id ?? null} query={query} />
          </div>
          <OpportunityDetail item={selected} />
          <TableFooter
            page={safePage}
            pageSize={pageSize}
            total={currentData.summary.filteredCount}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
          />
        </div>
      </section>
    </div>
  );
}

function Breadcrumb({ items }: { items: string[] }) {
  return (
    <nav className="flex items-center gap-2 text-xs text-gray-500">
      {items.map((item, index) => (
        <span key={item} className={index === items.length - 1 ? 'font-semibold text-ssoo-primary' : ''}>
          {item}{index < items.length - 1 ? <span className="mx-2 text-gray-300">/</span> : null}
        </span>
      ))}
    </nav>
  );
}

function PageHeader({
  query,
  isOpen,
  onOpenChange,
}: {
  query: OpportunityWorkspaceQuery;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 min-h-[52px] border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            disabled
            className="cursor-not-allowed opacity-70"
            title="CRM 등록 API가 아직 구현되지 않아 이 화면에서는 조회만 가능합니다."
          >
            <Plus className="h-4 w-4" /> 등록 API 미구현
          </Button>
          <Button
            variant="destructive"
            type="button"
            disabled
            className="cursor-not-allowed opacity-70"
            title="삭제 API 연결 후 활성화됩니다."
          >
            <Trash2 className="h-4 w-4" /> 삭제 준비 중
          </Button>
        </div>
        <Button variant="plain" size="plain"
          type="button"
          className="inline-flex h-8 items-center justify-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-ssoo-content-bg"
          aria-expanded={isOpen}
          onClick={() => onOpenChange(!isOpen)}
        >
          {isOpen ? '접기' : '펼치기'} {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {isOpen && (
        <form className="flex min-h-[52px] items-center gap-3 bg-gray-50 px-4 py-2" method="get">
          <div className="w-[200px]">
            <Input name="search" defaultValue={query.search} placeholder="고객사, 건명, 담당자" />
          </div>
          <div className="w-[150px]">
            <NativeSelect name="status" defaultValue={query.status}>
              <option value="all">전체</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </NativeSelect>
          </div>
          <div className="w-[150px]">
            <NativeSelect name="sort" defaultValue={query.sort}>
              {Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </NativeSelect>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button type="submit">
              <Search className="h-4 w-4" /> 검색
            </Button>
            <Link href="/" className="inline-flex h-control-h items-center justify-center gap-2 rounded-md border border-ssoo-content-border bg-white px-4 py-2 text-sm font-medium text-ssoo-primary shadow-sm transition-colors hover:bg-ssoo-sitemap-bg">
              <RotateCcw className="h-4 w-4" /> 초기화
            </Link>
          </div>
        </form>
      )}
    </section>
  );
}

function OpportunityTable({
  items,
  pageSize,
  selectedId,
  query,
}: {
  items: CrmOpportunity[];
  pageSize: number;
  selectedId: string | null;
  query: OpportunityWorkspaceQuery;
}) {
  return (
    <div className="flex h-full flex-col rounded-md border">
      <div className="min-h-0 flex-1 overflow-auto">
        <Table className="w-full min-w-[1100px] caption-bottom text-sm">
          <TableHeader className="sticky top-0 z-10 bg-ssoo-content-bg text-left text-sm font-medium text-muted-foreground shadow-sm [&_tr]:border-b">
            <TableRow className="h-9">
              <TableHead className="w-[120px] px-2 py-2">기회번호</TableHead>
              <TableHead className="w-[260px] px-2 py-2">영업기회명</TableHead>
              <TableHead className="w-[180px] px-2 py-2">고객사</TableHead>
              <TableHead className="w-[100px] px-2 py-2">상태</TableHead>
              <TableHead className="w-[90px] px-2 py-2">우선순위</TableHead>
              <TableHead className="w-[120px] px-2 py-2 text-right">매출</TableHead>
              <TableHead className="w-[120px] px-2 py-2 text-right">원가</TableHead>
              <TableHead className="w-[100px] px-2 py-2 text-right">손익률</TableHead>
              <TableHead className="w-[120px] px-2 py-2">수정일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100">
            {items.map((item) => <OpportunityRow key={item.id} item={item} selected={item.id === selectedId} href={buildHref(query, { selected: item.id })} />)}
            {items.length === 0 ? <TableRow><TableCell className="h-9 px-2 py-2 text-center text-gray-500" colSpan={9}>조회된 영업기회가 없습니다.</TableCell></TableRow> : null}
            {Array.from({ length: Math.max(0, pageSize - items.length) }).map((_, index) => (
              <TableRow key={`empty-${index}`} className="h-9 border-b bg-white" aria-hidden="true">
                <TableCell colSpan={9}>&nbsp;</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function OpportunityRow({ item, selected, href }: { item: CrmOpportunity; selected: boolean; href: string }) {
  const router = useRouter();
  const openRow = () => router.push(href);
  const linkClass = 'block h-full w-full px-2 py-2 text-inherit no-underline';

  return (
    <TableRow
      tabIndex={0}
      onClick={openRow}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openRow();
        }
      }}
      data-active={selected ? 'true' : undefined}
      className={selected ? 'h-9 cursor-pointer border-b bg-ssoo-content-border transition-colors' : 'h-9 cursor-pointer border-b bg-white transition-colors hover:bg-ssoo-sitemap-bg'}
    >
      <TableCell className="whitespace-nowrap p-0">
        <Link className={`${linkClass} font-medium text-ssoo-primary hover:underline`} href={href}>OPP-{item.id}</Link>
      </TableCell>
      <TableCell className="whitespace-nowrap p-0">
        <Link className={linkClass} href={href}><span className="block max-w-[244px] truncate font-medium text-gray-800">{item.opportunityName}</span></Link>
      </TableCell>
      <TableCell className="whitespace-nowrap p-0 text-gray-700"><Link className={linkClass} href={href}>{item.customerName}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0"><Link className={linkClass} href={href}><span className={`rounded px-2 py-1 text-xs font-medium ${statusTone[item.status]}`}>{statusLabels[item.status]}</span></Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-gray-700"><Link className={linkClass} href={href}>{priorityLabels[item.priority]}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-right font-medium text-gray-800"><Link className={linkClass} href={href}>{formatCurrency(item.revenueTotal)}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-right text-gray-700"><Link className={linkClass} href={href}>{formatCurrency(item.costTotal)}</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-right font-medium text-ssoo-secondary"><Link className={linkClass} href={href}>{item.marginRate}%</Link></TableCell>
      <TableCell className="whitespace-nowrap p-0 text-gray-600"><Link className={linkClass} href={href}>{formatDate(item.updatedAt)}</Link></TableCell>
    </TableRow>
  );
}

function OpportunityDetail({ item }: { item: CrmOpportunity | null }) {
  return (
    <aside className="min-h-0 overflow-auto bg-white">
      <div className="flex h-9 items-center justify-between border-b border-ssoo-content-border bg-ssoo-content-bg px-2 shadow-sm">
        <h2 className="text-sm font-medium text-muted-foreground">상세 정보</h2>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </div>
      {!item ? (
        <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-gray-500">행을 선택하세요.</div>
      ) : (
        <div className="space-y-4 p-4">
          <div>
            <div className="text-xs text-gray-500">OPP-{item.id}</div>
            <h3 className="mt-1 text-base font-bold text-gray-900">{item.opportunityName}</h3>
            <p className="mt-1 text-sm text-gray-600">{item.customerName}</p>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Field label="담당자" value={item.ownerName} />
            <Field label="상태" value={statusLabels[item.status]} />
            <Field label="예상 시작" value={formatDate(item.expectedStartDate)} />
            <Field label="예상 종료" value={formatDate(item.expectedEndDate)} />
            <Field label="매출" value={formatCurrency(item.revenueTotal)} strong />
            <Field label="원가" value={formatCurrency(item.costTotal)} />
            <Field label="손익" value={formatCurrency(item.marginTotal)} strong />
            <Field label="손익률" value={`${item.marginRate}%`} strong />
          </dl>

          <DetailSection title="다음 행동">
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">{item.nextAction}</div>
          </DetailSection>

          <DetailSection title="매출 라인">
            <LineTable lines={item.revenueLines} />
          </DetailSection>

          <DetailSection title="원가 라인">
            <LineTable lines={item.costLines} />
          </DetailSection>

          <DetailSection title="업무 경계">
            <div className="space-y-2 text-xs text-gray-600">
              <BoundaryRow label="DMS" value={item.dmsLinkStatus === 'planned' ? '문서 연결 예정' : '미연결'} />
              <BoundaryRow label="PMS" value={item.pmsHandoffStatus === 'planned' ? '수행 인계 예정' : '미연결'} />
              <BoundaryRow label="Admin" value="계정/권한/법인/조직 참조" />
            </div>
          </DetailSection>
        </div>
      )}
    </aside>
  );
}

function Field({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className={strong ? 'mt-1 font-semibold text-gray-900' : 'mt-1 text-gray-700'}>{value}</dd>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold text-gray-500">{title}</h4>
      {children}
    </section>
  );
}

function LineTable({ lines }: { lines: CrmOpportunityLine[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-gray-200">
      <Table className="w-full text-xs">
        <TableBody className="divide-y divide-gray-100">
          {lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell className="px-3 py-2 text-gray-600">{line.label}</TableCell>
              <TableCell className="px-3 py-2 text-right font-medium text-gray-800">{formatCurrency(line.amount)}</TableCell>
            </TableRow>
          ))}
          {lines.length === 0 ? <TableRow><TableCell className="px-3 py-4 text-center text-gray-500">내역 없음</TableCell></TableRow> : null}
        </TableBody>
      </Table>
    </div>
  );
}

function BoundaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
      <span className="font-medium text-gray-700">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function TableFooter({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, total);
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className="col-span-full flex min-h-[52px] items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span>페이지당</span>
          <NativeSelect
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="w-[70px] bg-white px-2"
          >
            {[10, 20, 30, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
          </NativeSelect>
          <span>개</span>
        </div>
        <span>{startItem}-{endItem} / 총 {total.toLocaleString()}개</span>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" type="button" onClick={() => onPageChange(1)} disabled={!canGoPrevious}>
          <ChevronsLeft className="h-4 w-4" /><span className="sr-only">첫 페이지</span>
        </Button>
        <Button variant="outline" size="icon" type="button" onClick={() => onPageChange(page - 1)} disabled={!canGoPrevious}>
          <ChevronLeft className="h-4 w-4" /><span className="sr-only">이전 페이지</span>
        </Button>
        <div className="flex items-center gap-1 px-2">
          <span className="text-sm font-medium text-gray-800">{page}</span>
          <span>/</span>
          <span>{totalPages}</span>
        </div>
        <Button variant="outline" size="icon" type="button" onClick={() => onPageChange(page + 1)} disabled={!canGoNext}>
          <ChevronRight className="h-4 w-4" /><span className="sr-only">다음 페이지</span>
        </Button>
        <Button variant="outline" size="icon" type="button" onClick={() => onPageChange(totalPages)} disabled={!canGoNext}>
          <ChevronsRight className="h-4 w-4" /><span className="sr-only">마지막 페이지</span>
        </Button>
      </div>
    </div>
  );
}
