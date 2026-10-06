'use client';

import { SsooErrorPanel } from '@ssoo/web-shell';
import { useCallback, useMemo } from 'react';
import {
  Activity,
  Clock3,
  FileClock,
  ListTodo,
  ShieldAlert,
} from 'lucide-react';
import type {
  DmsHomeActionItem,
  DmsHomeDocumentItem,
  DmsHomeOperationalExceptionItem,
} from '@ssoo/types/dms';
import { Card, CardContent, Skeleton } from '@ssoo/web-ui';
import { useOpenDocumentTab, useOpenTabWithConfirm } from '@/hooks';
import { useHomeSummary } from '@/hooks/queries/useHomeSummary';
import { GLOBAL_SEARCH_PATH } from '@/lib/constants/routes';
import { resolveDocPath } from '@/lib/utils/linkUtils';
import { useAccessStore, useFileStore, useTabStore, HOME_TAB } from '@/stores';
import { getSettingsTabOptions } from '@/components/pages/settings/_utils/settingsNavigation';
import { QuickAccessSection } from './_components/QuickAccessSection';
import { DocumentSection } from './_components/DocumentSection';
import { AttentionSection } from './_components/AttentionSection';
import { OperationsSection } from './_components/OperationsSection';
import { formatHomeDate } from './_components/homeFormatters';

