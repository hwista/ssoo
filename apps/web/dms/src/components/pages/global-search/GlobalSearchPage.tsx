'use client';

import { useCallback, useMemo } from 'react';
import { useCommonGlobalSearchAdapter } from '@ssoo/web-auth';
import {
  SSOO_GLOBAL_SEARCH_APP_PATH,
  SsooGlobalSearchPage,
  SsooGlobalSearchResultCard,
  buildHistoryItems,
  getTopSearchKeywords,
  getSsooGlobalSearchTitle,
  type SsooGlobalSearchRequest,
  type SsooGlobalSearchResponse,
  type SsooGlobalSearchResult,
  type SsooGlobalSearchResultRenderState,
  type SsooGlobalSearchSourceApp,
} from '@ssoo/web-shell';
import { toast } from '@/lib/toast';
import { useAiSearchInsightsQuery, useOpenDocumentTab, useOpenTabWithConfirm } from '@/hooks';
import {
  useAccessStore,
  useAssistantContextStore,
  useAssistantPanelStore,
  useConfirmStore,
  useSidebarStore,
  useTabStore,
} from '@/stores';
import { useTabInstanceId } from '@/components/layout/tab-instance/TabInstanceContext';
import {
  SearchResultCard,
  type SearchResultCardData,
} from '@/components/common/assistant/_components/ResultCard';
import { ASSISTANT_FOCUS_INPUT_EVENT } from '@/lib/constants/assistant';

function getDmsDocumentPath(result: SsooGlobalSearchResult): string {
  const metadataPath = result.metadata?.path?.trim();
  if (metadataPath) return metadataPath;

  if (result.target.path.startsWith('/doc/')) {
    try {
      return decodeURIComponent(result.target.path.slice('/doc/'.length));
    } catch {
      return result.target.path.slice('/doc/'.length);
    }
  }

  return result.target.path;
}

function getDmsVisibilityScope(result: SsooGlobalSearchResult) {
  const scope = result.metadata?.visibilityScope;
  if (scope === 'public' || scope === 'organization' || scope === 'self' || scope === 'legacy') {
    return scope;
  }
  return 'legacy';
}

function createGlobalSearchPath(query: string, sourceApp?: SsooGlobalSearchSourceApp): string {
  const params = new URLSearchParams();
  const trimmedQuery = query.trim();
  if (trimmedQuery) params.set('q', trimmedQuery);
  if (sourceApp) params.set('sourceApp', sourceApp);
  const queryString = params.toString();
  return queryString ? `${SSOO_GLOBAL_SEARCH_APP_PATH}?${queryString}` : SSOO_GLOBAL_SEARCH_APP_PATH;
}

