'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Settings,
  GitBranch,
  FolderOpen,
  User,
  Save,
  Loader2,
  AlertCircle,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useSettingsStore } from '@/stores/settings.store';

// ============================================================================
// Types
// ============================================================================

/** 설정 항목 정의 */
interface SettingItem {
  key: string;
  label: string;
  description: string;
  type: 'text' | 'email' | 'checkbox' | 'readonly';
  placeholder?: string;
}

/** 설정 섹션 정의 */
interface SettingSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  items: SettingItem[];
}

// ============================================================================
// Setting Definitions (JSON 스키마 기반)
// ============================================================================

const SETTING_SECTIONS: SettingSection[] = [
  {
    id: 'git',
    label: 'Git',
    icon: GitBranch,
    description: 'Git 저장소 및 버전 관리 설정',
    items: [
      {
        key: 'git.repositoryPath',
        label: 'git.repositoryPath',
        description: '위키 문서를 저장하는 Git 저장소 경로. 비어있으면 기본 경로(docs/wiki)를 사용합니다.',
        type: 'text',
        placeholder: '~/dms-wiki',
      },
      {
        key: 'git.author.name',
        label: 'git.author.name',
        description: 'Git 커밋 시 사용할 작성자 이름.',
        type: 'text',
        placeholder: 'DMS System',
      },
      {
        key: 'git.author.email',
        label: 'git.author.email',
        description: 'Git 커밋 시 사용할 작성자 이메일.',
        type: 'email',
        placeholder: 'dms@localhost',
      },
      {
        key: 'git.autoInit',
        label: 'git.autoInit',
        description: '저장소 경로에 .git이 없을 때 자동으로 git init을 실행합니다.',
        type: 'checkbox',
      },
    ],
  },
];

// ============================================================================
// Helpers
// ============================================================================

/** 점 표기법으로 중첩 객체의 값 읽기 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

/** 점 표기법으로 중첩 객체에 값 쓰기 (immutable) */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split('.');
  const result = { ...obj };
  let current: Record<string, unknown> = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    current[key] = { ...(current[key] as Record<string, unknown> || {}) };
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return result;
}

// ============================================================================
// Sub-components
// ============================================================================