function HomeLoading() {
  return (
    <div className="space-y-4" aria-label="홈 작업 요약을 불러오는 중">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const openTabWithConfirm = useOpenTabWithConfirm();
  const openDocumentTab = useOpenDocumentTab();
  const activeTabId = useTabStore((state) => state.activeTabId);
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const storedBookmarks = useFileStore((state) => state.bookmarks);
  const canWriteDocuments = accessSnapshot?.features.canWriteDocuments ?? false;
  const canUseSearch = accessSnapshot?.features.canUseSearch ?? false;
  const isActive = activeTabId === HOME_TAB.id;
  const homeQuery = useHomeSummary(isActive);

  const bookmarks = useMemo(() => storedBookmarks
    .map((bookmark) => ({ ...bookmark, path: resolveDocPath(bookmark.path) }))
    .filter((bookmark): bookmark is typeof bookmark & { path: string } => Boolean(bookmark.path))
    .slice(0, 4), [storedBookmarks]);

  const handleNewDocument = useCallback(() => {
    if (!canWriteDocuments) return;
    void openTabWithConfirm({
      id: `new-doc-${Date.now()}`,
      title: '새 문서',
      path: '/doc/new',
      icon: 'FileText',
      closable: true,
      activate: true,
    });
  }, [canWriteDocuments, openTabWithConfirm]);

  const handleSearch = useCallback(() => {
    if (!canUseSearch) return;
    void openTabWithConfirm({
      id: 'global-search',
      title: 'AI 검색',
      path: GLOBAL_SEARCH_PATH,
      icon: 'Bot',
      closable: true,
      activate: true,
    });
  }, [canUseSearch, openTabWithConfirm]);

  const handleOpenDocument = useCallback((document: Pick<DmsHomeDocumentItem, 'path' | 'title'>) => {
    void openDocumentTab({ path: document.path, title: document.title });
  }, [openDocumentTab]);

  const handleOpenSettings = useCallback((scope: 'personal' | 'system', sectionId: string) => {
    void openTabWithConfirm(getSettingsTabOptions(scope, sectionId));
  }, [openTabWithConfirm]);

  const handleOpenAction = useCallback((item: DmsHomeActionItem) => {
    if (item.target.kind === 'document' && item.target.path) {
      void openDocumentTab({ path: item.target.path, title: item.title });
      return;
    }
    if (item.target.kind === 'settings' && item.target.scope && item.target.sectionId) {
      handleOpenSettings(item.target.scope, item.target.sectionId);
    }
  }, [handleOpenSettings, openDocumentTab]);

  const handleOpenOperation = useCallback((item: DmsHomeOperationalExceptionItem) => {
    if (item.target.kind === 'document' && item.target.path) {
      void openDocumentTab({ path: item.target.path, title: item.title });
      return;
    }
    if (item.target.kind === 'settings' && item.target.scope && item.target.sectionId) {
      handleOpenSettings(item.target.scope, item.target.sectionId);
    }
  }, [handleOpenSettings, openDocumentTab]);

  const data = homeQuery.data;
  const metrics = data ? [
    { label: '이어서 작업', value: data.metrics.continueWorking, icon: FileClock },
    { label: data.hasPreviousVisit ? '방문 후 변경' : '최근 변경', value: data.metrics.changedSinceLastVisit, icon: Activity },
    { label: '내 처리함', value: data.metrics.pendingActions, icon: ListTodo },
    ...(data.features.canManageSettings
      ? [{ label: '운영 예외', value: data.metrics.operationalExceptions, icon: ShieldAlert }]
      : []),
  ] : [];

  return (
    <main className="min-h-full flex-1 overflow-auto bg-ssoo-content-bg/20 px-4 py-5 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-label-sm text-ssoo-primary/65">DMS HOME</p>
            <h1 className="text-title-section text-foreground">문서 업무 허브</h1>
            <p className="mt-2 max-w-2xl text-body-md text-muted-foreground">
              하던 일을 이어가고, 달라진 문서와 지금 처리할 항목을 한곳에서 확인하세요.
            </p>
          </div>
          {data && (
            <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {formatHomeDate(data.generatedAt)} 기준
            </p>
          )}
        </header>

        <QuickAccessSection
          canWriteDocuments={canWriteDocuments}
          canUseSearch={canUseSearch}
          bookmarks={bookmarks}
          onNewDocument={handleNewDocument}
          onSearch={handleSearch}
          onOpenBookmark={(bookmark) => handleOpenDocument(bookmark)}
        />

        {homeQuery.isLoading && !data ? (
          <HomeLoading />
        ) : homeQuery.isError && !data ? (
          <SsooErrorPanel error={homeQuery.error} title="홈 작업 요약을 불러오지 못했습니다"
            description="빠른 시작은 계속 사용할 수 있습니다. 요약 데이터만 다시 불러오세요." onRetry={() => homeQuery.refetch()} />
        ) : data ? (
          <>
            <section aria-labelledby="home-summary-heading">
              <h2 id="home-summary-heading" className="sr-only">업무 요약</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map(({ label, value, icon: Icon }) => (
                  <Card key={label} className="shadow-sm">
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="text-caption text-muted-foreground">{label}</p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
                      </div>
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ssoo-primary/10 text-ssoo-primary">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="min-w-0 space-y-4">
                <DocumentSection
                  title="이어서 작업"
                  description="계정에 저장된 실제 문서 열람 기록입니다."
                  emptyMessage="아직 열어본 문서가 없습니다. 검색이나 사이드바에서 문서를 열어보세요."
                  icon={FileClock}
                  section={data.sections.continueWorking}
                  timeSource="lastOpenedAt"
                  onOpen={handleOpenDocument}
                  onRetry={() => void homeQuery.refetch()}
                />
                <DocumentSection
                  title={data.hasPreviousVisit ? '마지막 방문 후 변경' : '최근 변경 문서'}
                  description={data.hasPreviousVisit
                    ? `${formatHomeDate(data.lastSeenAt)} 이후 갱신된 문서입니다.`
                    : '첫 방문 기준으로 최근 갱신된 문서를 보여드립니다.'}
                  emptyMessage={data.hasPreviousVisit
                    ? '마지막 방문 이후 변경된 문서가 없습니다.'
                    : '표시할 최근 변경 문서가 없습니다.'}
                  icon={Activity}
                  section={data.sections.changes}
                  timeSource="updatedAt"
                  onOpen={handleOpenDocument}
                  onRetry={() => void homeQuery.refetch()}
                />
              </div>
              <aside className="min-w-0 space-y-4" aria-label="처리 및 운영 상태">
                <AttentionSection
                  section={data.sections.actions}
                  onOpen={handleOpenAction}
                  onRetry={() => void homeQuery.refetch()}
                />
                {data.features.canManageSettings && (
                  <OperationsSection
                    section={data.sections.operations}
                    onOpen={handleOpenOperation}
                    onRetry={() => void homeQuery.refetch()}
                  />
                )}
              </aside>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