export function DmsGlobalSearchPage() {
  const tabId = useTabInstanceId();
  const tabPath = useTabStore((state) => state.tabs.find((tab) => tab.id === tabId)?.path);
  const updateTab = useTabStore((state) => state.updateTab);
  const canUseSearch = useAccessStore((state) => state.snapshot?.features.canUseSearch ?? false);
  const canUseAssistant = useAccessStore((state) => state.snapshot?.features.canUseAssistant ?? false);
  const isCompactMode = useSidebarStore((state) => state.isCompactMode);
  const confirm = useConfirmStore((state) => state.confirm);
  const setReferences = useAssistantContextStore((state) => state.setReferences);
  const openPanel = useAssistantPanelStore((state) => state.openPanel);
  const openTabWithConfirm = useOpenTabWithConfirm();
  const openDocumentTab = useOpenDocumentTab();
  const searchInsightsQuery = useAiSearchInsightsQuery({
    enabled: canUseSearch,
    historyLimit: 50,
    popularLimit: 5,
  });
  const refetchSearchInsights = searchInsightsQuery.refetch;
  const dbSearchInsights = searchInsightsQuery.data?.success ? searchInsightsQuery.data.data : undefined;
  const historyItems = useMemo(
    () => buildHistoryItems(dbSearchInsights?.history ?? [], ''),
    [dbSearchInsights?.history],
  );
  const topSearchKeywords = useMemo(
    () => getTopSearchKeywords(dbSearchInsights?.popular ?? []),
    [dbSearchInsights?.popular],
  );
  const frequentSearchKeywords = useMemo(
    () => [...(dbSearchInsights?.history ?? [])]
      .sort((a, b) => b.count - a.count || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .map((item) => item.query),
    [dbSearchInsights?.history],
  );
  const updateSearchTab = useCallback((
    query: string,
    sourceApp?: SsooGlobalSearchSourceApp,
  ) => {
    if (!tabId || !query.trim()) return;
    const nextPath = createGlobalSearchPath(query, sourceApp);
    const nextTitle = getSsooGlobalSearchTitle(query);
    updateTab(tabId, {
      title: nextTitle,
      path: nextPath,
      icon: 'Search',
    });
  }, [tabId, updateTab]);

  const {
    initialQuery,
    initialSourceApp,
    openResult,
    search,
  } = useCommonGlobalSearchAdapter({
    currentApp: 'dms',
    currentPath: tabPath,
    openCurrentAppResult: async (result, context) => {
      if (result.entityType === 'document') {
        await openDocumentTab({
          path: getDmsDocumentPath(result),
          title: result.title,
          activate: true,
          highlightQuery: context.sourceQuery.trim() || undefined,
        });
        return;
      }

      await openTabWithConfirm({
        id: `dms-search-${result.id}`,
        title: result.title,
        path: result.target.path,
        icon: 'FileText',
        closable: true,
        activate: true,
      });
    },
  });

  const handleSearch = useCallback(async (
    request: SsooGlobalSearchRequest,
  ): Promise<SsooGlobalSearchResponse> => {
    const response = await search(request);
    if (!request.sourceApp || request.sourceApp === 'dms') {
      void refetchSearchInsights();
    }
    return response;
  }, [refetchSearchInsights, search]);

  const handleAttachSearchResultsToAssistant = useCallback(async (
    results: SsooGlobalSearchResult[],
  ) => {
    if (!canUseAssistant) {
      toast.error('AI 어시스턴트를 사용할 권한이 없습니다.');
      return;
    }

    const candidates = results
      .filter((result) => result.sourceApp === 'dms' && result.entityType === 'document')
      .filter((result) => result.permissionState === 'readable')
      .map((result) => {
        const path = getDmsDocumentPath(result).replace(/^\/+/, '');
        return {
          path,
          title: result.title || path.split('/').pop() || path,
        };
      })
      .filter((item) => item.path.trim().length > 0 && item.path !== '-');

    if (candidates.length === 0) {
      toast.error('첨부 가능한 검색 결과 문서가 없습니다.');
      return;
    }

    if (candidates.length > 20) {
      const confirmed = await confirm({
        title: '검색 결과 전체 첨부',
        description: `현재 ${candidates.length}개 문서를 첨부하면 응답 품질 또는 속도가 저하될 수 있습니다. 계속 진행할까요?`,
        confirmText: '계속',
        cancelText: '취소',
      });
      if (!confirmed) return;
    }

    setReferences(candidates);
    openPanel();
    window.dispatchEvent(new Event(ASSISTANT_FOCUS_INPUT_EVENT));
    toast.success(`${candidates.length}개 문서를 첨부했습니다.`);
  }, [canUseAssistant, confirm, openPanel, setReferences]);

  const renderResult = (result: SsooGlobalSearchResult, state: SsooGlobalSearchResultRenderState) => {
    if (result.sourceApp !== 'dms' || result.entityType !== 'document') {
      return (
        <SsooGlobalSearchResultCard
          id={state.id}
          result={result}
          highlighted={state.highlighted}
          highlightTerms={state.highlightTerms}
          onOpen={() => {
            state.onOpen();
          }}
        />
      );
    }

    return (
      <SearchResultCard
        id={state.id}
        result={{
          id: result.id,
          title: result.title,
          excerpt: result.excerpt ?? result.summary ?? result.snippets?.[0] ?? '',
          path: getDmsDocumentPath(result),
          summary: result.summary,
          summarySource: result.summarySource,
          snippets: result.snippets,
          totalSnippetCount: result.totalSnippetCount,
          owner: result.ownerLabel,
          visibilityScope: getDmsVisibilityScope(result),
          isReadable: result.permissionState === 'readable',
          canRequestRead: result.permissionState === 'requestable',
          readRequest: result.readRequest as SearchResultCardData['readRequest'],
        }}
        highlighted={state.highlighted}
        highlightTerms={state.highlightTerms}
        onClick={state.onOpen}
      />
    );
  };

  return (
    <SsooGlobalSearchPage
      initialQuery={initialQuery}
      initialSourceApp={initialSourceApp}
      search={handleSearch}
      onOpenResult={openResult}
      onSourceQueryChange={(query, context) => {
        updateSearchTab(query, context.sourceApp);
      }}
      onSourceFilterChange={(sourceApp, context) => {
        updateSearchTab(context.sourceQuery, sourceApp);
      }}
      canUseSearch={canUseSearch}
      canUseAssistant={canUseAssistant}
      noPermissionMessage="AI 검색을 사용할 권한이 없습니다."
      onAttachSearchResultsToAssistant={handleAttachSearchResultsToAssistant}
      history={historyItems}
      suggestions={topSearchKeywords}
      frequentSearches={frequentSearchKeywords}
      compactMode={isCompactMode}
      breadcrumbLastSegmentLabel="AI 검색"
      description="문서 기반 검색 결과를 확인하세요."
      renderResult={renderResult}
    />
  );
}
