'use client';

import { createSharedHttpError } from '@ssoo/web-auth';
import { SsooErrorNotice } from '@ssoo/web-shell';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useCrmCommonCodeOptions, withCurrentCodeOption } from '@/lib/crmCommonCodeOptions';
import { AlertCircle, RefreshCw, Search } from 'lucide-react';
import type {
  CrmContractPerformanceMonth,
  CrmContractPerformanceRegion,
  CrmContractPerformanceResponse,
  CrmContractPerformanceRow,
} from '@ssoo/types/crm';
import { Button, Input, NativeSelect, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ssoo/web-ui';
import { SSOO_CONTENT_PAGE_METRICS, SSOO_PAGE_CHROME_METRICS, SsooSearchInput } from '@ssoo/web-shell';
import { useAuthStore } from '@/stores/auth.store';
import { useCrmBusinessYearOptions } from '@/lib/useCrmBusinessYears';
import type { ContractPerformanceWorkspaceQuery } from './contractPerformanceQuery';

interface BackendSuccessResponse<T> {
  success: true;
  data: T;
}

interface BackendErrorResponse {
  success?: false;
  error?: {
    message?: string;
  };
  message?: string;
}

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

const regionLabels: Record<CrmContractPerformanceRegion, string> = {
  all: '전체',
  domestic: '국내',
  overseas: '해외',
  unspecified: '미선택',
};

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

function formatEok(value: number) {
  return `${(Math.round(value / 1000000) / 100).toLocaleString('ko-KR')}억`;
}

function formatTableAmount(value: number) {
  if (Math.round(value) === 0) {
    return '-';
  }
  return (value / 100000000).toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ko-KR');
}

function buildApiHref(query: ContractPerformanceWorkspaceQuery) {
  const params = new URLSearchParams();
  params.set('year', String(query.year));
  params.set('mode', query.mode);
  if (query.businessType) params.set('businessType', query.businessType);
  if (query.industryLine) params.set('industryLine', query.industryLine);
  if (query.region !== 'all') params.set('region', query.region);
  if (query.search) params.set('search', query.search);
  return `/api/crm/contracts/monthly-performance?${params.toString()}`;
}

function getBackendErrorMessage(responseBody: BackendSuccessResponse<unknown> | BackendErrorResponse | null): string {
  if (!responseBody || responseBody.success === true) {
    return '계약대비실적 조회 중 오류가 발생했습니다.';
  }

  return responseBody.error?.message || responseBody.message || '계약대비실적 조회 중 오류가 발생했습니다.';
}

function getYearOptions(year: number) {
  const currentYear = new Date().getFullYear();
  return [...new Set([year, currentYear - 1, currentYear, currentYear + 1, currentYear + 2])]
    .sort((left, right) => left - right);
}

export function ContractPerformanceWorkspaceClient({
  data,
  query,
  active = true,
}: {
  active?: boolean;
  data: CrmContractPerformanceResponse;
  query: ContractPerformanceWorkspaceQuery;
}) {
  const router = useRouter();
  const commonCodes = useCrmCommonCodeOptions(['biz_type', 'group_type']);
  const [searchValue, setSearchValue] = useState(query.search);
  const submittedSearch = useRef<string | null>(null);
  useEffect(() => {
    if (submittedSearch.current !== null && query.search !== submittedSearch.current) return;
    submittedSearch.current = null;
    setSearchValue(query.search);
  }, [query.search]);
  useEffect(() => {
    const restore = () => { submittedSearch.current = null; setSearchValue(new URL(window.location.href).searchParams.get('search') ?? ''); };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  const updateQuery = (patch: Partial<ContractPerformanceWorkspaceQuery>) => {
    const next = { ...query, search: searchValue.trim(), ...patch };
    const params = new URLSearchParams({ mode: next.mode, year: String(next.year) });
    for (const key of ['businessType', 'industryLine', 'region', 'search'] as const) if (next[key]) params.set(key, next[key]);
    router.replace(`/contract-performance?${params}`, { scroll: false });
  };
  const accessToken = useAuthStore((state) => state.accessToken);
  const [currentData, setCurrentData] = useState(data);
  const businessTypeOptions = currentData.summary.businessTypeOptions.reduce((options, value) => withCurrentCodeOption(options, value), withCurrentCodeOption(commonCodes.options.biz_type ?? [], query.businessType));
  const industryLineOptions = currentData.summary.industryLineOptions.reduce((options, value) => withCurrentCodeOption(options, value), withCurrentCodeOption(commonCodes.options.group_type ?? [], query.industryLine));
  const [isReloading, setIsReloading] = useState(data.items.length === 0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const apiHref = useMemo(() => buildApiHref(query), [query]);
  const businessYears = useCrmBusinessYearOptions(query.year, getYearOptions(query.year));
  const yearOptions = businessYears.years;

  useEffect(() => {
    setCurrentData(data);
    if (data.items.length > 0) {
      setIsReloading(false);
    }
  }, [data]);

  const requestSequence = useRef(0);
  const loadPerformance = useCallback(async (signal?: AbortSignal) => {
    if (!accessToken) {
      return null;
    }

    const sequence = ++requestSequence.current;
    setIsReloading(true);
    setLoadError(null);
    try {
      const response = await fetch(apiHref, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      const payload = await response.json().catch(() => null) as BackendSuccessResponse<CrmContractPerformanceResponse> | BackendErrorResponse | null;
      if (!response.ok || payload?.success !== true) {
        throw createSharedHttpError(response, payload, getBackendErrorMessage(payload));
      }
      if (signal?.aborted || sequence !== requestSequence.current) return null;
      setCurrentData(payload.data);
      return payload.data;
    } catch (error) {
      if (signal?.aborted || sequence !== requestSequence.current) {
        return null;
      }
      setLoadError(error instanceof Error ? error.message : '계약대비실적 조회에 실패했습니다.');
      return null;
    } finally {
      if (!signal?.aborted && sequence === requestSequence.current) {
        setIsReloading(false);
      }
    }
  }, [accessToken, apiHref]);

  useEffect(() => {
    if (!active) return;
    const abortController = new AbortController();
    void loadPerformance(abortController.signal);
    return () => { abortController.abort(); requestSequence.current += 1; };
  }, [active, loadPerformance]);

  if (query.mode === 'source-compatible') {
    return (
      <main className="h-full min-h-0 min-w-0 overflow-auto bg-ssoo-content-bg p-4" data-source-surface="contract-performance">
        <div className="mx-auto w-full min-w-0" style={{ maxWidth: SSOO_CONTENT_PAGE_METRICS.landscapeContentWidthPx }}>
          <h1 className="text-xl font-semibold text-foreground">계약대비실적 (월별)</h1>
          <p className="mt-1 text-sm text-muted-foreground">확정 계약 기준 월별 청구계획·실적을 조회합니다.</p>

          <form action="/contract-performance" className="mt-6 flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); updateQuery({}); void loadPerformance(); }}>
            <Input type="hidden" name="mode" value="source-compatible" />
            <SourcePerformanceField label="사업년도 *" htmlFor="rpt-year" className="w-[140px]">
              <NativeSelect id="rpt-year" name="year" value={String(query.year)} onChange={(event) => updateQuery({ year: Number(event.target.value) })}>
                {yearOptions.map((year) => <option key={year} value={year}>{year}년</option>)}
              </NativeSelect>
            </SourcePerformanceField>
            <SourcePerformanceField label="사업구분" htmlFor="rpt-biz-type" className="w-[132px]">
              <NativeSelect id="rpt-biz-type" name="businessType" value={query.businessType} onChange={(event) => updateQuery({ businessType: event.target.value })}><option value="">전체</option>{businessTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</NativeSelect>
            </SourcePerformanceField>
            <SourcePerformanceField label="계열구분" htmlFor="rpt-group-type" className="w-[168px]">
              <NativeSelect id="rpt-group-type" name="industryLine" value={query.industryLine} onChange={(event) => updateQuery({ industryLine: event.target.value })}><option value="">전체</option>{industryLineOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</NativeSelect>
            </SourcePerformanceField>
            <SourcePerformanceField label="국내/해외" htmlFor="rpt-domestic" className="w-[132px]">
              <NativeSelect id="rpt-domestic" name="region" value={query.region} onChange={(event) => updateQuery({ region: event.target.value as CrmContractPerformanceRegion })}>{Object.entries(regionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
            </SourcePerformanceField>
            <SourcePerformanceField label="사업명" htmlFor="rpt-search" className="min-w-[190px] flex-1">
              <SsooSearchInput id="rpt-search" name="search" ariaLabel="계약명 검색" intent="data-filter" value={searchValue} onChange={(event) => { const value = event.target.value; submittedSearch.current = value.trim(); setSearchValue(value); updateQuery({ search: value.trim() }); }} placeholder="계약명 검색" />
            </SourcePerformanceField>
            <Button type="submit">조회</Button>
          </form>

          {loadError ? <SsooErrorNotice className="mt-4" error={loadError} actions={[{ label: '다시 조회', onClick: () => void loadPerformance(), disabled: isReloading }]} /> : null}
          {commonCodes.error ? <SsooErrorNotice className="mt-4" error={commonCodes.error} actions={[{ label: '공통코드 다시 조회', onClick: commonCodes.reload }]} /> : null}
          <div className="mt-7 text-right text-xs text-muted-foreground">단위 : 억원</div>
          <div className="mt-1 overflow-x-auto rounded-xl border bg-card">
            <PerformanceTable items={currentData.items} isLoading={isReloading} sourceCompatible />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{currentData.summary.contractCount}건 조회 (확정 계약 · {currentData.summary.year}년 청구계획/실적 기준)</p>
        </div>
      </main>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-ssoo-content-bg">
      <header className="border-b bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">CRM Contract Performance</p>
            <h1 className="mt-1 text-xl font-semibold text-foreground">계약대비실적</h1>
          </div>
          <Button variant="outline" size="sm" type="button" onClick={() => void loadPerformance()} disabled={isReloading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{currentData.summary.boundaryNotice}</p>
      </header>

      <main className="mx-auto min-h-0 w-full min-w-0 flex-1 overflow-auto p-4" style={{ maxWidth: SSOO_CONTENT_PAGE_METRICS.landscapeContentWidthPx + SSOO_PAGE_CHROME_METRICS.stackPaddingPx * 2 }}>
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Metric label="확정 계약" value={`${currentData.summary.contractCount}건`} sub={`${currentData.summary.year}년 계획/실적`} />
          <Metric label="계획 매출" value={formatEok(currentData.summary.planRevenueTotal)} sub={formatWon(currentData.summary.planRevenueTotal)} />
          <Metric label="실적 매출" value={formatEok(currentData.summary.actualRevenueTotal)} sub={`달성률 ${currentData.summary.revenueAchievementRate}%`} />
          <Metric label="매출 차이" value={formatEok(currentData.summary.revenueDelta)} sub={formatWon(currentData.summary.revenueDelta)} />
          <Metric label="손익 차이" value={formatEok(currentData.summary.marginDelta)} sub={formatWon(currentData.summary.marginDelta)} />
        </section>

        <section className="mt-4 rounded-md border bg-card">
          <form action="/contract-performance" className="flex flex-wrap items-end gap-3 border-b p-4">
            <label className="w-[132px] text-sm font-medium text-muted-foreground">
              사업년도
              <NativeSelect name="year" defaultValue={String(query.year)} className="mt-1">
                {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
              </NativeSelect>
            </label>
            <label className="w-[172px] text-sm font-medium text-muted-foreground">
              사업구분
              <NativeSelect name="businessType" defaultValue={query.businessType} className="mt-1">
                <option value="">전체</option>
                {currentData.summary.businessTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </NativeSelect>
            </label>
            <label className="w-[172px] text-sm font-medium text-muted-foreground">
              계열/산업
              <NativeSelect name="industryLine" defaultValue={query.industryLine} className="mt-1">
                <option value="">전체</option>
                {currentData.summary.industryLineOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </NativeSelect>
            </label>
            <label className="w-[132px] text-sm font-medium text-muted-foreground">
              국내/해외
              <NativeSelect name="region" defaultValue={query.region} className="mt-1">
                {Object.entries(regionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </NativeSelect>
            </label>
            <label className="min-w-[220px] flex-1 text-sm font-medium text-muted-foreground">
              검색
              <SsooSearchInput id="crm-contract-performance-search-input" name="search" ariaLabel="계약 대비 실적 검색" intent="data-filter" defaultValue={query.search} placeholder="계약명, 고객사, WBS" className="mt-1" />
            </label>
            <Button type="submit">
              <Search className="mr-2 h-4 w-4" />
              조회
            </Button>
          </form>

          {loadError ? (
            <SsooErrorNotice className="gap-2 px-4 py-3">
              <AlertCircle className="h-4 w-4" />
              {loadError}
            </SsooErrorNotice>
          ) : null}

          <div className="border-b px-4 py-2 text-xs text-muted-foreground">단위: 억원</div>
          <PerformanceTable items={currentData.items} isLoading={isReloading} />
          <div className="border-t px-4 py-3 text-xs text-muted-foreground">
            {currentData.summary.contractCount}건 조회 · {currentData.summary.year}년 확정 계약 청구계획/실적 기준
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  const valueTone = value.startsWith('-') ? 'text-ssoo-danger' : 'text-foreground';
  return (
    <div className="rounded-md border bg-card px-4 py-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${valueTone}`}>{value}</div>
      <div className="mt-1 truncate text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function SourcePerformanceField({ label, htmlFor, className, children }: { label: string; htmlFor: string; className?: string; children: ReactNode }) {
  return <div className={className}><label htmlFor={htmlFor} className="mb-1 block text-sm text-muted-foreground">{label}</label>{children}</div>;
}

function sourceDate(value: string) { return value ? value.slice(2).replace(/-/g, '.') : '-'; }

const SOURCE_COLUMN_WIDTHS = [72, 80, 60, 200, 90, 110, 46];
function sourceColumn(index: number, enabled: boolean) {
  return enabled ? { left: SOURCE_COLUMN_WIDTHS.slice(0, index).reduce((sum, width) => sum + width, 0) } : undefined;
}

function PerformanceTable({ items, isLoading, sourceCompatible = false }: { items: CrmContractPerformanceRow[]; isLoading: boolean; sourceCompatible?: boolean }) {
  return (
    <div className="overflow-auto">
      <Table className={sourceCompatible ? 'w-full min-w-[3076px] table-fixed text-xs' : 'w-full min-w-[2920px] text-xs'}>
        {sourceCompatible ? <colgroup>{[...SOURCE_COLUMN_WIDTHS, ...Array<number>(39).fill(62)].map((width, index) => <col key={index} style={{ width }} />)}</colgroup> : null}
        <TableHeader className="sticky top-0 z-10 bg-ssoo-content-bg text-left text-muted-foreground shadow-sm">
          <TableRow>
            {sourceCompatible ? <>
              <TableHead style={sourceColumn(0, true)} className="lg:sticky z-20 bg-ssoo-content-bg px-2 py-2" rowSpan={2}>사업구분</TableHead>
              <TableHead style={sourceColumn(1, true)} className="lg:sticky z-20 bg-ssoo-content-bg px-2 py-2" rowSpan={2}>계열구분</TableHead>
              <TableHead style={sourceColumn(2, true)} className="lg:sticky z-20 bg-ssoo-content-bg px-2 py-2" rowSpan={2}>국내/해외</TableHead>
              <TableHead style={sourceColumn(3, true)} className="lg:sticky z-20 bg-ssoo-content-bg px-2 py-2" rowSpan={2}>사업명</TableHead>
              <TableHead style={sourceColumn(4, true)} className="lg:sticky z-20 bg-ssoo-content-bg px-2 py-2" rowSpan={2}>WBS코드</TableHead>
            </> : <>
              <TableHead className="w-[260px] px-2 py-2" rowSpan={2}>계약명</TableHead>
              <TableHead className="w-[170px] px-2 py-2" rowSpan={2}>고객/구분</TableHead>
              <TableHead className="w-[120px] px-2 py-2" rowSpan={2}>WBS</TableHead>
            </>}
            <TableHead style={sourceColumn(5, sourceCompatible)} className={`w-[138px] px-2 py-2 ${sourceCompatible ? 'lg:sticky z-20 bg-ssoo-content-bg' : ''}`} rowSpan={2}>계약기간</TableHead>
            <TableHead style={sourceColumn(6, sourceCompatible)} className={`w-[58px] px-2 py-2 text-center ${sourceCompatible ? 'lg:sticky z-20 bg-ssoo-content-bg' : ''}`} rowSpan={2}>구분</TableHead>
            {MONTHS.map((month) => (
              <TableHead key={month} className="px-2 py-2 text-center" colSpan={3}>{month}월</TableHead>
            ))}
            <TableHead className="px-2 py-2 text-center" colSpan={3}>합계</TableHead>
          </TableRow>
          <TableRow>
            {[...MONTHS, 0].map((month) => (
              <MonthAmountHeads key={month} />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-border">
          {isLoading ? (
            <TableRow>
              <TableCell className="px-3 py-5 text-left text-ssoo-info" colSpan={sourceCompatible ? 46 : 44}>계약대비실적을 불러오는 중입니다.</TableCell>
            </TableRow>
          ) : null}
          {!isLoading && items.length === 0 ? (
            <TableRow>
              <TableCell className="px-3 py-5 text-left text-muted-foreground" colSpan={sourceCompatible ? 46 : 44}>조회된 계약대비실적이 없습니다.</TableCell>
            </TableRow>
          ) : null}
          {!isLoading ? items.map((item) => <PerformanceRowGroup key={item.contractId} item={item} sourceCompatible={sourceCompatible} />) : null}
          {!isLoading && items.length > 0 ? <PerformanceTotals items={items} sourceCompatible={sourceCompatible} /> : null}
        </TableBody>
      </Table>
    </div>
  );
}

function MonthAmountHeads() {
  return (
    <>
      <TableHead className="w-[62px] px-2 py-2 text-right">매출</TableHead>
      <TableHead className="w-[62px] px-2 py-2 text-right">외부원가</TableHead>
      <TableHead className="w-[62px] px-2 py-2 text-right">손익</TableHead>
    </>
  );
}

function PerformanceRowGroup({ item, sourceCompatible = false }: { item: CrmContractPerformanceRow; sourceCompatible?: boolean }) {
  const rows = [
    { key: 'plan', label: '계획', className: 'bg-card', values: item.months.map(toPlanValues), total: toPlanValues(item.total) },
    { key: 'actual', label: '실적', className: 'bg-ssoo-info-bg', values: item.months.map(toActualValues), total: toActualValues(item.total) },
    { key: 'delta', label: '차이', className: 'bg-ssoo-warning-bg', values: item.months.map(toDeltaValues), total: toDeltaValues(item.total) },
  ].filter((row) => !sourceCompatible || row.key !== 'delta');

  return (
    <>
      {rows.map((row, index) => (
        <TableRow key={row.key} className={row.className} data-contract-id={item.contractId} data-row-kind={row.key}>
          {index === 0 ? (
            <>
              {sourceCompatible ? <>
                <TableCell style={sourceColumn(0, true)} className="lg:sticky z-10 bg-card px-2 py-2 align-top break-words" rowSpan={rows.length}>{item.businessType}</TableCell>
                <TableCell style={sourceColumn(1, true)} className="lg:sticky z-10 bg-card px-2 py-2 align-top break-words" rowSpan={rows.length}>{item.industryLine}</TableCell>
                <TableCell style={sourceColumn(2, true)} className="lg:sticky z-10 bg-card px-2 py-2 align-top break-words" rowSpan={rows.length}>{regionLabels[item.region]}</TableCell>
                <TableCell style={sourceColumn(3, true)} className="lg:sticky z-10 bg-card px-2 py-2 align-top break-words" rowSpan={rows.length}>{item.contractName}</TableCell>
                <TableCell style={sourceColumn(4, true)} className="lg:sticky z-10 bg-card px-2 py-2 align-top break-words" rowSpan={rows.length}>{item.wbsCode ?? '-'}</TableCell>
              </> : <>
                <TableCell className="px-2 py-2 align-top font-medium text-foreground" rowSpan={rows.length}>
                  <div className="truncate" title={item.contractName}>{item.contractName}</div>
                  <div className="mt-1 text-caption-2xs font-normal text-muted-foreground">{item.contractCode} · {item.ownerName}</div>
                </TableCell>
                <TableCell className="px-2 py-2 align-top text-muted-foreground" rowSpan={rows.length}>
                  <div className="truncate" title={item.customerName}>{item.customerName}</div>
                  <div className="mt-1 text-caption-2xs text-muted-foreground">{item.businessType} · {item.industryLine}</div>
                </TableCell>
                <TableCell className="px-2 py-2 align-top text-muted-foreground" rowSpan={rows.length}>{item.wbsCode ?? '-'}</TableCell>
              </>}
              <TableCell style={sourceColumn(5, sourceCompatible)} className={`px-2 py-2 align-top text-muted-foreground ${sourceCompatible ? 'lg:sticky z-10 bg-card' : ''}`} rowSpan={rows.length}>{sourceCompatible ? `${sourceDate(item.contractStartDate)}~${sourceDate(item.contractEndDate)}` : `${formatDate(item.contractStartDate)} - ${formatDate(item.contractEndDate)}`}</TableCell>
            </>
          ) : null}
          <TableCell style={sourceColumn(6, sourceCompatible)} className={`px-2 py-2 text-center font-medium text-muted-foreground ${sourceCompatible ? 'lg:sticky z-10 bg-inherit' : ''}`}>{row.label}</TableCell>
          {row.values.map((valueSet, monthIndex) => (
            <AmountCells key={`${row.key}-${monthIndex}`} values={valueSet} sourceCompatible={sourceCompatible} isDelta={row.key === 'delta'} />
          ))}
          <AmountCells values={row.total} sourceCompatible={sourceCompatible} isDelta={row.key === 'delta'} isTotal />
        </TableRow>
      ))}
    </>
  );
}

function toPlanValues(month: CrmContractPerformanceMonth) {
  return [month.planRevenueAmount, month.planExternalCostAmount, month.planMarginAmount];
}

function toActualValues(month: CrmContractPerformanceMonth) {
  return [month.actualRevenueAmount, month.actualExternalCostAmount, month.actualMarginAmount];
}

function toDeltaValues(month: CrmContractPerformanceMonth) {
  return [month.revenueDelta, month.externalCostDelta, month.marginDelta];
}

function AmountCells({ values, isDelta, isTotal = false, sourceCompatible = false }: { values: number[]; isDelta: boolean; isTotal?: boolean; sourceCompatible?: boolean }) {
  return (
    <>
      {values.map((value, index) => {
        const colored = isDelta || (sourceCompatible && index === 2);
        const tone = colored && value < 0 ? 'text-ssoo-danger' : colored && value > 0 ? 'text-ssoo-info' : 'text-muted-foreground';
        const weight = isTotal ? 'font-semibold' : 'font-normal';
        return (
          <TableCell key={index} className={`px-2 py-2 text-right ${tone} ${weight}`}>
            {sourceCompatible ? value === 0 ? '-' : (value / 100000000).toFixed(2) : formatTableAmount(value)}
          </TableCell>
        );
      })}
    </>
  );
}

function PerformanceTotals({ items, sourceCompatible }: { items: CrmContractPerformanceRow[]; sourceCompatible: boolean }) {
  const kinds = sourceCompatible ? ['plan', 'actual'] as const : ['plan', 'actual', 'delta'] as const;
  return <>{kinds.map((kind) => {
    const values = kind === 'plan' ? toPlanValues : kind === 'actual' ? toActualValues : toDeltaValues;
    const sum = (month: number) => items.reduce((total, item) => values(month === 12 ? item.total : item.months[month]).map((value, index) => value + total[index]), [0, 0, 0]);
    return <TableRow key={kind} className="bg-muted" data-total-kind={kind}>
      <TableCell colSpan={sourceCompatible ? 6 : 4} style={sourceColumn(0, sourceCompatible)} className={`px-2 py-2 font-semibold ${sourceCompatible ? 'lg:sticky z-10 bg-muted' : ''}`}>합계</TableCell>
      <TableCell style={sourceColumn(6, sourceCompatible)} className={`px-2 py-2 text-center font-semibold ${sourceCompatible ? 'lg:sticky z-10 bg-muted' : ''}`}>{kind === 'plan' ? '계획' : kind === 'actual' ? '실적' : '차이'}</TableCell>
      {Array.from({ length: 13 }, (_, month) => <AmountCells key={month} values={sum(month)} isDelta={kind === 'delta'} sourceCompatible={sourceCompatible} isTotal />)}
    </TableRow>;
  })}</>;
}
