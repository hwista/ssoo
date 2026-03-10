'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, FolderOpen, GitBranch, Loader2, RotateCcw, Database, HardDrive, Shapes } from 'lucide-react';
import { DocPageTemplate } from '@/components/templates';
import type { HeaderAction } from '@/components/common/page';
import { useSettingsStore } from '@/stores/settings.store';
import { templateApi } from '@/lib/api';
import type { DeepPartialClient, DmsConfigClient } from '@/lib/api';
import type { TemplateItem, TemplateKind, TemplateScope } from '@/types/template';
import { CategoryNav } from './_components/CategoryNav';
import { SettingsFieldList } from './_components/SettingsFieldList';
import { TemplateSection } from './_components/TemplateSection';

interface SettingItem {
  key: string;
  label: string;
  helpKey: string;
  description: string;
  type: 'text' | 'email' | 'checkbox' | 'select';
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  validate?: (value: unknown) => string | null;
}

interface SettingSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  items: SettingItem[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STORAGE_PROVIDER_OPTIONS = [
  { label: 'SharePoint', value: 'sharepoint' },
  { label: 'Local', value: 'local' },
  { label: 'NAS', value: 'nas' },
];

const SETTING_SECTIONS: SettingSection[] = [
  {
    id: 'git',
    label: 'Git',
    icon: GitBranch,
    description: '문서 저장소 경로와 커밋 작성자 정보를 관리합니다.',
    items: [
      {
        key: 'git.repositoryPath',
        label: '위키 저장소 경로',
        helpKey: 'git.repositoryPath',
        description: '비워두면 기본 경로(data/wiki)를 사용합니다.',
        type: 'text',
        placeholder: '~/dms-wiki',
      },
      {
        key: 'git.author.name',
        label: '작성자 이름',
        helpKey: 'git.author.name',
        description: 'Git 커밋 작성자 이름으로 사용됩니다.',
        type: 'text',
        placeholder: 'DMS System',
        validate: (value) => String(value ?? '').trim().length > 0 ? null : '작성자 이름은 필수입니다.',
      },
      {
        key: 'git.author.email',
        label: '작성자 이메일',
        helpKey: 'git.author.email',
        description: 'Git 커밋 작성자 이메일로 사용됩니다.',
        type: 'email',
        placeholder: 'dms@localhost',
        validate: (value) => {
          const text = String(value ?? '').trim();
          if (!text) return '작성자 이메일은 필수입니다.';
          return EMAIL_REGEX.test(text) ? null : '이메일 형식이 올바르지 않습니다.';
        },
      },
      {
        key: 'git.autoInit',
        label: '저장소 자동 초기화',
        helpKey: 'git.autoInit',
        description: '저장소 경로에 .git이 없으면 자동으로 git init을 수행합니다.',
        type: 'checkbox',
      },
    ],
  },
  {
    id: 'storage',
    label: 'Storage',
    icon: HardDrive,
    description: 'Local/SharePoint/NAS 저장소 정책을 관리합니다.',
    items: [
      {
        key: 'storage.defaultProvider',
        label: '기본 저장소',
        helpKey: 'storage.defaultProvider',
        description: '정본/첨부 업로드 시 기본으로 사용할 저장소입니다.',
        type: 'select',
        options: STORAGE_PROVIDER_OPTIONS,
      },
      {
        key: 'storage.local.basePath',
        label: 'Local 기본 경로',
        helpKey: 'storage.local.basePath',
        description: 'Local 저장소 루트 경로입니다.',
        type: 'text',
        placeholder: './data/storage/local',
      },
      {
        key: 'storage.sharepoint.basePath',
        label: 'SharePoint 경로',
        helpKey: 'storage.sharepoint.basePath',
        description: 'SharePoint 라이브러리 경로입니다.',
        type: 'text',
        placeholder: '/sites/dms/shared-documents',
      },
      {
        key: 'storage.nas.basePath',
        label: 'NAS 경로',
        helpKey: 'storage.nas.basePath',
        description: 'NAS 마운트 경로 또는 게이트웨이 기본 경로입니다.',
        type: 'text',
        placeholder: '/mnt/nas/dms',
      },
    ],
  },
  {
    id: 'ingest',
    label: 'Ingest',
    icon: Database,
    description: '자동 수집 큐와 게시 정책을 관리합니다.',
    items: [
      {
        key: 'ingest.queuePath',
        label: '수집 큐 경로',
        helpKey: 'ingest.queuePath',
        description: '수집 작업 JSON 큐 파일을 저장하는 경로입니다.',
        type: 'text',
        placeholder: './data/ingest',
      },
      {
        key: 'ingest.autoPublish',
        label: '자동 게시',
        helpKey: 'ingest.autoPublish',
        description: '활성화 시 컨펌 없이 즉시 게시합니다.',
        type: 'checkbox',
      },
      {
        key: 'ingest.maxConcurrentJobs',
        label: '동시 처리 작업 수',
        helpKey: 'ingest.maxConcurrentJobs',
        description: '수집 큐 최대 동시 처리 작업 수입니다.',
        type: 'text',
        placeholder: '2',
        validate: (value) => {
          const num = Number(value);
          if (!Number.isFinite(num) || num < 1) return '1 이상의 숫자를 입력하세요.';
          return null;
        },
      },
    ],
  },
  {
    id: 'templates',
    label: 'Template',
    icon: Shapes,
    description: '전역/개인 템플릿과 폴더 구조 템플릿을 관리합니다.',
    items: [],
  },
];

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split('.');
  const result = { ...obj };
  let current: Record<string, unknown> = result;

  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    current[key] = { ...((current[key] as Record<string, unknown>) || {}) };
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return result;
}

