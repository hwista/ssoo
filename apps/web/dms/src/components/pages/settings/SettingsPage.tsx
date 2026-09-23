'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Check,
  RotateCcw,
} from 'lucide-react';
import {
  SsooSettingsPage,
  SsooSettingsBanner,
  SsooSettingsPendingSummary,
  type SsooPageHeaderAction,
  type SsooPageIndexRailItem,
} from '@ssoo/web-shell';
import { ErrorState, LoadingSpinner } from '@/components/common/StateDisplay';
import { templateApi } from '@/lib/api/endpoints/templates';
import { templateKeys, useTemplateList } from '@/hooks/queries/useTemplates';
import type { TemplateItem, TemplateKind, TemplateScope } from '@/types/template';
import { useAccessStore, useSettingsPageNavigationStore, useSettingsStore, useSidebarStore, useTabStore } from '@/stores';
import { useTabInstanceId } from '@/components/layout/tab-instance/TabInstanceContext';
import {
  SETTING_SECTIONS,
  SETTINGS_SECTION_GROUP_LABELS,
  getSettingSectionsByScope,
} from './_config/settingsPageConfig';
import type { SettingSection } from './_config/settingsPageConfig';
import { GitObservabilitySurface } from './_components/GitObservabilitySurface';
import { RuntimePathSurface } from './_components/RuntimePathSurface';
import { RuntimeReadinessSurface } from './_components/RuntimeReadinessSurface';
import { IngestOperationsSurface } from './_components/IngestOperationsSurface';
import { SettingsAssistantAction } from './_components/SettingsAssistantAction';
import headerStyles from './_components/SettingsHeader.module.css';
import { SettingsCustomSlot } from './_components/SettingsCustomSlot';
import { SettingsFieldList } from './_components/SettingsFieldList';
import { getSettingsTabOptions, parseSettingsTabPath } from './_utils/settingsNavigation';
import {
  buildKeyToLabelMap,
  buildSettingsUpdatePayload,
  getModifiedKeys,
  getNestedValue,
  getValidationErrors,
  setNestedValue,
} from './_utils/settingsPageUtils';

function toSettingsAnchorId(value: string) {
  return value.replace(/[^A-Za-z0-9_-]/g, '-');
}

function getSettingsSectionOverviewAnchorId(sectionId: string) {
  return `settings-section-${toSettingsAnchorId(sectionId)}-overview`;
}

function getSettingsFieldAnchorId(sectionId: string, itemKey: string) {
  return `settings-field-${toSettingsAnchorId(sectionId)}-${toSettingsAnchorId(itemKey)}`;
}

function getSettingsSectionIndexAnchorId(sectionId: string, itemId: string) {
  return `settings-section-${toSettingsAnchorId(sectionId)}-index-${toSettingsAnchorId(itemId)}`;
}

