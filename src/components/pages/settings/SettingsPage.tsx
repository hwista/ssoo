'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, FolderOpen, RotateCcw } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/StateDisplay';
import { PageTemplate } from '@/components/templates';
import type { HeaderAction } from '@/components/templates/page-frame';
import { useSettingsStore } from '@/stores/settings.store';
import { CategoryNav } from './_components/CategoryNav';
import { SettingsFieldList } from './_components/SettingsFieldList';
import { TemplateSection } from './_components/TemplateSection';
import { SETTING_SECTIONS } from './_config/settingsPageConfig';
import { useTemplateManagement } from './useTemplateManagement';
import {
  buildKeyToLabelMap,
  buildSettingsUpdatePayload,
  getModifiedKeys,
  getNestedValue,
  getValidationErrors,
  isRelativePath,
  setNestedValue,
} from './_utils/settingsPageUtils';

export function SettingsPage() {
  const {
    config,
    docDir,
    isLoaded,
    isLoading,
    isSaving,
    error,
    loadSettings,
    updateSettings,
    updateGitPath,
  } = useSettingsStore();

  const [activeSection, setActiveSection] = useState(SETTING_SECTIONS[0].id);
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>({});
  const [originalConfig, setOriginalConfig] = useState<Record<string, unknown>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copyFiles, setCopyFiles] = useState(true);

  useEffect(() => {
    if (!isLoaded) {
      void loadSettings();
    }
  }, [isLoaded, loadSettings]);

  useEffect(() => {
    if (!config) return;
    const nextConfig = config as unknown as Record<string, unknown>;
    setLocalConfig(nextConfig);
    setOriginalConfig(nextConfig);
  }, [config]);

  useEffect(() => {
    if (!saveSuccess) return;
    const timeoutId = window.setTimeout(() => setSaveSuccess(false), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [saveSuccess]);

  const currentSection = useMemo(() => (
    SETTING_SECTIONS.find((section) => section.id === activeSection) ?? SETTING_SECTIONS[0]
  ), [activeSection]);

  const {
    templates,
    isLoadingTemplates,
    templateDraft,
    setTemplateDraft,
    handleTemplateSave,
    handleTemplateDelete,
  } = useTemplateManagement(activeSection);

  const keyToLabel = useMemo(() => {
    return buildKeyToLabelMap(SETTING_SECTIONS);
  }, []);

  const modifiedKeys = useMemo(() => {
    return getModifiedKeys(SETTING_SECTIONS, localConfig, originalConfig);
  }, [localConfig, originalConfig]);

  const validationErrors = useMemo(() => {
    return getValidationErrors(SETTING_SECTIONS, localConfig);
  }, [localConfig]);

  const hasChanges = modifiedKeys.length > 0;
  const hasValidationErrors = Object.keys(validationErrors).length > 0;
  const isPathChanged = modifiedKeys.includes('git.repositoryPath');
  const pathValue = String(getNestedValue(localConfig, 'git.repositoryPath') ?? '').trim();
  const relativePathNotice = isRelativePath(pathValue);

  const handleChange = useCallback((key: string, value: unknown) => {
    setLocalConfig((prev) => setNestedValue(prev, key, value));
    setSaveSuccess(false);
  }, []);

  const handleReset = useCallback(() => {
    setLocalConfig(originalConfig);
    setSaveSuccess(false);
  }, [originalConfig]);

  const handleSave = useCallback(async () => {
    if (hasValidationErrors) return;

    setSaveSuccess(false);
    let success = true;

    if (isPathChanged) {
      const newPath = String(getNestedValue(localConfig, 'git.repositoryPath') ?? '').trim();
      if (newPath) {
        success = await updateGitPath(newPath, copyFiles);
      } else {
        success = await updateSettings({ git: { repositoryPath: '' } });
      }
    }

    const remainingModified = modifiedKeys.filter((key) => key !== 'git.repositoryPath');
    if (success && remainingModified.length > 0) {
      success = await updateSettings(buildSettingsUpdatePayload(remainingModified, localConfig));
    }

    if (success) {
      setSaveSuccess(true);
    }
  }, [
    copyFiles,
    hasValidationErrors,
    isPathChanged,
    localConfig,
    modifiedKeys,
    updateGitPath,
    updateSettings,
  ]);

  const topStatusBanner = error ? (
    <div className="mb-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{error}</span>
    </div>
  ) : saveSuccess ? (
    <div className="mb-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
      <Check className="h-4 w-4 shrink-0" />
      <span>설정을 저장했습니다.</span>
    </div>
  ) : null;

  const headerActions = useMemo<HeaderAction[]>(() => {
    const actions: HeaderAction[] = [];

    if (hasChanges) {
      actions.push({
        label: `${modifiedKeys.length}개 변경`,
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
  }, [handleReset, handleSave, hasChanges, hasValidationErrors, isSaving, modifiedKeys.length]);

  return (
    <PageTemplate
      filePath={`settings/${currentSection.id}`}
      mode="viewer"
      description={currentSection.description}
      headerExtraActions={headerActions}
      headerExtraActionsPosition="right"
      sidecarMode="hidden"
      contentMaxWidth={null}
      contentSurfaceClassName="rounded-lg border border-ssoo-content-border bg-white"
    >
      <section className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <aside className="w-full shrink-0 border-b border-ssoo-content-border p-3 lg:w-60 lg:border-b-0 lg:border-r">
            <CategoryNav
              sections={SETTING_SECTIONS}
              activeSection={activeSection}
              onSelect={setActiveSection}
            />
            {docDir && (
              <div className="mt-4 rounded-md border border-ssoo-content-border bg-ssoo-content-bg/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ssoo-primary/60">현재 문서 경로</p>
                <p className="mt-1 break-all text-xs text-ssoo-primary/80">{docDir}</p>
              </div>
            )}
          </aside>

          <main className="min-h-0 flex-1 overflow-y-auto p-4">
            {topStatusBanner}

            {hasChanges && (
              <section className="mb-3 rounded-md border border-ssoo-content-border bg-ssoo-content-bg/50 px-3 py-2">
                <p className="text-xs font-semibold text-ssoo-primary">저장 예정 항목</p>
                <p className="mt-1 text-xs text-ssoo-primary/80">
                  {modifiedKeys.map((key) => keyToLabel.get(key) ?? key).join(', ')}
                </p>
              </section>
            )}

            {isPathChanged && (
              <section className="mb-3 rounded-md border border-ssoo-content-border bg-ssoo-content-bg/40 p-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-ssoo-primary">
                  <input
                    type="checkbox"
                    checked={copyFiles}
                    onChange={(event) => setCopyFiles(event.target.checked)}
                    className="h-4 w-4 rounded border-ssoo-content-border accent-ssoo-primary"
                  />
                  <FolderOpen className="h-4 w-4" />
                  <span>기존 문서 파일을 새 경로로 복사</span>
                </label>
                <p className="mt-1 pl-6 text-xs text-ssoo-primary/70">
                  경로 변경 후 Git 저장소를 다시 초기화합니다.
                </p>
              </section>
            )}

            {relativePathNotice && (
              <section className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                상대 경로로 입력되었습니다. 실행 경로 기준으로 해석됩니다.
              </section>
            )}

            {isLoading ? (
              <div className="flex min-h-full items-center justify-center">
                <LoadingSpinner message="설정을 불러오는 중입니다." className="text-ssoo-primary/70" />
              </div>
            ) : currentSection.id === 'templates' ? (
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
            ) : (
              <SettingsFieldList
                items={currentSection.items}
                localConfig={localConfig}
                originalConfig={originalConfig}
                validationErrors={validationErrors}
                getValue={getNestedValue}
                onChange={handleChange}
              />
            )}
          </main>
        </div>
      </section>
    </PageTemplate>
  );
}
