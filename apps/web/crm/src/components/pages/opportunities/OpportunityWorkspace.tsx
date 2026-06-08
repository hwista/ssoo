import { AlertTriangle, CheckCircle2, CircleDollarSign, ClipboardList, FileClock, Search, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { CrmOpportunity, CrmOpportunityListQuery, CrmOpportunityListResponse, CrmOpportunitySort, CrmOpportunityStatus } from '@ssoo/types/crm';

const API_BASE_URL = process.env.CRM_SERVER_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const fallback: CrmOpportunityListResponse = {
  summary: {
    totalCount: 0,
    filteredCount: 0,
    qualifiedCount: 0,
    proposalCount: 0,
    wonCount: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalMargin: 0,
    grossMarginRate: 0,
    boundaryNotice: 'CRM API 연결 전입니다. 계약/청구/매출/원가는 CRM, 실행 수행은 PMS, 계정/권한/법인/조직은 공용 Admin 경계로 표시합니다.',
    unimplementedIntegrations: ['견적 생성', '계약 전환', 'DMS 연결', 'PMS 인계'],
    activeFilters: { search: '', status: 'all', sort: 'updated-desc' },
  },
  items: [],
};

function normalizeQuery(query: Record<string, string | string[] | undefined> = {}): Required<CrmOpportunityListQuery> {
  const value = (key: string) => {
    const raw = query[key];
    return Array.isArray(raw) ? raw[0] ?? '' : raw ?? '';
  };
  const status = value('status') as CrmOpportunityStatus | 'all';
  const sort = value('sort') as CrmOpportunitySort;
  return {
    search: value('search').trim(),
    status: ['draft', 'qualified', 'proposal', 'won', 'lost', 'hold'].includes(status) ? status : 'all',
    sort: ['revenue-desc', 'margin-desc'].includes(sort) ? sort : 'updated-desc',
  };
}

async function loadOpportunities(query: Required<CrmOpportunityListQuery>): Promise<CrmOpportunityListResponse> {
  try {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.status !== 'all') params.set('status', query.status);
    if (query.sort !== 'updated-desc') params.set('sort', query.sort);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_BASE_URL}/crm/opportunities${suffix}`, { cache: 'no-store' });
    if (!response.ok) return fallback;
    const payload = await response.json();
    return payload?.data ?? fallback;
  } catch {
    return fallback;
  }
}

const formatCurrency = (value: number) => `${Math.round(value / 100000000).toLocaleString('ko-KR')}억`;
const statusLabels: Record<CrmOpportunity['status'], string> = { draft: '초안', qualified: '검증', proposal: '제안', won: '수주', lost: '실주', hold: '보류' };
const priorityLabels: Record<CrmOpportunity['priority'], string> = { high: '높음', medium: '보통', low: '낮음' };
const sortLabels: Record<CrmOpportunitySort, string> = { 'updated-desc': '최근 수정순', 'revenue-desc': '매출 높은순', 'margin-desc': '손익률 높은순' };

export async function OpportunityWorkspace({ query = {} }: { query?: Record<string, string | string[] | undefined> }) {
  const normalizedQuery = normalizeQuery(query);
  const data = await loadOpportunities(normalizedQuery);
  const representative = data.items[0];

  return (
    <main className="space-y-5">
      <section className="rounded-2xl border border-ssoo-content-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ssoo-secondary">CRM DEMO NORMALIZATION</p>
            <h1 className="mt-2 text-2xl font-bold text-ssoo-primary">영업기회 현황</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              외부 데모를 그대로 복사하지 않고 SSOO 카드·표·배지 문법으로 재구성한 1차 화면입니다. 견적, 계약 전환, DMS 연결, PMS 인계는 아직 구현된 기능처럼 노출하지 않습니다.
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> 런칭 경계</div>
            <p className="mt-1 text-xs leading-5">계정·권한·법인·조직 관리는 CRM 내부가 아니라 공용 Admin 영역입니다.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard icon={ClipboardList} label="영업기회" value={`${data.summary.totalCount}건`} caption="목록/검색/필터 1차 범위" />
        <MetricCard icon={CircleDollarSign} label="예상 매출" value={formatCurrency(data.summary.totalRevenue)} caption={`예상 원가 ${formatCurrency(data.summary.totalCost)}`} />
        <MetricCard icon={CheckCircle2} label="손익률" value={`${data.summary.grossMarginRate}%`} caption={`수주 ${data.summary.wonCount} · 제안 ${data.summary.proposalCount}`} />
        <MetricCard icon={ShieldCheck} label="경계 정합성" value="분리" caption="PMS/Admin 중복 구현 방지" />
      </section>

      <section className="rounded-2xl border border-ssoo-content-border bg-white p-4 shadow-sm">
        <form className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]" method="get">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-ssoo-primary">검색</span>
            <div className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3">
              <Search className="h-4 w-4 text-ssoo-secondary" />
              <input name="search" defaultValue={normalizedQuery.search} placeholder="고객, 건명, 담당자, 사업구분" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
            </div>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-ssoo-primary">상태</span>
            <select name="status" defaultValue={normalizedQuery.status} className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none">
              <option value="all">전체</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-ssoo-primary">정렬</span>
            <select name="sort" defaultValue={normalizedQuery.sort} className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none">
              {Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" className="h-10 rounded-xl bg-ssoo-primary px-4 text-sm font-semibold text-white">적용</button>
            <Link href="/" className="flex h-10 items-center rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-600">초기화</Link>
          </div>
        </form>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
          <span className="rounded-full bg-ssoo-sitemap-bg px-3 py-1 text-ssoo-primary">표시 {data.summary.filteredCount} / 전체 {data.summary.totalCount}</span>
          <span className="rounded-full bg-gray-100 px-3 py-1">검색: {data.summary.activeFilters.search || '없음'}</span>
          <span className="rounded-full bg-gray-100 px-3 py-1">상태: {data.summary.activeFilters.status === 'all' ? '전체' : statusLabels[data.summary.activeFilters.status as CrmOpportunityStatus]}</span>
          <span className="rounded-full bg-gray-100 px-3 py-1">정렬: {sortLabels[data.summary.activeFilters.sort]}</span>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
        <div className="overflow-hidden rounded-2xl border border-ssoo-content-border bg-white shadow-sm">
          <div className="border-b border-ssoo-content-border px-5 py-4">
            <h2 className="text-lg font-semibold text-ssoo-primary">영업기회 목록</h2>
            <p className="text-sm text-gray-500">검색/필터/정렬은 API 쿼리로 닫고, 등록/수정은 우측 1차 입력 기준을 따라 다음 slice에서 저장 API로 확장합니다.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-ssoo-sitemap-bg text-left text-xs uppercase tracking-wide text-ssoo-primary">
                <tr>
                  <th className="px-5 py-3">고객/건명</th><th className="px-5 py-3">상태</th><th className="px-5 py-3">담당</th><th className="px-5 py-3 text-right">매출</th><th className="px-5 py-3 text-right">손익률</th><th className="px-5 py-3">다음 행동</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((item) => <OpportunityRow key={item.id} item={item} />)}
                {data.items.length === 0 ? <tr><td className="px-5 py-8 text-center text-gray-500" colSpan={6}>CRM API 또는 샘플 데이터가 아직 연결되지 않았습니다.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-ssoo-content-border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-ssoo-primary">대표 상세/등록 기준</h2>
            {representative ? (
              <div className="mt-4 space-y-4">
                <div><p className="text-xs text-gray-500">고객</p><p className="font-semibold">{representative.customerName}</p></div>
                <div><p className="text-xs text-gray-500">건명</p><p className="font-semibold">{representative.opportunityName}</p></div>
                <div className="grid grid-cols-2 gap-3">
                  <Info label="차수" value={`${representative.version}차`} />
                  <Info label="확정" value={representative.confirmed ? '잠금' : '검토 중'} />
                  <Info label="매출" value={formatCurrency(representative.revenueTotal)} />
                  <Info label="원가" value={formatCurrency(representative.costTotal)} />
                </div>
                <div className="rounded-xl bg-ssoo-sitemap-bg p-3 text-sm text-ssoo-primary">{representative.nextAction}</div>
                <div className="space-y-3 rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ssoo-primary">등록/수정 1차 입력 기준</p>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">저장 API 다음 slice</span>
                  </div>
                  <div className="grid gap-2 text-xs text-gray-500">
                    <DraftField label="고객" value={representative.customerName} />
                    <DraftField label="건명" value={representative.opportunityName} />
                    <div className="grid grid-cols-2 gap-2">
                      <DraftField label="매출 상품/용역" value={formatCurrency(representative.revenueTotal)} />
                      <DraftField label="원가 내부/외부" value={formatCurrency(representative.costTotal)} />
                    </div>
                  </div>
                  <p className="text-xs leading-5 text-gray-500">입력 항목은 원천 데모의 매출/원가 그리드 구조를 보존하되, 현재 화면에서는 허위 저장 버튼 없이 확정/잠금 기준만 먼저 노출합니다.</p>
                </div>
              </div>
            ) : <p className="mt-4 text-sm text-gray-500">상세 샘플이 없습니다.</p>}
          </div>

          <div className="rounded-2xl border border-ssoo-content-border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-ssoo-primary">미구현 연결</h2>
            <div className="mt-3 space-y-2">
              {data.summary.unimplementedIntegrations.map((label) => (
                <div key={label} className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600">
                  <span>{label}</span><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">다음 구현 예정</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-gray-500">{data.summary.boundaryNotice}</p>
          </div>
        </aside>
      </section>
    </main>
  );
}

function MetricCard({ icon: Icon, label, value, caption }: { icon: typeof ClipboardList; label: string; value: string; caption: string }) {
  return <div className="rounded-2xl border border-ssoo-content-border bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm text-gray-500">{label}</span><Icon className="h-5 w-5 text-ssoo-secondary" /></div><div className="mt-3 text-2xl font-bold text-ssoo-primary">{value}</div><div className="mt-1 text-xs text-gray-500">{caption}</div></div>;
}
function OpportunityRow({ item }: { item: CrmOpportunity }) {
  return <tr className="hover:bg-ssoo-sitemap-bg/60"><td className="px-5 py-4"><div className="font-semibold text-ssoo-primary">{item.customerName}</div><div className="mt-1 text-gray-600">{item.opportunityName}</div><div className="mt-1 text-xs text-gray-400">{item.businessType} · {item.industryLine}</div></td><td className="px-5 py-4"><span className="rounded-full bg-ssoo-sitemap-bg px-2.5 py-1 text-xs font-semibold text-ssoo-primary">{statusLabels[item.status]}</span><div className="mt-2 text-xs text-gray-500">우선순위 {priorityLabels[item.priority]}</div></td><td className="px-5 py-4 text-gray-700">{item.ownerName}</td><td className="px-5 py-4 text-right font-semibold">{formatCurrency(item.revenueTotal)}</td><td className="px-5 py-4 text-right text-ssoo-secondary">{item.marginRate}%</td><td className="px-5 py-4"><div className="flex items-start gap-2 text-gray-600"><FileClock className="mt-0.5 h-4 w-4 shrink-0 text-ssoo-secondary" /><span>{item.nextAction}</span></div></td></tr>;
}
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-gray-200 px-3 py-2"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 font-semibold text-ssoo-primary">{value}</p></div>; }
function DraftField({ label, value }: { label: string; value: string }) { return <label className="space-y-1"><span>{label}</span><input value={value} readOnly className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-ssoo-primary outline-none" /></label>; }