/** 개별 설정 항목 렌더러 */
function SettingRow({
  item,
  value,
  originalValue,
  onChange,
}: {
  item: SettingItem;
  value: unknown;
  originalValue: unknown;
  onChange: (key: string, value: unknown) => void;
}) {
  const isModified = value !== originalValue;
  const strVal = (value ?? '') as string;
  const boolVal = Boolean(value);

  return (
    <div className="py-3 group">
      <div className="flex items-start gap-3">
        {/* 수정 표시 마커 */}
        <div className="w-1 self-stretch rounded-full mt-0.5 shrink-0" style={{ backgroundColor: isModified ? 'var(--color-blue-500, #3b82f6)' : 'transparent' }} />

        <div className="flex-1 min-w-0">
          {/* 키 이름 (VS Code 스타일 — 모노스페이스) */}
          <label
            htmlFor={`setting-${item.key}`}
            className="text-sm font-medium text-foreground font-mono cursor-pointer"
          >
            {item.label}
          </label>

          {/* 설명 */}
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">
            {item.description}
          </p>

          {/* 입력 컨트롤 */}
          {item.type === 'checkbox' ? (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                id={`setting-${item.key}`}
                type="checkbox"
                checked={boolVal}
                onChange={(e) => onChange(item.key, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-muted-foreground">
                {boolVal ? '활성화됨' : '비활성화됨'}
              </span>
            </label>
          ) : item.type === 'readonly' ? (
            <div className="text-sm text-muted-foreground font-mono bg-muted/50 rounded px-3 py-1.5 inline-block">
              {strVal || '(없음)'}
            </div>
          ) : (
            <input
              id={`setting-${item.key}`}
              type={item.type}
              value={strVal}
              onChange={(e) => onChange(item.key, e.target.value)}
              placeholder={item.placeholder}
              className="flex h-control-h w-full max-w-lg rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** 왼쪽 카테고리 내비게이션 */
function CategoryNav({
  sections,
  activeSection,
  onSelect,
}: {
  sections: SettingSection[];
  activeSection: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="space-y-0.5">
      {sections.map((section) => {
        const Icon = section.icon;
        const isActive = section.id === activeSection;
        return (
          <button
            key={section.id}
            onClick={() => onSelect(section.id)}
            className={`
              w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors cursor-pointer
              ${isActive
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }
            `}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{section.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SettingsPage() {
  const {
    config,
    wikiDir,
    isLoaded,
    isLoading,
    isSaving,
    error,
    loadSettings,
    updateGitSettings,
    updateGitPath,
  } = useSettingsStore();

  // 활성 설정 섹션
  const [activeSection, setActiveSection] = useState(SETTING_SECTIONS[0].id);

  // 로컬 편집 상태 (원본과 비교용)
  const [localConfig, setLocalConfig] = useState<Record<string, unknown>>({});
  const [originalConfig, setOriginalConfig] = useState<Record<string, unknown>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copyFiles, setCopyFiles] = useState(true);

  // 마운트 시 설정 로드
  useEffect(() => {
    if (!isLoaded) {
      loadSettings();
    }
  }, [isLoaded, loadSettings]);

  // 설정이 로드/업데이트되면 로컬에 반영
  useEffect(() => {
    if (config) {
      const flat = config as unknown as Record<string, unknown>;
      setLocalConfig(flat);
      setOriginalConfig(flat);
    }
  }, [config]);

  // 현재 활성 섹션
  const currentSection = useMemo(
    () => SETTING_SECTIONS.find((s) => s.id === activeSection) ?? SETTING_SECTIONS[0],
    [activeSection],
  );

  // 변경 여부 계산
  const modifiedKeys = useMemo(() => {
    const keys: string[] = [];
    for (const section of SETTING_SECTIONS) {
      for (const item of section.items) {
        const local = getNestedValue(localConfig, item.key);
        const original = getNestedValue(originalConfig, item.key);
        if (local !== original) keys.push(item.key);
      }
    }
    return keys;
  }, [localConfig, originalConfig]);

  const hasChanges = modifiedKeys.length > 0;

  // 경로 변경 여부
  const isPathChanged = modifiedKeys.includes('git.repositoryPath');

  /** 항목 값 변경 */
  const handleChange = useCallback((key: string, value: unknown) => {
    setLocalConfig((prev) => setNestedValue(prev, key, value));
    setSaveSuccess(false);
  }, []);

  /** 변경 초기화 */
  const handleReset = useCallback(() => {
    setLocalConfig(originalConfig);
    setSaveSuccess(false);
  }, [originalConfig]);

  /** 저장 */
  const handleSave = useCallback(async () => {
    setSaveSuccess(false);
    let success = true;

    // 1. 경로가 변경된 경우
    if (isPathChanged) {
      const newPath = getNestedValue(localConfig, 'git.repositoryPath') as string;
      if (newPath?.trim()) {
        success = await updateGitPath(newPath.trim(), copyFiles);
      }
    }

    // 2. 나머지 git 설정 변경
    const gitModified = modifiedKeys.filter((k) => k !== 'git.repositoryPath');
    if (success && gitModified.length > 0) {
      const gitPartial: Record<string, unknown> = {};
      for (const key of gitModified) {
        const subKey = key.replace('git.', '');
        const value = getNestedValue(localConfig, key);
        // author.name → { author: { name: value } }
        const parts = subKey.split('.');
        let current = gitPartial;
        for (let i = 0; i < parts.length - 1; i++) {
          current[parts[i]] = current[parts[i]] || {};
          current = current[parts[i]] as Record<string, unknown>;
        }
        current[parts[parts.length - 1]] = value;
      }
      success = await updateGitSettings(gitPartial);
    }

    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  }, [isPathChanged, modifiedKeys, localConfig, copyFiles, updateGitPath, updateGitSettings]);

  // ======== Render ========

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">설정 로드 중...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white">
      {/* 왼쪽: 카테고리 내비게이션 */}
      <aside className="w-48 shrink-0 border-r border-border p-3 overflow-y-auto">
        <div className="flex items-center gap-2 px-3 py-2 mb-2">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">설정</h2>
        </div>
        <CategoryNav
          sections={SETTING_SECTIONS}
          activeSection={activeSection}
          onSelect={setActiveSection}
        />

        {/* 현재 위키 경로 (정보) */}
        {wikiDir && (
          <div className="mt-6 px-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
              위키 경로
            </p>
            <p className="text-xs text-muted-foreground font-mono break-all">
              {wikiDir}
            </p>
          </div>
        )}
      </aside>

      {/* 오른쪽: 설정 항목 */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* 상단 바: 섹션 제목 + 저장 버튼 */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {currentSection.label}
            </h3>
            <p className="text-xs text-muted-foreground">
              {currentSection.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* 변경 카운트 */}
            {hasChanges && (
              <span className="text-xs text-blue-600 bg-blue-50 rounded-full px-2 py-0.5 font-medium">
                {modifiedKeys.length}개 변경
              </span>
            )}

            {/* 초기화 */}
            <button
              onClick={handleReset}
              disabled={!hasChanges || isSaving}
              className="flex items-center gap-1.5 h-control-h px-3 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              초기화
            </button>

            {/* 저장 */}
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="flex items-center gap-1.5 h-control-h px-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {isSaving ? '저장 중...' : saveSuccess ? '저장됨' : '저장'}
            </button>
          </div>
        </header>

        {/* 설정 항목 목록 */}
        <div className="flex-1 overflow-y-auto px-6 py-2">
          {/* 경로 변경 시 파일 복사 옵션 */}
          {isPathChanged && (
            <div className="my-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyFiles}
                  onChange={(e) => setCopyFiles(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <FolderOpen className="w-4 h-4 text-blue-600" />
                <span className="text-blue-800">기존 파일을 새 저장소 경로로 복사</span>
              </label>
              <p className="text-xs text-blue-600 mt-1 ml-6">
                저장소 경로 변경 시 현재 위키 파일을 새 경로로 복사하고 Git을 초기화합니다.
              </p>
            </div>
          )}

          {/* 항목 렌더링 */}
          <div className="divide-y divide-border">
            {currentSection.items.map((item) => (
              <SettingRow
                key={item.key}
                item={item}
                value={getNestedValue(localConfig, item.key)}
                originalValue={getNestedValue(originalConfig, item.key)}
                onChange={handleChange}
              />
            ))}
          </div>

          {/* 에러 표시 */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 mt-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 성공 표시 */}
          {saveSuccess && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-md px-3 py-2 mt-4">
              <Check className="w-4 h-4 shrink-0" />
              <span>설정이 저장되었습니다.</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
