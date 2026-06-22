'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  CommonSearchBadge,
  CommonSearchBlockedSourceReason,
  CommonSearchBlockedSourceSummary,
  CommonSearchEntityFacet,
  CommonSearchEntityType,
  CommonSearchPermissionState,
  CommonSearchRanker,
  CommonSearchRequest,
  CommonSearchResponse,
  CommonSearchResult,
  CommonSearchSourceApp,
  CommonSearchSourceFacet,
  CommonSearchTarget,
} from '@ssoo/types/common';
import { Button } from '@ssoo/web-ui';
import { cn } from './cn';
import {
  SsooAiSearchPage,
  type SsooAiSearchResponse,
} from './ai-search/AiSearchPage';
import type {
  SsooAiSearchBlockedSourceSummary,
  SsooAiSearchResultItem,
} from './ai-search/searchPageUtils';
import { SsooSourceFilterBar, type SsooSourceFilterItem } from './source-filter-bar';
import type { SsooAiSearchResultRenderState } from './ai-search/SearchResultsPanel';

export type SsooGlobalSearchSourceApp = CommonSearchSourceApp;
export type SsooGlobalSearchEntityType = CommonSearchEntityType;
export type SsooGlobalSearchPermissionState = CommonSearchPermissionState;
export type SsooGlobalSearchRanker = CommonSearchRanker;

export const SSOO_GLOBAL_SEARCH_APP_PATH = '/ssoo/search';
export const SSOO_GLOBAL_SEARCH_PLACEHOLDER = '무엇이든 찾아드릴게요! 무엇이 필요하신가요?';

export type SsooGlobalSearchBadge = CommonSearchBadge;
export type SsooGlobalSearchTarget = CommonSearchTarget;
export type SsooGlobalSearchResult = CommonSearchResult;
export type SsooGlobalSearchSourceFacet = CommonSearchSourceFacet;
export type SsooGlobalSearchEntityFacet = CommonSearchEntityFacet;
export type SsooGlobalSearchBlockedSourceReason = CommonSearchBlockedSourceReason;
export type SsooGlobalSearchBlockedSourceSummary = CommonSearchBlockedSourceSummary;
export type SsooGlobalSearchResponse = CommonSearchResponse;
export type SsooGlobalSearchRequest = CommonSearchRequest;

export interface SsooGlobalSearchResultRenderState {
  id: string;
  index: number;
  highlighted: boolean;
  highlightTerms: string[];
  onOpen: () => void;
}

export interface SsooGlobalSearchOpenContext {
  sourceQuery: string;
}

export interface SsooGlobalSearchSourceFilterContext {
  sourceQuery: string;
}

export interface SsooGlobalSearchSourceQueryContext {
  sourceApp?: SsooGlobalSearchSourceApp;
}

export interface SsooGlobalSearchAttachContext {
  sourceQuery: string;
  filterQuery: string;
  matchedResultIndices: number[];
  attachFilteredOnly: boolean;
}

export interface SsooGlobalSearchHistoryItem {
  id: string;
  title: string;
  updatedAt: string;
  active?: boolean;
}

export interface SsooGlobalSearchPageProps {
  initialQuery?: string;
  initialSourceApp?: SsooGlobalSearchSourceApp;
  search: (request: SsooGlobalSearchRequest) => Promise<SsooGlobalSearchResponse>;
  onOpenResult?: (result: SsooGlobalSearchResult, context: SsooGlobalSearchOpenContext) => void | Promise<void>;
  onSourceFilterChange?: (
    sourceApp: SsooGlobalSearchSourceApp | undefined,
    context: SsooGlobalSearchSourceFilterContext,
  ) => void;
  onSourceQueryChange?: (query: string, context: SsooGlobalSearchSourceQueryContext) => void;
  onAttachSearchResultsToAssistant?: (
    results: SsooGlobalSearchResult[],
    context: SsooGlobalSearchAttachContext,
  ) => void | Promise<void>;
  renderResult?: (result: SsooGlobalSearchResult, state: SsooGlobalSearchResultRenderState) => ReactNode;
  title?: ReactNode;
  description?: string;
  history?: SsooGlobalSearchHistoryItem[];
  suggestions?: string[];
  frequentSearches?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
  onHistorySelect?: (item: SsooGlobalSearchHistoryItem) => void;
  canUseSearch?: boolean;
  canUseAssistant?: boolean;
  noPermissionMessage?: string;
  compactMode?: boolean;
  sidecarMode?: 'search' | 'hidden';
  breadcrumbLastSegmentLabel?: string;
}

interface SsooGlobalSearchAiResult extends SsooAiSearchResultItem {
  raw: SsooGlobalSearchResult;
}

const SOURCE_LABELS: Record<SsooGlobalSearchSourceApp, string> = {
  admin: 'ADMIN',
  crm: 'CRM',
  pms: 'PMS',
  dms: 'DMS',
  sns: 'SNS',
};