export function SettingsPage() {
  const {
    config,
    isLoaded,
    isLoading,
    isSaving,
    error,
    loadSettings,
    updateSettings,
    access: settingsAccess,
    runtime,
  } = useSettingsStore();
  const {
    activeScope,
    activeSectionId,
    openSection,
  } = useSettingsPageNavigationStore();
  const tabId = useTabInstanceId();
  const activeTabId = useTabStore((state) => state.activeTabId);
  const tabPath = useTabStore((state) => state.tabs.find((tab) => tab.id === tabId)?.path ?? '');
  const isCompactMode = useSidebarStore((state) => state.isCompactMode);
  const openTab = useTabStore((state) => state.openTab);
  const tabTarget = useMemo(() => parseSettingsTabPath(tabPath), [tabPath]);
  const effectiveScope = tabTarget?.scope ?? activeScope;
  const effectiveSectionId = tabTarget?.sectionId ?? activeSectionId;
  const isActiveSettingsTab = activeTabId === tabId;
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const canManageSystemSettings = Boolean(settingsAccess?.canManageSystem ?? false);
  const canManagePersonalSettings = Boolean(settingsAccess?.canManagePersonal ?? true);
  const canUseDocumentAccessCenter = Boolean(
    accessSnapshot?.features.canReadDocuments || accessSnapshot?.features.canUseSearch
  );
  const queryClient = useQueryClient();

  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>({});
  const [originalConfig, setOriginalConfig] = useState<Record<string, unknown>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [templateDraft, setTemplateDraft] = useState({
    name: '',
    description: '',
    content: '',
    scope: 'global' as TemplateScope,
    kind: 'document' as TemplateKind,
    usage: 'general' as 'general' | 'crm-quote-document' | 'crm-contract-document' | 'crm-opportunity-contract-document',
  });
  const [reviewConfirmingTemplateId, setReviewConfirmingTemplateId] = useState<string | null>(null);
  const [uploadingDocxTemplateId, setUploadingDocxTemplateId] = useState<string | null>(null);
  const runtimeSectionIds = useMemo(() => new Set(['git', 'storage-runtime', 'ingest-runtime', 'templates-runtime']), []);

  const canOpenSection = useCallback((section: SettingSection) => {
    if (section.scope === 'personal') {
      return canManagePersonalSettings;
    }
    if (section.id === 'documentAccess') {
      return canManageSystemSettings || canUseDocumentAccessCenter;
    }
    return canManageSystemSettings;
  }, [canManagePersonalSettings, canManageSystemSettings, canUseDocumentAccessCenter]);

  useEffect(() => {
    const includeRuntime = canManageSystemSettings && runtimeSectionIds.has(effectiveSectionId);
    if (isLoaded && (!includeRuntime || runtime)) {
      return;
    }
    void loadSettings(includeRuntime);
  }, [canManageSystemSettings, effectiveSectionId, isLoaded, loadSettings, runtime, runtimeSectionIds]);

  useEffect(() => {
    if (!isLoaded || canManageSystemSettings) {
      return;
    }
    if (effectiveScope === 'system' && !(effectiveSectionId === 'documentAccess' && canUseDocumentAccessCenter)) {
      openSection('personal', 'identity');
      openTab(getSettingsTabOptions('personal', 'identity'));
    }
  }, [
    canManageSystemSettings,
    canUseDocumentAccessCenter,
    effectiveScope,
    effectiveSectionId,
    isLoaded,
    openSection,
    openTab,
  ]);

  useEffect(() => {
    if (!config) return;
    const nextConfig = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
    setLocalConfig(nextConfig);
    setOriginalConfig(nextConfig);
  }, [config]);

  useEffect(() => {
    if (!saveSuccess) return;
    const timeoutId = window.setTimeout(() => setSaveSuccess(false), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [saveSuccess]);

  const allScopeSections = useMemo(() => getSettingSectionsByScope(effectiveScope), [effectiveScope]);
  const scopeSections = useMemo(() => {
    return allScopeSections.filter(canOpenSection);
  }, [allScopeSections, canOpenSection]);
  const currentSection = useMemo(() => {
    return scopeSections.find((section) => section.id === effectiveSectionId) ?? scopeSections[0];
  }, [effectiveSectionId, scopeSections]);
  useEffect(() => {
    if (!tabId || !currentSection) return;
    const tab = useTabStore.getState().tabs.find((candidate) => candidate.id === tabId);
    if (tab && tab.title !== currentSection.label) {
      useTabStore.getState().updateTabTitle(tabId, currentSection.label);
    }
  }, [currentSection, tabId]);

  const isCustomSection = currentSection?.kind === 'custom';
  const isAdminTemplateSection = currentSection?.slotKey === 'admin-templates';
  const isRuntimeSection = currentSection?.settingKind === 'runtime-observability';
  const isReadOnlySection = Boolean(isRuntimeSection);
  const currentSectionItems = useMemo(() => {
    return currentSection?.items ?? [];
  }, [currentSection]);
  const templateListQuery = useTemplateList({
    enabled: isAdminTemplateSection,
  });
  const templates = useMemo<TemplateItem[]>(
    () => [
      ...(templateListQuery.data?.data?.personal ?? []),
      ...(templateListQuery.data?.data?.global ?? []),
    ],
    [templateListQuery.data?.data?.global, templateListQuery.data?.data?.personal],
  );
  const isLoadingTemplates = templateListQuery.isLoading || templateListQuery.isFetching;

  useEffect(() => {
    if (!isActiveSettingsTab || !currentSection) {
      return;
    }
    if (currentSection.id !== activeSectionId || currentSection.scope !== activeScope) {
      openSection(currentSection.scope, currentSection.id);
    }
  }, [activeScope, activeSectionId, currentSection, isActiveSettingsTab, openSection]);

  const keyToLabel = useMemo(() => {
    return buildKeyToLabelMap(SETTING_SECTIONS);
  }, []);

  const editableSections = useMemo(() => {
    if (canManageSystemSettings) {
      return SETTING_SECTIONS;
    }
    return SETTING_SECTIONS.filter((section) => section.scope === 'personal');
  }, [canManageSystemSettings]);

  const modifiedKeys = useMemo(() => {
    return getModifiedKeys(editableSections, localConfig, originalConfig);
  }, [editableSections, localConfig, originalConfig]);

  const validationErrors = useMemo(() => {
    return getValidationErrors(editableSections, localConfig);
  }, [editableSections, localConfig]);

  const settingsSectionOverviewAnchorId = useMemo(() => {
    return currentSection ? getSettingsSectionOverviewAnchorId(currentSection.id) : 'settings-section-overview';
  }, [currentSection]);

  const settingsIndexItems = useMemo<SsooPageIndexRailItem[]>(() => {
    if (!currentSection) {
      return [];
    }

    const items: SsooPageIndexRailItem[] = [];

    currentSectionItems.forEach((item) => {
      items.push({
        id: getSettingsFieldAnchorId(currentSection.id, item.key),
        label: item.label,
        description: item.description,
      });
    });

    currentSection.indexItems?.forEach((item) => {
      items.push({
        id: getSettingsSectionIndexAnchorId(currentSection.id, item.id),
        label: item.label,
        description: item.description,
      });
    });

    return items;
  }, [currentSection, currentSectionItems]);

  const settingsCustomSlotAnchorIds = useMemo(() => {
    if (!currentSection?.indexItems) {
      return {};
    }

    return Object.fromEntries(
      currentSection.indexItems.map((item) => [
        item.id,
        getSettingsSectionIndexAnchorId(currentSection.id, item.id),
      ])
    );
  }, [currentSection]);

  const handleSettingsIndexSelect = useCallback((itemId: string) => {
    document.getElementById(itemId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  const hasChanges = modifiedKeys.length > 0;
  const hasValidationErrors = modifiedKeys.some((key) => Boolean(validationErrors[key]));

  const handleStructuredChange = useCallback((key: string, value: unknown) => {
    setLocalConfig((prev) => setNestedValue(prev, key, value));
    setSaveSuccess(false);
  }, []);

  const handleReset = useCallback(() => {
    setLocalConfig(originalConfig);
    setSaveSuccess(false);
  }, [originalConfig]);

  const handleSave = useCallback(async () => {
    if (!currentSection) return;

    const currentValidationErrors = getValidationErrors(editableSections, localConfig);
    if (modifiedKeys.some((key) => Boolean(currentValidationErrors[key]))) {
      return;
    }

    setSaveSuccess(false);
    let success = true;
    const payload = buildSettingsUpdatePayload(modifiedKeys, localConfig, editableSections);

    const hasPayload = Object.keys(payload as Record<string, unknown>).length > 0;
    if (success && hasPayload) {
      success = await updateSettings(payload);
    }

    if (success) {
      setSaveSuccess(true);
    }
  }, [
    currentSection,
    editableSections,
    localConfig,
    modifiedKeys,
    updateSettings,
  ]);

  const handleTemplateSave = useCallback(async () => {
    if (!templateDraft.name.trim() || !templateDraft.content.trim()) return;
    const response = await templateApi.upsert({
      name: templateDraft.name.trim(),
      description: templateDraft.description.trim(),
      content: templateDraft.content,
      scope: templateDraft.scope,
      kind: templateDraft.kind,
      generation: templateDraft.usage === 'general'
        ? { source: 'manual' }
        : { source: 'manual', taskKey: templateDraft.usage },
    });
    if (!response.success || !response.data) return;
    await queryClient.invalidateQueries({ queryKey: templateKeys.all });
    setTemplateDraft({
      name: '',
      description: '',
      content: '',
      scope: 'global',
      kind: 'document',
      usage: 'general',
    });
  }, [queryClient, templateDraft]);

  const handleTemplateDelete = useCallback(async (template: TemplateItem) => {
    const response = await templateApi.remove(template.id, template.scope);
    if (!response.success) return;
    await queryClient.invalidateQueries({ queryKey: templateKeys.all });
  }, [queryClient]);

  const handleTemplateDocxUpload = useCallback(async (template: TemplateItem, file: File) => {
    setUploadingDocxTemplateId(template.id);
    try {
      const response = await templateApi.uploadDocx(template, file);
      if (!response.success) return;
      await queryClient.invalidateQueries({ queryKey: templateKeys.all });
    } finally {
      setUploadingDocxTemplateId(null);
    }
  }, [queryClient]);

  const handleTemplateReviewConfirm = useCallback(async (template: TemplateItem) => {
    setReviewConfirmingTemplateId(template.id);
    try {
      const response = await templateApi.confirmReview(template.id, template.scope, {
        memo: 'DMS 설정에서 CRM 견적 템플릿 검토 확정',
      });
      if (!response.success) return;
      await queryClient.invalidateQueries({ queryKey: templateKeys.all });
    } finally {
      setReviewConfirmingTemplateId(null);
    }
  }, [queryClient]);

  const runtimePathSurface = useMemo(() => {
    if (!runtime?.paths || !currentSection) {
      return null;
    }

    switch (currentSection.id) {
      case 'git':
        return (
          <RuntimePathSurface
            title="문서 저장 경로"
            description="문서 저장소가 실제로 사용하는 작업 폴더 경로입니다."
            entries={[
              {
                key: 'markdown-root',
                label: '문서 저장소 기준 폴더',
                description: '서비스가 실제로 사용하는 문서 작업 폴더입니다.',
                binding: runtime.paths.markdownRoot,
              },
            ]}
          />
        );
      case 'storage-runtime':
        return (
          <RuntimePathSurface
            title="첨부 파일 저장 경로"
            description="첨부·참조·이미지가 사용하는 저장소별 실제 경로입니다."
            entries={[
              {
                key: 'storage-local',
                label: '로컬 저장소 기준 폴더',
                description: '로컬 첨부 파일 저장소의 기준 폴더입니다.',
                binding: runtime.paths.storageRoots.local,
              },
              {
                key: 'storage-nas',
                label: '공유 저장소 기준 폴더',
                description: '공유 저장소의 연결 기준 경로입니다.',
                binding: runtime.paths.storageRoots.nas,
              },
            ]}
          />
        );
      case 'ingest-runtime':
        return (
          <RuntimePathSurface
            title="수집 작업 저장 경로"
            description="수집 작업 대기열 파일을 저장하는 실제 경로입니다."
            entries={[
              {
                key: 'ingest-root',
                label: '수집 작업 기준 폴더',
                description: 'jobs.json과 관련 수집 작업 파일이 위치하는 경로입니다.',
                binding: runtime.paths.ingestQueue,
              },
            ]}
          />
        );
      case 'templates-runtime':
        return (
          <RuntimePathSurface
            title="서식 저장 경로"
            description="서식은 문서 저장소 안의 _templates/ 폴더에 자동 배치됩니다."
            entries={[
              {
                key: 'template-root',
                label: '서식 저장 폴더',
                description: '문서 저장소 안의 _templates/ 폴더입니다.',
                binding: runtime.paths.template,
              },
            ]}
          />
        );
      default:
        return null;
    }
  }, [currentSection, runtime?.paths]);

  const topStatusBanner = error ? (
    <SsooSettingsBanner tone="danger" leadingSlot={<AlertCircle className="h-4 w-4" />}>
      {error}
    </SsooSettingsBanner>
  ) : saveSuccess ? (
    <SsooSettingsBanner tone="success" leadingSlot={<Check className="h-4 w-4" />}>
      설정을 저장했습니다.
    </SsooSettingsBanner>
  ) : null;

  const pendingLabels = useMemo(() => {
    const labels = modifiedKeys.map((key) => keyToLabel.get(key) ?? key);
    return Array.from(new Set(labels));
  }, [keyToLabel, modifiedKeys]);

  const headerActions = useMemo<SsooPageHeaderAction[]>(() => {
    if (isCustomSection) {
      return [];
    }

    if (isRuntimeSection) {
      return [{
        label: isLoading ? '확인 중...' : '상태 새로고침',
        icon: <RotateCcw className="h-4 w-4" />,
        variant: 'outline',
        onClick: () => {
          void loadSettings(true);
        },
        disabled: isLoading,
      }];
    }

    const actions: SsooPageHeaderAction[] = [];

    if (hasChanges) {
      actions.push({
        label: pendingLabels.length > 0 ? `${pendingLabels.length}개 변경` : 'JSON 변경',
        variant: 'ghost',
        onClick: () => undefined,
      });
    }

    actions.push({
      label: '초기화',
      icon: <RotateCcw className="h-4 w-4" />,
      variant: 'outline',
      onClick: handleReset,
      disabled: !hasChanges || isSaving,
    });

    actions.push({
      label: isSaving ? '저장 중...' : '저장',
      icon: isSaving ? <LoadingSpinner className="text-current" /> : <Check className="h-4 w-4" />,
      variant: 'default',
      onClick: () => {
        void handleSave();
      },
      disabled: !hasChanges || hasValidationErrors || isSaving,
    });

    return actions;
  }, [handleReset, handleSave, hasChanges, hasValidationErrors, isCustomSection, isLoading, isRuntimeSection, isSaving, loadSettings, pendingLabels.length]);

  const settingsIndex = currentSection ? {
    ariaLabel: '설정 항목 색인',
    items: settingsIndexItems,
    onItemSelect: (item: SsooPageIndexRailItem) => handleSettingsIndexSelect(item.id),
  } : null;

  if (!settingsAccess) {
    return (
      <SsooSettingsPage
        filePath="settings"
        title={<span className={headerStyles.title}>설정</span>}
        headerActions={{ viewerRightSlot: <SettingsAssistantAction /> }}
        compactMode={isCompactMode}
        stateSlot={error ? (
          <ErrorState error={error} />
        ) : (
          <LoadingSpinner message="설정을 불러오는 중입니다." className="text-ssoo-primary/70" />
        )}
      >
        {null}
      </SsooSettingsPage>
    );
  }

  if (!currentSection) {
    return (
      <SsooSettingsPage
        filePath="settings"
        title={<span className={headerStyles.title}>설정</span>}
        headerActions={{ viewerRightSlot: <SettingsAssistantAction /> }}
        compactMode={isCompactMode}
        stateSlot={<ErrorState error="사용 가능한 설정 메뉴가 없습니다." />}
      >
        {null}
      </SsooSettingsPage>
    );
  }

  if (!canOpenSection(currentSection)) {
    return (
      <SsooSettingsPage
        filePath="settings"
        title={<span className={headerStyles.title}>설정</span>}
        headerActions={{ viewerRightSlot: <SettingsAssistantAction /> }}
        compactMode={isCompactMode}
        stateSlot={<ErrorState error="설정을 관리할 권한이 없습니다." />}
      >
        {null}
      </SsooSettingsPage>
    );
  }

  return (
    <SsooSettingsPage
      filePath={`settings/${currentSection.surface}/${currentSection.id}`}
      title={<span className={headerStyles.title}>{currentSection.label}</span>}
      breadcrumbItems={[
        { id: 'settings', label: '설정' },
        { id: currentSection.surface, label: SETTINGS_SECTION_GROUP_LABELS[currentSection.group] },
        { id: currentSection.id, label: currentSection.label },
      ]}
      headerActions={{
        extraActions: headerActions,
        extraActionsPosition: 'right',
        viewerRightSlot: <SettingsAssistantAction />,
      }}
      index={settingsIndex}
      overviewAnchorId={settingsSectionOverviewAnchorId}
      bannerSlot={topStatusBanner}
      pendingSummarySlot={hasChanges && pendingLabels.length > 0 ? (
        <SsooSettingsPendingSummary labels={pendingLabels} />
      ) : null}
      compactMode={isCompactMode}
    >
      {isRuntimeSection && <RuntimeReadinessSurface readiness={runtime?.readiness ?? null} />}
      {runtimePathSurface}
      {currentSection.id === 'ingest-runtime' && <IngestOperationsSurface />}
      {currentSection.id === 'git' && <GitObservabilitySurface git={runtime?.git ?? null} />}

      {isLoading && !isCustomSection ? (
        <div className="flex min-h-full items-center justify-center">
          <LoadingSpinner message="설정을 불러오는 중입니다." className="text-ssoo-primary/70" />
        </div>
      ) : isRuntimeSection ? null
      : isCustomSection && currentSection.slotKey ? (
        <SettingsCustomSlot
          slotKey={currentSection.slotKey}
          templates={templates}
          isLoadingTemplates={isLoadingTemplates}
          hasTemplateLoadError={templateListQuery.isError || templateListQuery.data?.success === false}
          onReloadTemplates={() => { void templateListQuery.refetch(); }}
          templateDraft={templateDraft}
          setTemplateDraft={setTemplateDraft}
          onSave={() => {
            void handleTemplateSave();
          }}
          onDelete={(template) => {
            void handleTemplateDelete(template);
          }}
          onUploadDocx={(template, file) => {
            void handleTemplateDocxUpload(template, file);
          }}
          onConfirmReview={(template) => {
            void handleTemplateReviewConfirm(template);
          }}
          reviewConfirmingTemplateId={reviewConfirmingTemplateId}
          uploadingDocxTemplateId={uploadingDocxTemplateId}
          config={config}
          isSavingSettings={isSaving}
          onUpdateSettings={updateSettings}
          anchorIds={settingsCustomSlotAnchorIds}
        />
      ) : (
        <SettingsFieldList
          items={currentSectionItems}
          localConfig={localConfig}
          originalConfig={originalConfig}
          validationErrors={validationErrors}
          getValue={getNestedValue}
          onChange={handleStructuredChange}
          readOnly={isReadOnlySection}
          getItemAnchorId={(item) => getSettingsFieldAnchorId(currentSection.id, item.key)}
        />
      )}
    </SsooSettingsPage>
  );
}
