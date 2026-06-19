'use client';

import { useCallback, useMemo } from 'react';
import {
  SsooAiSearchPage,
  buildHistoryItems,
  getTopSearchKeywords,
  type SsooAiSearchResultItem,
} from '@ssoo/web-shell';
import { toast } from '@/lib/toast';
import {
  useAccessStore,
  useAssistantContextStore,
  useAssistantPanelStore,
  useConfirmStore,
  useSidebarStore,
  useTabStore,
} from '@/stores';
import { useTabInstanceId } from '@/components/layout/tab-instance/TabInstanceContext';
import { useAiSearchInsightsQuery, useOpenDocumentTab } from '@/hooks';
import { aiApi } from '@/lib/api/endpoints/ai';
import { getErrorMessage } from '@/lib/api/core';
import { ASSISTANT_FOCUS_INPUT_EVENT } from '@/lib/constants/assistant';
import {
  SearchResultCard,
  type SearchResultCardData,
} from '@/components/common/assistant/_components/ResultCard';
import { getQueryFromTabPath } from './utils/queryPath';

export function AiSearchPage() {
  const tabId = useTabInstanceId();
  const { tabs, updateTab } = useTabStore();
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === tabId), [tabs, tabId]);
  const initialQuery = useMemo(() => getQueryFromTabPath(activeTab?.path), [activeTab?.path]);
  const confirm = useConfirmStore((state) => state.confirm);
  const setReferences = useAssistantContextStore((state) => state.setReferences);
  const openPanel = useAssistantPanelStore((state) => state.openPanel);
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const isCompactMode = useSidebarStore((state) => state.isCompactMode);
  const canUseSearch = accessSnapshot?.features.canUseSearch ?? false;
  const canUseAssistant = accessSnapshot?.features.canUseAssistant ?? false;
  const openDocumentTab = useOpenDocumentTab();
  const searchInsightsQuery = useAiSearchInsightsQuery({
    enabled: canUseSearch,
    historyLimit: 50,
    popularLimit: 5,
  });

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

  const handleSearch = useCallback(async (query: string) => {
    const response = await aiApi.search(query, { contextMode: 'deep' });
    if (response.success && response.data) {
      void searchInsightsQuery.refetch();
      return {
        query,
        results: response.data.results,
        total: response.data.results.length,
        blockedSources: response.data.blockedSources,
        raw: response.data,
      };
    }

    throw new Error(getErrorMessage(response));
  }, [searchInsightsQuery]);

  const handleSourceQueryChange = useCallback((query: string) => {
    if (!tabId || !query.trim()) return;
    updateTab(tabId, {
      title: `AI 검색: ${query.slice(0, 20)}...`,
      path: `/ai/search?q=${encodeURIComponent(query)}`,
      icon: 'Bot',
    });
  }, [tabId, updateTab]);

  const handleAttachSearchResultsToAssistant = useCallback(async (items: SsooAiSearchResultItem[]) => {
    if (!canUseAssistant) {
      toast.error('AI 어시스턴트를 사용할 권한이 없습니다.');
      return;
    }

    const candidates = items
      .filter((item) => item.isReadable)
      .filter((item) => item.path.trim().length > 0 && item.path !== '-')
      .map((item) => ({
        path: item.path.replace(/^\/+/, ''),
        title: item.title || item.path.split('/').pop() || item.path,
      }));

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

  const handleOpenSearchResult = useCallback(async (item: SsooAiSearchResultItem, context: { sourceQuery: string }) => {
    if (!item.path || item.path === '-') return;
    await openDocumentTab({
      path: item.path,
      title: item.title,
      activate: true,
      highlightQuery: context.sourceQuery.trim() || undefined,
    });
  }, [openDocumentTab]);

  return (
    <SsooAiSearchPage
      filePath="ai/search"
      description="문서 기반 검색 결과를 확인하세요."
      initialQuery={initialQuery}
      canUseSearch={canUseSearch}
      canUseAssistant={canUseAssistant}
      noPermissionMessage="AI 검색을 사용할 권한이 없습니다."
      search={handleSearch}
      onSourceQueryChange={handleSourceQueryChange}
      onAttachSearchResultsToAssistant={handleAttachSearchResultsToAssistant}
      onOpenSearchResult={handleOpenSearchResult}
      history={historyItems}
      suggestions={topSearchKeywords}
      frequentSearches={frequentSearchKeywords}
      compactMode={isCompactMode}
      renderResult={(item, state) => (
        <SearchResultCard
          id={state.id}
          result={{
            id: item.id,
            title: item.title,
            excerpt: item.excerpt,
            path: item.path,
            summary: item.summary,
            summarySource: item.summarySource,
            snippets: item.snippets,
            totalSnippetCount: item.totalSnippetCount,
            owner: item.owner,
            visibilityScope: item.visibilityScope,
            isReadable: item.isReadable,
            canRequestRead: item.canRequestRead,
            readRequest: item.readRequest as SearchResultCardData['readRequest'],
          }}
          highlighted={state.highlighted}
          highlightTerms={state.highlightTerms}
          onClick={state.onOpen}
        />
      )}
    />
  );
}
