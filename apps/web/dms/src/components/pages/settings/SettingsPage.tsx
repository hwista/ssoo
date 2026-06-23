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
  SsooSettingsViewModeTabs,
  type SsooPageHeaderAction,
  type SsooPageIndexRailItem,
} from '@ssoo/web-shell';
import { JsonDiffView, JsonEditor } from '@/components/common/json';
import { ErrorState, LoadingSpinner } from '@/components/common/StateDisplay';
import { templateApi } from '@/lib/api/endpoints/templates';
import { templateKeys, useTemplateList } from '@/hooks/queries/useTemplates';
import type { TemplateItem, TemplateKind, TemplateScope } from '@/types/template';
import { useAccessStore, useSettingsPageNavigationStore, useSettingsStore, useSidebarStore, useTabStore } from '@/stores';
import { useTabInstanceId } from '@/components/layout/tab-instance/TabInstanceContext';
import {
  SETTING_SECTIONS,
  SETTINGS_SCOPE_LABELS,
  SETTINGS_VIEW_MODE_LABELS,
  getSettingSectionsByScope,
} from './_config/settingsPageConfig';
import type { SettingSection } from './_config/settingsPageConfig';
import { GitObservabilitySurface } from './_components/GitObservabilitySurface';
import { RuntimePathSurface } from './_components/RuntimePathSurface';
import { SettingsCustomSlot } from './_components/SettingsCustomSlot';
import { SettingsFieldList } from './_components/SettingsFieldList';
import { getSettingsTabOptions, parseSettingsTabPath } from './_utils/settingsNavigation';
import {
  buildKeyToLabelMap,
  buildSectionJsonDraft,
  buildSectionUpdatePayload,
  buildSettingsUpdatePayload,
  getModifiedKeys,
  getNestedValue,
  getValidationErrors,
  mergeSettingsPayloads,
  parseSectionJsonDraft,
  replaceSectionValue,
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
    activeViewMode,
    openSection,
    setViewMode,
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
  const [jsonDraft, setJsonDraft] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [templateDraft, setTemplateDraft] = useState({
    name: '',
    description: '',
    content: '',
    scope: 'global' as TemplateScope,
    kind: 'document' as TemplateKind,
  });
  const runtimeSectionIds = useMemo(() => new Set(['git', 'storage', 'ingest', 'templates-runtime']), []);

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
  const isCustomSection = currentSection?.kind === 'custom';
  const isAdminTemplateSection = currentSection?.slotKey === 'admin-templates';
  const isReadOnlySection = currentSection?.id === 'git';
  const currentSectionItems = useMemo(() => {
    if (!currentSection || canManageSystemSettings || currentSection.id !== 'workspace') {
      return currentSection?.items ?? [];
    }
    return currentSection.items.map((item) => {
      if (item.key !== 'personal.workspace.defaultSettingsScope') {
        return item;
      }
      return {
        ...item,
        options: item.options?.filter((option) => option.value === 'personal'),
      };
    });
  }, [canManageSystemSettings, currentSection]);
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

  useEffect(() => {
    if (!currentSection || isCustomSection) {
      setJsonDraft('{}');
      setJsonError(null);
      return;
    }
    setJsonDraft(buildSectionJsonDraft(localConfig, currentSection.jsonPath));
    setJsonError(null);
  }, [currentSection, isCustomSection, localConfig]);

  const supportsJsonModes = !isCustomSection && currentSection?.id !== 'git';

  useEffect(() => {
    if (!supportsJsonModes && activeViewMode !== 'structured') {
      setViewMode('structured');
    }
  }, [activeViewMode, setViewMode, supportsJsonModes]);

  const parsedJsonDraft = useMemo(() => parseSectionJsonDraft(jsonDraft), [jsonDraft]);

  const comparableConfig = useMemo(() => {
    if (!supportsJsonModes || activeViewMode !== 'json' || !parsedJsonDraft.success || !currentSection) {
      return localConfig;
    }
    return replaceSectionValue(localConfig, currentSection.jsonPath, parsedJsonDraft.data);
  }, [activeViewMode, currentSection, localConfig, parsedJsonDraft, supportsJsonModes]);

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
    return getModifiedKeys(editableSections, comparableConfig, originalConfig);
  }, [comparableConfig, editableSections, originalConfig]);
  const modifiedKeySet = useMemo(() => new Set(modifiedKeys), [modifiedKeys]);

  const validationErrors = useMemo(() => {
    return getValidationErrors(editableSections, comparableConfig);
  }, [comparableConfig, editableSections]);

  const settingsSectionOverviewAnchorId = useMemo(() => {
    return currentSection ? getSettingsSectionOverviewAnchorId(currentSection.id) : 'settings-section-overview';
  }, [currentSection]);

  const settingsIndexItems = useMemo<SsooPageIndexRailItem[]>(() => {
    if (!currentSection) {
      return [];
    }

    const items: SsooPageIndexRailItem[] = [
      {
        id: getSettingsSectionOverviewAnchorId(currentSection.id),
        label: '개요',
        description: currentSection.description,
        meta: SETTINGS_SCOPE_LABELS[currentSection.scope],
      },
    ];

    currentSectionItems.forEach((item) => {
      const hasError = Boolean(validationErrors[item.key]);
      const isModified = modifiedKeySet.has(item.key);

      items.push({
        id: getSettingsFieldAnchorId(currentSection.id, item.key),
        label: item.label,
        description: item.helpKey,
        meta: hasError ? '오류' : isModified ? '변경됨' : undefined,
      });
    });

    currentSection.indexItems?.forEach((item) => {
      items.push({
        id: getSettingsSectionIndexAnchorId(currentSection.id, item.id),
        label: item.label,
        description: item.description,
        meta: item.meta,
      });
    });

    return items;
  }, [currentSection, currentSectionItems, modifiedKeySet, validationErrors]);

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

  const currentSectionOriginalText = useMemo(() => {
    if (!currentSection || !supportsJsonModes) return '{}';
    return buildSectionJsonDraft(originalConfig, currentSection.jsonPath);
  }, [currentSection, originalConfig, supportsJsonModes]);

  const currentSectionComparableText = useMemo(() => {
    if (!currentSection || !supportsJsonModes) return '{}';
    if (activeViewMode === 'json') {
      return parsedJsonDraft.success ? JSON.stringify(parsedJsonDraft.data, null, 2) : jsonDraft;
    }
    return buildSectionJsonDraft(comparableConfig, currentSection.jsonPath);
  }, [activeViewMode, comparableConfig, currentSection, jsonDraft, parsedJsonDraft, supportsJsonModes]);

  const hasSectionJsonChanges = supportsJsonModes && currentSectionComparableText !== currentSectionOriginalText;
  const hasChanges = modifiedKeys.length > 0 || hasSectionJsonChanges;
  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  const handleStructuredChange = useCallback((key: string, value: unknown) => {
    setLocalConfig((prev) => setNestedValue(prev, key, value));
    setSaveSuccess(false);
  }, []);

  const resolveConfigFromJsonDraft = useCallback(() => {
    if (!supportsJsonModes || !currentSection) {
      return { success: true as const, config: localConfig };
    }

    const parsed = parseSectionJsonDraft(jsonDraft);
    if (!parsed.success) {
      setJsonError(parsed.error);
      return { success: false as const };
    }

    setJsonError(null);
    return {
      success: true as const,
      config: replaceSectionValue(localConfig, currentSection.jsonPath, parsed.data),
    };
  }, [currentSection, jsonDraft, localConfig, supportsJsonModes]);

  const handleViewModeChange = useCallback((nextMode: typeof activeViewMode) => {
    if (!supportsJsonModes && nextMode !== 'structured') return;

    if (activeViewMode === 'json' && nextMode !== 'json') {
      const resolved = resolveConfigFromJsonDraft();
      if (!resolved.success) return;
      setLocalConfig(resolved.config);
      if (currentSection) {
        setJsonDraft(buildSectionJsonDraft(resolved.config, currentSection.jsonPath));
      }
    }

    setViewMode(nextMode);
  }, [activeViewMode, currentSection, resolveConfigFromJsonDraft, setViewMode, supportsJsonModes]);

  const handleReset = useCallback(() => {
    setLocalConfig(originalConfig);
    if (currentSection && !isCustomSection) {
      setJsonDraft(buildSectionJsonDraft(originalConfig, currentSection.jsonPath));
    } else {
      setJsonDraft('{}');
    }
    setJsonError(null);
    setSaveSuccess(false);
  }, [currentSection, isCustomSection, originalConfig]);

  const handleSave = useCallback(async () => {
    if (!currentSection) return;

    let workingConfig = comparableConfig;
    if (supportsJsonModes && activeViewMode === 'json') {
      const resolved = resolveConfigFromJsonDraft();
      if (!resolved.success) return;
      workingConfig = resolved.config;
      setLocalConfig(resolved.config);
      setJsonDraft(buildSectionJsonDraft(resolved.config, currentSection.jsonPath));
    }

    if (Object.keys(getValidationErrors(editableSections, workingConfig)).length > 0) {
      return;
    }

    setSaveSuccess(false);
    let success = true;
    let payload = buildSettingsUpdatePayload(modifiedKeys, workingConfig, editableSections);

    if (supportsJsonModes && activeViewMode === 'json') {
      payload = mergeSettingsPayloads(
        payload,
        buildSectionUpdatePayload(
          currentSection.jsonPath,
          (getNestedValue(workingConfig, currentSection.jsonPath) as Record<string, unknown>) ?? {}
        )
      );
    }

    const hasPayload = Object.keys(payload as Record<string, unknown>).length > 0;
    if (success && hasPayload) {
      success = await updateSettings(payload);
    }

    if (success) {
      setSaveSuccess(true);
    }
  }, [
    activeViewMode,
    comparableConfig,
    currentSection,
    editableSections,
    modifiedKeys,
    resolveConfigFromJsonDraft,
    supportsJsonModes,
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
    });
    if (!response.success || !response.data) return;
    await queryClient.invalidateQueries({ queryKey: templateKeys.all });
    setTemplateDraft({
      name: '',
      description: '',
      content: '',
      scope: 'global',
      kind: 'document',
    });
  }, [queryClient, templateDraft]);

  const handleTemplateDelete = useCallback(async (template: TemplateItem) => {
    const response = await templateApi.remove(template.id, template.scope);
    if (!response.success) return;
    await queryClient.invalidateQueries({ queryKey: templateKeys.all });
  }, [queryClient]);

  const runtimePathSurface = useMemo(() => {
    if (!runtime?.paths || !currentSection) {
      return null;
    }

    switch (currentSection.id) {
      case 'git':
        return (
          <RuntimePathSurface
            title="Markdown runtime path"
            description="Git 이 실제로 묶이는 external markdown working tree 경로입니다."
            entries={[
              {
                key: 'markdown-root',
                label: 'Markdown root',
                description: '서비스가 실제로 바라보는 markdown working tree 입니다.',
                binding: runtime.paths.markdownRoot,
              },
            ]}
          />
        );
      case 'storage':
        return (
          <RuntimePathSurface
            title="Binary storage roots"
            description="Attachment/reference/image 가 사용하는 provider별 runtime roots 입니다."
            entries={[
              {
                key: 'storage-local',
                label: 'Local provider root',
                description: 'Local binary storage root 입니다.',
                binding: runtime.paths.storageRoots.local,
              },
              {
                key: 'storage-sharepoint',
                label: 'SharePoint provider root',
                description: 'SharePoint provider 의 mount/library 기준 경로입니다.',
                binding: runtime.paths.storageRoots.sharepoint,
              },
              {
                key: 'storage-nas',
                label: 'NAS provider root',
                description: 'NAS provider 의 mount/gateway 기준 경로입니다.',
                binding: runtime.paths.storageRoots.nas,
              },
            ]}
          />
        );
      case 'ingest':
        return (
          <RuntimePathSurface
            title="Ingest queue path"
            description="수집 작업 큐 파일을 저장하는 실제 runtime 경로입니다."
            entries={[
              {
                key: 'ingest-root',
                label: 'Ingest queue root',
                description: 'jobs.json 과 관련 ingest queue 파일이 위치하는 경로입니다.',
                binding: runtime.paths.ingestQueue,
              },
            ]}
          />
        );
      case 'templates-runtime':
        return (
          <RuntimePathSurface
            title="Template runtime path"
            description="템플릿은 문서 Git 레포의 _templates/ 하위에 자동 배치됩니다 (markdownRoot 파생)."
            entries={[
              {
                key: 'template-root',
                label: 'Template directory',
                description: '문서 markdown root 의 _templates/ 하위 경로입니다.',
                binding: {
                  configuredPath: runtime.paths.templateDir,
                  effectiveInput: runtime.paths.templateDir,
                  resolvedPath: runtime.paths.templateDir,
                  exists: true,
                  relativeToAppRoot: false,
                  source: 'config' as const,
                },
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
    if (activeViewMode === 'json' && hasSectionJsonChanges && currentSection) {
      labels.unshift(`${currentSection.label} JSON`);
    }
    return Array.from(new Set(labels));
  }, [activeViewMode, currentSection, hasSectionJsonChanges, keyToLabel, modifiedKeys]);

  const headerActions = useMemo<SsooPageHeaderAction[]>(() => {
    if (isCustomSection || isReadOnlySection) {
      return [];
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
      disabled: !hasChanges || hasValidationErrors || (activeViewMode === 'json' && !parsedJsonDraft.success) || isSaving,
    });

    return actions;
  }, [activeViewMode, handleReset, handleSave, hasChanges, hasValidationErrors, isCustomSection, isReadOnlySection, isSaving, parsedJsonDraft.success, pendingLabels.length]);

  const viewerRightSlot = currentSection && supportsJsonModes ? (
    <SsooSettingsViewModeTabs
      value={activeViewMode}
      options={(['structured', 'json', 'diff'] as const).map((mode) => ({
        value: mode,
        label: SETTINGS_VIEW_MODE_LABELS[mode],
      }))}
      onChange={handleViewModeChange}
    />
  ) : null;

  const settingsIndex = currentSection ? {
    ariaLabel: '설정 항목 색인',
    description: currentSection.description,
    items: settingsIndexItems,
    onItemSelect: (item: SsooPageIndexRailItem) => handleSettingsIndexSelect(item.id),
  } : null;

  if (!settingsAccess) {
    return (
      <SsooSettingsPage
        filePath="settings"
        description={error ? '설정 정보를 불러오지 못했습니다.' : '설정 정보를 불러오는 중입니다.'}
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
        description="사용 가능한 설정 메뉴가 없습니다."
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
        description="설정 권한이 필요합니다."
        compactMode={isCompactMode}
        stateSlot={<ErrorState error="설정을 관리할 권한이 없습니다." />}
      >
        {null}
      </SsooSettingsPage>
    );
  }

  return (
    <SsooSettingsPage
      filePath={`settings/${effectiveScope}/${currentSection.id}`}
      description={`${SETTINGS_SCOPE_LABELS[effectiveScope]} · ${currentSection.description}`}
      headerActions={{
        extraActions: headerActions,
        extraActionsPosition: 'right',
        viewerRightSlot,
      }}
      index={settingsIndex}
      overviewAnchorId={settingsSectionOverviewAnchorId}
      bannerSlot={topStatusBanner}
      pendingSummarySlot={hasChanges && pendingLabels.length > 0 ? (
        <SsooSettingsPendingSummary labels={pendingLabels} />
      ) : null}
      compactMode={isCompactMode}
    >
      {runtimePathSurface}
      {currentSection.id === 'git' && <GitObservabilitySurface git={runtime?.git ?? null} />}

      {isLoading && !isCustomSection ? (
        <div className="flex min-h-full items-center justify-center">
          <LoadingSpinner message="설정을 불러오는 중입니다." className="text-ssoo-primary/70" />
        </div>
      ) : isCustomSection && currentSection.slotKey ? (
        <SettingsCustomSlot
          slotKey={currentSection.slotKey}
          templates={templates}
          isLoadingTemplates={isLoadingTemplates}
          templateDraft={templateDraft}
          setTemplateDraft={setTemplateDraft}
          onSave={() => {
            void handleTemplateSave();
          }}
          onDelete={(template) => {
            void handleTemplateDelete(template);
          }}
          anchorIds={settingsCustomSlotAnchorIds}
        />
      ) : activeViewMode === 'json' ? (
        <JsonEditor
          value={jsonDraft}
          onChange={(nextValue) => {
            setJsonDraft(nextValue);
            if (jsonError) setJsonError(null);
          }}
          errorMessage={!parsedJsonDraft.success ? parsedJsonDraft.error : jsonError}
          className="min-h-[480px]"
        />
      ) : activeViewMode === 'diff' ? (
        <JsonDiffView
          originalText={currentSectionOriginalText}
          currentText={currentSectionComparableText}
          className="min-h-[480px]"
        />
      ) : (
        <SettingsFieldList
          items={currentSectionItems}
          localConfig={comparableConfig}
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