const ENTITY_LABELS: Record<SsooGlobalSearchEntityType, string> = {
  document: '문서',
  person: '사람',
  post: '게시물',
  project: '프로젝트',
  customer: '고객',
  opportunity: '영업기회',
  user: '사용자',
  setting: '설정',
  menu: '메뉴',
  unknown: '결과',
};

function getBadgeToneClass(tone: SsooGlobalSearchBadge['tone'] = 'neutral'): string {
  if (tone === 'primary') return 'border-ssoo-primary/20 bg-ssoo-primary/10 text-ssoo-primary';
  if (tone === 'success') return 'border-green-200 bg-green-50 text-green-700';
  if (tone === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (tone === 'danger') return 'border-red-200 bg-red-50 text-red-700';
  if (tone === 'muted') return 'border-transparent bg-transparent text-ssoo-primary/55';
  return 'border-ssoo-content-border bg-white text-ssoo-primary/75';
}

function getSourceFilters(
  response: SsooGlobalSearchResponse | null,
  selectedSourceApp?: SsooGlobalSearchSourceApp,
): SsooSourceFilterItem[] {
  const sources = response?.facets.sources ?? [];
  const total = response?.total ?? sources.reduce((sum, item) => sum + item.count, 0);

  return [
    {
      key: 'all',
      label: '전체',
      badge: total,
      selected: !selectedSourceApp,
    },
    ...sources.map((source) => ({
      key: source.sourceApp,
      label: source.label || SOURCE_LABELS[source.sourceApp],
      badge: source.count,
      selected: selectedSourceApp === source.sourceApp,
    })),
  ];
}

function getMetadataEntries(result: SsooGlobalSearchResult): Array<[string, string]> {
  return Object.entries(result.metadata ?? {})
    .filter(([, value]) => value.trim().length > 0)
    .slice(0, 3);
}

function getResultPermissionLabel(result: SsooGlobalSearchResult): string {
  if (result.permissionState === 'readable') {
    return result.entityType === 'document' ? '문서 열기' : '열기';
  }
  if (result.permissionState === 'requestable') return '권한 요청 가능';
  if (result.permissionState === 'blocked') return '열람 불가';
  return '확인';
}

function toAiSearchResult(result: SsooGlobalSearchResult): SsooGlobalSearchAiResult {
  return {
    id: result.id,
    title: result.title,
    excerpt: result.excerpt ?? result.summary ?? result.snippets?.[0] ?? result.matchReason ?? '',
    path: result.target.path,
    score: result.score,
    summary: result.summary,
    summarySource: result.summarySource,
    snippets: result.snippets,
    totalSnippetCount: result.totalSnippetCount,
    owner: result.ownerLabel,
    isReadable: result.permissionState === 'readable',
    canRequestRead: result.permissionState === 'requestable',
    readRequest: result.readRequest,
    raw: result,
  };
}

function toAiSearchResponse(response: SsooGlobalSearchResponse): SsooAiSearchResponse<SsooGlobalSearchAiResult> {
  return {
    query: response.query,
    results: response.results.map(toAiSearchResult),
    total: response.total,
    blockedSources: response.blockedSources as SsooAiSearchBlockedSourceSummary | undefined,
    raw: response,
  };
}

function getGlobalResponse(response: SsooAiSearchResponse<SsooGlobalSearchAiResult> | null) {
  return (response?.raw ?? null) as SsooGlobalSearchResponse | null;
}

export function SsooGlobalSearchResultCard({
  id,
  result,
  highlighted = false,
  highlightTerms: _highlightTerms = [],
  onOpen,
}: {
  id?: string;
  result: SsooGlobalSearchResult;
  highlighted?: boolean;
  highlightTerms?: string[];
  onOpen?: () => void;
}) {
  const metadataEntries = getMetadataEntries(result);

  return (
    <Button
      id={id}
      variant="plain"
      size="plain"
      type="button"
      onClick={onOpen}
      className={cn(
        'block w-full min-w-0 overflow-hidden whitespace-normal rounded-lg border border-ssoo-content-border bg-white p-4 text-left transition-colors hover:bg-ssoo-content-bg/40',
        'items-stretch justify-start gap-0',
        highlighted && 'bg-ssoo-content-bg'
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-full border border-ssoo-content-border bg-ssoo-content-bg px-1.5 py-0 text-badge text-ssoo-primary/75">
          {SOURCE_LABELS[result.sourceApp]}
        </span>
        <span className="inline-flex rounded-full border border-ssoo-content-border bg-white px-1.5 py-0 text-badge text-ssoo-primary/75">
          {ENTITY_LABELS[result.entityType]}
        </span>
        {result.badges?.map((badge) => (
          <span
            key={`${result.id}-${badge.label}`}
            className={cn('inline-flex rounded-full border px-1.5 py-0 text-badge', getBadgeToneClass(badge.tone))}
          >
            {badge.label}
          </span>
        ))}
      </div>
      <h3 className="mt-2 text-title-card text-ssoo-primary">{result.title}</h3>
      <p className="mt-1.5 line-clamp-2 text-body-sm text-ssoo-primary/80">
        {result.summary ?? result.snippets?.[0] ?? result.matchReason ?? '표시할 요약이 없습니다.'}
      </p>
      {metadataEntries.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {metadataEntries.map(([key, value]) => (
            <span key={key} className="rounded bg-ssoo-content-bg px-1.5 py-0.5 text-caption text-ssoo-primary/65">
              {key}: {value}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-3 text-ssoo-primary/70">
        <span className="min-w-0 truncate text-caption">{result.target.path}</span>
        <span className="shrink-0 rounded-full bg-ssoo-content-bg px-2 py-0.5 text-caption text-ssoo-primary">
          {getResultPermissionLabel(result)}
        </span>
      </div>
    </Button>
  );
}

export function SsooGlobalSearchPage({
  initialQuery,
  initialSourceApp,
  search,
  onOpenResult,
  onSourceFilterChange,
  onSourceQueryChange,
  onAttachSearchResultsToAssistant,
  renderResult,
  description,
  history = [],
  suggestions = [],
  frequentSearches = [],
  canUseSearch,
  canUseAssistant,
  noPermissionMessage,
  compactMode,
  sidecarMode,
  breadcrumbLastSegmentLabel,
}: SsooGlobalSearchPageProps) {
  const [selectedSourceApp, setSelectedSourceApp] = useState<SsooGlobalSearchSourceApp | undefined>(initialSourceApp);

  useEffect(() => {
    setSelectedSourceApp(initialSourceApp);
  }, [initialSourceApp]);

  const handleSearch = useCallback(async (query: string) => {
    const request: SsooGlobalSearchRequest = { query };
    if (selectedSourceApp) {
      request.sourceApp = selectedSourceApp;
    }

    const response = await search(request);
    return toAiSearchResponse(response);
  }, [search, selectedSourceApp]);

  const handleOpenSearchResult = useCallback((
    item: SsooGlobalSearchAiResult,
    context: { sourceQuery: string },
  ) => {
    void onOpenResult?.(item.raw, { sourceQuery: context.sourceQuery });
  }, [onOpenResult]);

  const handleSourceQueryChange = useCallback((query: string) => {
    onSourceQueryChange?.(query, selectedSourceApp ? { sourceApp: selectedSourceApp } : {});
  }, [onSourceQueryChange, selectedSourceApp]);

  const handleAttachSearchResultsToAssistant = useCallback((
    items: SsooGlobalSearchAiResult[],
    context: SsooGlobalSearchAttachContext,
  ) => {
    void onAttachSearchResultsToAssistant?.(items.map((item) => item.raw), context);
  }, [onAttachSearchResultsToAssistant]);

  const handleRenderResult = useCallback((item: SsooGlobalSearchAiResult, state: SsooAiSearchResultRenderState) => {
    const globalState: SsooGlobalSearchResultRenderState = {
      id: state.id,
      index: state.index,
      highlighted: state.highlighted,
      highlightTerms: state.highlightTerms,
      onOpen: state.onOpen,
    };

    return renderResult ? renderResult(item.raw, globalState) : (
      <SsooGlobalSearchResultCard
        id={state.id}
        result={item.raw}
        highlighted={state.highlighted}
        highlightTerms={state.highlightTerms}
        onOpen={state.onOpen}
      />
    );
  }, [renderResult]);

  const normalizedHistory = useMemo(() => history.map((item) => ({
    id: item.id,
    title: item.title,
    updatedAt: item.updatedAt,
    active: item.active,
  })), [history]);

  return (
    <SsooAiSearchPage
      filePath="ssoo/search"
      description={description}
      initialQuery={initialQuery}
      search={handleSearch}
      searchKey={selectedSourceApp ?? 'all'}
      onSourceQueryChange={handleSourceQueryChange}
      onOpenSearchResult={handleOpenSearchResult}
      onAttachSearchResultsToAssistant={onAttachSearchResultsToAssistant ? handleAttachSearchResultsToAssistant : undefined}
      renderResult={handleRenderResult}
      resultTopSlot={({ hasSearched, response, sourceQuery }) => {
        const globalResponse = getGlobalResponse(response);
        if (!hasSearched && !globalResponse) return null;
        const filters = getSourceFilters(globalResponse, selectedSourceApp);
        return (
          <SsooSourceFilterBar
            filters={filters}
            onSelect={(filter) => {
              const nextSourceApp = filter.key === 'all' ? undefined : filter.key as SsooGlobalSearchSourceApp;
              setSelectedSourceApp(nextSourceApp);
              onSourceFilterChange?.(nextSourceApp, { sourceQuery });
            }}
          />
        );
      }}
      history={normalizedHistory}
      suggestions={suggestions}
      frequentSearches={frequentSearches}
      canUseSearch={canUseSearch}
      canUseAssistant={canUseAssistant}
      noPermissionMessage={noPermissionMessage}
      compactMode={compactMode}
      sidecarMode={sidecarMode}
      breadcrumbLastSegmentLabel={breadcrumbLastSegmentLabel}
      blockedSourceNoun="콘텐츠"
    />
  );
}
