'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, RotateCcw } from 'lucide-react';
import { JsonDiffView, JsonEditor } from '@/components/common/json';
import { ErrorState, LoadingSpinner } from '@/components/common/StateDisplay';
import { Button } from '@/components/ui/button';
import { PageTemplate } from '@/components/templates';
import type { HeaderAction } from '@/components/templates/page-frame';
import { templateApi } from '@/lib/api/endpoints/templates';
import { templateKeys, useTemplateList } from '@/hooks/queries/useTemplates';
import type { TemplateItem, TemplateKind, TemplateScope } from '@/types/template';
import { useAccessStore, useSettingsShellStore, useSettingsStore } from '@/stores';
import {
  SETTING_SECTIONS,
  SETTINGS_SCOPE_LABELS,
  SETTINGS_VIEW_MODE_LABELS,
  getSettingSectionsByScope,
} from './_config/settingsPageConfig';
import { GitObservabilitySurface } from './_components/GitObservabilitySurface';
import { RuntimePathSurface } from './_components/RuntimePathSurface';
import { SettingsCustomSlot } from './_components/SettingsCustomSlot';
import { SettingsNavigation } from './_components/SettingsNavigation';
import { SettingsFieldList } from './_components/SettingsFieldList';
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

export function SettingsPage() {
  const {
    config,
    isLoaded,
    isLoading,
    isSaving,
    error,
    loadSettings,
    updateSettings,
    runtime,
  } = useSettingsStore();
  const {
    activeScope,
    activeSectionId,
    activeViewMode,
    setSection,
    setViewMode,
  } = useSettingsShellStore();
  const canManageSettings = useAccessStore((state) => state.snapshot?.features.canManageSettings ?? false);
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

  useEffect(() => {
    const includeRuntime = runtimeSectionIds.has(activeSectionId);
    if (isLoaded && (!includeRuntime || runtime)) {
      return;
    }
    void loadSettings(includeRuntime);
  }, [activeSectionId, isLoaded, loadSettings, runtime, runtimeSectionIds]);

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

  const scopeSections = useMemo(() => getSettingSectionsByScope(activeScope), [activeScope]);
  const currentSection = useMemo(() => {
    return scopeSections.find((section) => section.id === activeSectionId) ?? scopeSections[0];
  }, [activeSectionId, scopeSections]);
  const isCustomSection = currentSection?.kind === 'custom';
  const isAdminTemplateSection = currentSection?.slotKey === 'admin-templates';
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
    if (currentSection && currentSection.id !== activeSectionId) {
      setSection(currentSection.id);
    }
  }, [activeSectionId, currentSection, setSection]);

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

  const modifiedKeys = useMemo(() => {
    return getModifiedKeys(SETTING_SECTIONS, comparableConfig, originalConfig);
  }, [comparableConfig, originalConfig]);

  const validationErrors = useMemo(() => {
    return getValidationErrors(SETTING_SECTIONS, comparableConfig);
  }, [comparableConfig]);

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

    if (Object.keys(getValidationErrors(SETTING_SECTIONS, workingConfig)).length > 0) {
      return;
    }

    setSaveSuccess(false);
    let success = true;
    let payload = buildSettingsUpdatePayload(modifiedKeys, workingConfig, SETTING_SECTIONS);

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
    <div className="mb-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-body-sm text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{error}</span>
    </div>
  ) : saveSuccess ? (
    <div className="mb-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-body-sm text-emerald-700">
      <Check className="h-4 w-4 shrink-0" />
      <span>설정을 저장했습니다.</span>
    </div>
  ) : null;

  const pendingLabels = useMemo(() => {
    const labels = modifiedKeys.map((key) => keyToLabel.get(key) ?? key);
    if (activeViewMode === 'json' && hasSectionJsonChanges && currentSection) {
      labels.unshift(`${currentSection.label} JSON`);
    }
    return Array.from(new Set(labels));
  }, [activeViewMode, currentSection, hasSectionJsonChanges, keyToLabel, modifiedKeys]);

  const headerActions = useMemo<HeaderAction[]>(() => {
    const actions: HeaderAction[] = [];

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
  }, [activeViewMode, handleReset, handleSave, hasChanges, hasValidationErrors, isSaving, parsedJsonDraft.success, pendingLabels.length]);

  const viewerRightSlot = currentSection && supportsJsonModes ? (
    <div className="flex items-center gap-2">
      {(['structured', 'json', 'diff'] as const).map((mode) => {
        if (!supportsJsonModes && mode !== 'structured') return null;
        const isActive = activeViewMode === mode;
        return (
          <Button
            key={mode}
            variant={isActive ? 'default' : 'outline'}
            size="default"
            onClick={() => handleViewModeChange(mode)}
            className={isActive ? 'text-white' : 'text-ssoo-primary'}
          >
            {SETTINGS_VIEW_MODE_LABELS[mode]}
          </Button>
        );
      })}
    </div>
  ) : null;

  if (!currentSection) {
    return null;
  }

  if (!canManageSettings) {
    return (
      <PageTemplate
        filePath="settings"
        mode="viewer"
        description="설정 권한이 필요합니다."
        panelMode="hidden"
      >
        <div className="flex h-full items-center justify-center">
          <ErrorState error="설정을 관리할 권한이 없습니다." />
        </div>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      filePath={`settings/${activeScope}/${currentSection.id}`}
      mode="viewer"
      description={`${SETTINGS_SCOPE_LABELS[activeScope]} · ${currentSection.description}`}
      headerExtraActions={headerActions}
      headerExtraActionsPosition="right"
      headerViewerRightSlot={viewerRightSlot}
      panelMode="hidden"
      contentMaxWidth={null}
    >
      <section className="flex h-full min-h-0 gap-4 overflow-hidden">
        <SettingsNavigation
          title={SETTINGS_SCOPE_LABELS[activeScope]}
          sections={scopeSections}
          activeSectionId={currentSection.id}
          onSelect={setSection}
        />

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-ssoo-content-border bg-white">
          <main className="h-full min-h-0 overflow-y-auto p-4">
            {topStatusBanner}

            {hasChanges && pendingLabels.length > 0 && (
              <section className="mb-3 rounded-md border border-ssoo-content-border bg-ssoo-content-bg/50 px-3 py-2">
                <p className="text-badge text-ssoo-primary">저장 예정 항목</p>
                <p className="mt-1 text-caption text-ssoo-primary/80">
                  {pendingLabels.join(', ')}
                </p>
              </section>
            )}

            {runtimePathSurface}
            {currentSection.id === 'git' && <GitObservabilitySurface git={runtime?.git ?? null} />}

            {isLoading ? (
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
                items={currentSection.items}
                localConfig={comparableConfig}
                originalConfig={originalConfig}
                validationErrors={validationErrors}
                getValue={getNestedValue}
                onChange={handleStructuredChange}
              />
            )}
          </main>
        </div>
      </section>
    </PageTemplate>
  );
}
