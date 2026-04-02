'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, FolderOpen, RotateCcw, Shield, SlidersHorizontal } from 'lucide-react';
import { JsonDiffView, JsonEditor } from '@/components/common/json';
import { LoadingSpinner } from '@/components/common/StateDisplay';
import { Button } from '@/components/ui/button';
import { PageTemplate } from '@/components/templates';
import type { HeaderAction } from '@/components/templates/page-frame';
import { templateApi } from '@/lib/api';
import type { TemplateItem, TemplateKind, TemplateScope } from '@/types/template';
import { useSettingsShellStore, useSettingsStore } from '@/stores';
import {
  SETTING_SECTIONS,
  SETTINGS_SCOPE_LABELS,
  SETTINGS_VIEW_MODE_LABELS,
  getSettingSectionsByScope,
} from './_config/settingsPageConfig';
import { SettingsNavigation } from './_components/SettingsNavigation';
import { SettingsFieldList } from './_components/SettingsFieldList';
import { TemplateSection } from './_components/TemplateSection';
import {
  buildKeyToLabelMap,
  buildSectionJsonDraft,
  buildSectionUpdatePayload,
  buildSettingsUpdatePayload,
  getModifiedKeys,
  getNestedValue,
  getValidationErrors,
  isRelativePath,
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
    updateGitPath,
  } = useSettingsStore();
  const {
    activeScope,
    activeSectionId,
    activeViewMode,
    setSection,
    setViewMode,
  } = useSettingsShellStore();

  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>({});
  const [originalConfig, setOriginalConfig] = useState<Record<string, unknown>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copyFiles, setCopyFiles] = useState(true);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [jsonDraft, setJsonDraft] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [templateDraft, setTemplateDraft] = useState({
    name: '',
    description: '',
    content: '',
    scope: 'global' as TemplateScope,
    kind: 'document' as TemplateKind,
  });

  useEffect(() => {
    if (!isLoaded) {
      void loadSettings();
    }
  }, [isLoaded, loadSettings]);

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
  const scopeIcon = activeScope === 'system' ? Shield : SlidersHorizontal;
  const currentSection = useMemo(() => {
    return scopeSections.find((section) => section.id === activeSectionId) ?? scopeSections[0];
  }, [activeSectionId, scopeSections]);

  useEffect(() => {
    if (currentSection && currentSection.id !== activeSectionId) {
      setSection(currentSection.id);
    }
  }, [activeSectionId, currentSection, setSection]);

  useEffect(() => {
    if (!currentSection) return;
    setJsonDraft(buildSectionJsonDraft(localConfig, currentSection.jsonPath));
    setJsonError(null);
  }, [currentSection, localConfig]);

  useEffect(() => {
    if (!currentSection || currentSection.kind !== 'templates') return;
    let mounted = true;
    const loadTemplates = async () => {
      setIsLoadingTemplates(true);
      const response = await templateApi.list();
      if (!mounted) return;
      if (response.success && response.data) {
        setTemplates([...(response.data.personal ?? []), ...(response.data.global ?? [])]);
      }
      setIsLoadingTemplates(false);
    };
    void loadTemplates();
    return () => {
      mounted = false;
    };
  }, [currentSection]);

  const supportsJsonModes = currentSection?.kind !== 'templates';

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
  const isPathChanged = modifiedKeys.includes('system.git.repositoryPath');
  const pathValue = String(getNestedValue(comparableConfig, 'system.git.repositoryPath') ?? '').trim();
  const relativePathNotice = isRelativePath(pathValue);

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
    if (currentSection) {
      setJsonDraft(buildSectionJsonDraft(originalConfig, currentSection.jsonPath));
    }
    setJsonError(null);
    setSaveSuccess(false);
  }, [currentSection, originalConfig]);

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

    if (isPathChanged) {
      const newPath = String(getNestedValue(workingConfig, 'system.git.repositoryPath') ?? '').trim();
      if (newPath) {
        success = await updateGitPath(newPath, copyFiles);
      } else {
        success = await updateSettings({ system: { git: { repositoryPath: '' } } });
      }
    }

    const remainingModified = modifiedKeys.filter((key) => key !== 'system.git.repositoryPath');
    let payload = buildSettingsUpdatePayload(remainingModified, workingConfig, SETTING_SECTIONS);

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
    copyFiles,
    currentSection,
    isPathChanged,
    modifiedKeys,
    resolveConfigFromJsonDraft,
    supportsJsonModes,
    updateGitPath,
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
    setTemplates((prev) => [response.data as TemplateItem, ...prev.filter((item) => item.id !== response.data?.id)]);
    setTemplateDraft({
      name: '',
      description: '',
      content: '',
      scope: 'global',
      kind: 'document',
    });
  }, [templateDraft]);

  const handleTemplateDelete = useCallback(async (template: TemplateItem) => {
    const response = await templateApi.remove(template.id, template.scope);
    if (!response.success) return;
    setTemplates((prev) => prev.filter((item) => item.id !== template.id));
  }, []);

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

  const viewerRightSlot = currentSection ? (
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

  return (
    <PageTemplate
      filePath={`settings/${activeScope}/${currentSection.id}`}
      mode="viewer"
      description={`${SETTINGS_SCOPE_LABELS[activeScope]} · ${currentSection.description}`}
      headerExtraActions={headerActions}
      headerExtraActionsPosition="right"
      headerViewerRightSlot={viewerRightSlot}
      sidecarMode="hidden"
      contentMaxWidth={null}
    >
      <section className="flex h-full min-h-0 gap-4 overflow-hidden">
        <SettingsNavigation
          title={SETTINGS_SCOPE_LABELS[activeScope]}
          icon={scopeIcon}
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

            {isPathChanged && (
              <section className="mb-3 rounded-md border border-ssoo-content-border bg-ssoo-content-bg/40 p-3">
                <label className="flex cursor-pointer items-center gap-2 text-body-sm text-ssoo-primary">
                  <input
                    type="checkbox"
                    checked={copyFiles}
                    onChange={(event) => setCopyFiles(event.target.checked)}
                    className="h-4 w-4 rounded border-ssoo-content-border accent-ssoo-primary"
                  />
                  <FolderOpen className="h-4 w-4" />
                  <span>기존 문서 파일을 새 경로로 복사</span>
                </label>
                <p className="mt-1 pl-6 text-caption text-ssoo-primary/70">
                  경로 변경 후 Git 저장소를 다시 초기화합니다.
                </p>
              </section>
            )}

            {relativePathNotice && (
              <section className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-caption text-amber-700">
                상대 경로로 입력되었습니다. 실행 경로 기준으로 해석됩니다.
              </section>
            )}

            {isLoading ? (
              <div className="flex min-h-full items-center justify-center">
                <LoadingSpinner message="설정을 불러오는 중입니다." className="text-ssoo-primary/70" />
              </div>
            ) : currentSection.kind === 'templates' ? (
              <TemplateSection
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