function isRelativePath(pathText: string): boolean {
  if (!pathText.trim()) return false;
  if (pathText.startsWith('/') || pathText.startsWith('~')) return false;
  if (/^[A-Za-z]:[\\/]/.test(pathText)) return false;
  return true;
}

export function SettingsPage() {
  const {
    config,
    wikiDir,
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
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templateDraft, setTemplateDraft] = useState({
    name: '',
    description: '',
    content: '',
    scope: 'personal' as TemplateScope,
    kind: 'document' as TemplateKind,
  });

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

  useEffect(() => {
    if (activeSection !== 'templates') return;
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
  }, [activeSection]);

  const keyToLabel = useMemo(() => {
    const map = new Map<string, string>();
    SETTING_SECTIONS.forEach((section) => {
      section.items.forEach((item) => {
        map.set(item.key, item.label);
      });
    });
    return map;
  }, []);

  const modifiedKeys = useMemo(() => {
    const keys: string[] = [];
    SETTING_SECTIONS.forEach((section) => {
      section.items.forEach((item) => {
        const localValue = getNestedValue(localConfig, item.key);
        const originalValue = getNestedValue(originalConfig, item.key);
        if (localValue !== originalValue) {
          keys.push(item.key);
        }
      });
    });
    return keys;
  }, [localConfig, originalConfig]);

  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    SETTING_SECTIONS.forEach((section) => {
      section.items.forEach((item) => {
        if (!item.validate) return;
        const value = getNestedValue(localConfig, item.key);
        const message = item.validate(value);
        if (message) {
          errors[item.key] = message;
        }
      });
    });
    return errors;
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
      let partial: Record<string, unknown> = {};
      remainingModified.forEach((key) => {
        const rawValue = getNestedValue(localConfig, key);
        const value = key === 'ingest.maxConcurrentJobs' ? Number(rawValue) : rawValue;
        partial = setNestedValue(partial, key, value);
      });
      success = await updateSettings(partial as DeepPartialClient<DmsConfigClient>);
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
      scope: 'personal',
      kind: 'document',
    });
  }, [templateDraft]);

  const handleTemplateDelete = useCallback(async (template: TemplateItem) => {
    const response = await templateApi.remove(template.id, template.scope);
    if (!response.success) return;
    setTemplates((prev) => prev.filter((item) => item.id !== template.id));
  }, []);

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
      icon: isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />,
      variant: 'default',
      onClick: () => {
        void handleSave();
      },
      disabled: !hasChanges || hasValidationErrors || isSaving,
    });

    return actions;
  }, [handleReset, handleSave, hasChanges, hasValidationErrors, isSaving, modifiedKeys.length]);

  return (
    <DocPageTemplate
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
            {wikiDir && (
              <div className="mt-4 rounded-md border border-ssoo-content-border bg-ssoo-content-bg/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ssoo-primary/60">현재 위키 경로</p>
                <p className="mt-1 break-all text-xs text-ssoo-primary/80">{wikiDir}</p>
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
                  <span>기존 위키 파일을 새 경로로 복사</span>
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
              <div className="flex h-32 items-center justify-center gap-2 text-sm text-ssoo-primary/70">
                <Loader2 className="h-4 w-4 animate-spin" />
                설정을 불러오는 중입니다.
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
    </DocPageTemplate>
  );
}
