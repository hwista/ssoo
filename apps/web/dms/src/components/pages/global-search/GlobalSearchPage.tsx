'use client';

import { useCommonGlobalSearchAdapter } from '@ssoo/web-auth';
import {
  SsooGlobalSearchPage,
  SsooGlobalSearchResultCard,
  type SsooGlobalSearchResult,
  type SsooGlobalSearchResultRenderState,
} from '@ssoo/web-shell';
import { useOpenTabWithConfirm } from '@/hooks';
import { useTabStore } from '@/stores';
import { useTabInstanceId } from '@/components/layout/tab-instance/TabInstanceContext';
import { SearchResultCard } from '@/components/common/assistant/_components/ResultCard';

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

export function DmsGlobalSearchPage() {
  const tabId = useTabInstanceId();
  const tabPath = useTabStore((state) => state.tabs.find((tab) => tab.id === tabId)?.path);
  const openTabWithConfirm = useOpenTabWithConfirm();
  const globalSearch = useCommonGlobalSearchAdapter({
    currentApp: 'dms',
    currentPath: tabPath,
    openCurrentAppResult: async (result) => {
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
          excerpt: result.summary ?? result.snippets?.[0] ?? '',
          path: getDmsDocumentPath(result),
          summary: result.summary,
          summarySource: result.badges?.some((badge) => badge.label === 'AI 요약') ? 'ai' : undefined,
          snippets: result.snippets,
          owner: result.ownerLabel,
          visibilityScope: getDmsVisibilityScope(result),
          isReadable: result.permissionState === 'readable',
          canRequestRead: result.permissionState === 'requestable',
        }}
        highlighted={state.highlighted}
        highlightTerms={state.highlightTerms}
        onClick={state.onOpen}
      />
    );
  };

  return (
    <SsooGlobalSearchPage
      initialQuery={globalSearch.initialQuery}
      search={globalSearch.search}
      onOpenResult={globalSearch.openResult}
      renderResult={renderResult}
    />
  );
}
