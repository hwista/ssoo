import type { JsonFieldDescriptor } from '@/components/common/json';
import type { SettingsScope, SettingsViewMode } from '@/types/settings';
import { Database, FileSearch, GitBranch, HardDrive, Shapes, UserRound, Workflow } from 'lucide-react';

export interface SettingItem extends JsonFieldDescriptor {
  validate?: (value: unknown) => string | null;
  coerce?: (value: unknown) => unknown;
}

export interface SettingSection {
  id: string;
  scope: SettingsScope;
  jsonPath: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  kind?: 'fields' | 'templates';
  items: SettingItem[];
}

export interface SettingSearchEntry {
  id: string;
  scope: SettingsScope;
  sectionId: string;
  kind: 'section' | 'field';
  title: string;
  subtitle: string;
  score: number;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toNumber = (value: unknown) => Number(value);

const normalizeSearchText = (value: string) => value.trim().toLowerCase();

const getSearchScore = (query: string, ...values: Array<string | undefined>) => {
  let score = 0;

  values.forEach((value, index) => {
    const normalizedValue = normalizeSearchText(value ?? '');
    if (!normalizedValue) return;

    if (normalizedValue === query) {
      score += index === 0 ? 600 : 300;
      return;
    }

    if (normalizedValue.startsWith(query)) {
      score += index === 0 ? 420 : 180;
      return;
    }

    if (normalizedValue.includes(query)) {
      score += index === 0 ? 260 : 120;
    }
  });

  return score;
};

export const STORAGE_PROVIDER_OPTIONS = [
  { label: 'System default', value: 'system-default' },
  { label: 'SharePoint', value: 'sharepoint' },
  { label: 'Local', value: 'local' },
  { label: 'NAS', value: 'nas' },
] as const;

export const SYSTEM_STORAGE_PROVIDER_OPTIONS = STORAGE_PROVIDER_OPTIONS.filter((option) => option.value !== 'system-default');

export const SETTINGS_SCOPE_LABELS: Record<SettingsScope, string> = {
  system: '시스템 설정',
  personal: '개인 설정',
};

export const SETTINGS_VIEW_MODE_LABELS: Record<SettingsViewMode, string> = {
  structured: '구조화',
  json: 'JSON',
  diff: 'Diff',
};

export const SETTINGS_VIEW_MODE_OPTIONS = [
  { label: '구조화', value: 'structured' },
  { label: 'JSON', value: 'json' },
] as const;

export const SETTINGS_SCOPE_OPTIONS = [
  { label: '시스템 설정', value: 'system' },
  { label: '개인 설정', value: 'personal' },
] as const;

export const SETTING_SECTIONS: SettingSection[] = [
  {
    id: 'git',
    scope: 'system',
    jsonPath: 'system.git',
    label: 'Git',
    icon: GitBranch,
    description: '문서 저장소 경로와 저장소 초기화 정책을 관리합니다.',
    items: [
      {
        key: 'system.git.repositoryPath',
        label: '문서 저장소 경로',
        helpKey: 'system.git.repositoryPath',
        description: '비워두면 기본 경로(data/documents)를 사용합니다.',
        type: 'text',
        placeholder: '~/dms-docs',
      },
      {
        key: 'system.git.autoInit',
        label: '저장소 자동 초기화',
        helpKey: 'system.git.autoInit',
        description: '저장소 경로에 .git이 없으면 자동으로 git init을 수행합니다.',
        type: 'checkbox',
      },
    ],
  },
  {
    id: 'storage',
    scope: 'system',
    jsonPath: 'system.storage',
    label: 'Storage',
    icon: HardDrive,
    description: 'Local/SharePoint/NAS 저장소 정책을 관리합니다.',
    items: [
      {
        key: 'system.storage.defaultProvider',
        label: '기본 저장소',
        helpKey: 'system.storage.defaultProvider',
        description: '정본/첨부 업로드 시 기본으로 사용할 저장소입니다.',
        type: 'select',
        options: [...SYSTEM_STORAGE_PROVIDER_OPTIONS],
      },
      {
        key: 'system.storage.local.basePath',
        label: 'Local 기본 경로',
        helpKey: 'system.storage.local.basePath',
        description: 'Local 저장소 루트 경로입니다.',
        type: 'text',
        placeholder: './data/storage/local',
      },
      {
        key: 'system.storage.sharepoint.basePath',
        label: 'SharePoint 경로',
        helpKey: 'system.storage.sharepoint.basePath',
        description: 'SharePoint 라이브러리 경로입니다.',
        type: 'text',
        placeholder: '/sites/dms/shared-documents',
      },
      {
        key: 'system.storage.nas.basePath',
        label: 'NAS 경로',
        helpKey: 'system.storage.nas.basePath',
        description: 'NAS 마운트 경로 또는 게이트웨이 기본 경로입니다.',
        type: 'text',
        placeholder: '/mnt/nas/dms',
      },
    ],
  },
  {
    id: 'ingest',
    scope: 'system',
    jsonPath: 'system.ingest',
    label: 'Ingest',
    icon: Database,
    description: '자동 수집 큐와 게시 정책을 관리합니다.',
    items: [
      {
        key: 'system.ingest.queuePath',
        label: '수집 큐 경로',
        helpKey: 'system.ingest.queuePath',
        description: '수집 작업 JSON 큐 파일을 저장하는 경로입니다.',
        type: 'text',
        placeholder: './data/ingest',
      },
      {
        key: 'system.ingest.autoPublish',
        label: '자동 게시',
        helpKey: 'system.ingest.autoPublish',
        description: '활성화 시 컨펌 없이 즉시 게시합니다.',
        type: 'checkbox',
      },
      {
        key: 'system.ingest.maxConcurrentJobs',
        label: '동시 처리 작업 수',
        helpKey: 'system.ingest.maxConcurrentJobs',
        description: '수집 큐 최대 동시 처리 작업 수입니다.',
        type: 'text',
        placeholder: '2',
        coerce: toNumber,
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
    scope: 'system',
    jsonPath: 'system.templates',
    label: 'Template',
    icon: Shapes,
    description: '전역/개인 템플릿과 폴더 구조 템플릿을 관리합니다.',
    kind: 'templates',
    items: [],
  },
  {
    id: 'extraction',
    scope: 'system',
    jsonPath: 'system.extraction',
    label: 'Extraction',
    icon: FileSearch,
    description: 'AI 문서 분석 시 텍스트/이미지 추출 설정을 관리합니다.',
    items: [
      {
        key: 'system.extraction.maxTextLength',
        label: '텍스트 추출 상한',
        helpKey: 'system.extraction.maxTextLength',
        description: '문서에서 추출하는 텍스트 최대 길이(자)입니다.',
        type: 'text',
        placeholder: '12000',
        coerce: toNumber,
        validate: (value) => {
          const num = Number(value);
          if (!Number.isFinite(num) || num < 1000) return '1000 이상의 숫자를 입력하세요.';
          return null;
        },
      },
      {
        key: 'system.extraction.maxImages',
        label: '최대 추출 이미지 수',
        helpKey: 'system.extraction.maxImages',
        description: '문서당 AI에 전달하는 최대 이미지 수입니다.',
        type: 'text',
        placeholder: '5',
        coerce: toNumber,
        validate: (value) => {
          const num = Number(value);
          if (!Number.isFinite(num) || num < 1 || num > 20) return '1~20 사이의 숫자를 입력하세요.';
          return null;
        },
      },
      {
        key: 'system.extraction.maxImageSizeMb',
        label: '추출 이미지 최대 크기 (MB)',
        helpKey: 'system.extraction.maxImageSizeMb',
        description: '개별 추출 이미지의 최대 크기(MB)입니다.',
        type: 'text',
        placeholder: '1',
        coerce: toNumber,
        validate: (value) => {
          const num = Number(value);
          if (!Number.isFinite(num) || num < 0.1) return '0.1 이상의 숫자를 입력하세요.';
          return null;
        },
      },
      {
        key: 'system.extraction.pdfMaxRenderPages',
        label: 'PDF 렌더링 페이지 수',
        helpKey: 'system.extraction.pdfMaxRenderPages',
        description: 'PDF에서 이미지로 렌더링할 최대 페이지 수입니다.',
        type: 'text',
        placeholder: '3',
        coerce: toNumber,
        validate: (value) => {
          const num = Number(value);
          if (!Number.isFinite(num) || num < 1 || num > 20) return '1~20 사이의 숫자를 입력하세요.';
          return null;
        },
      },
      {
        key: 'system.extraction.pdfRenderScale',
        label: 'PDF 렌더링 스케일',
        helpKey: 'system.extraction.pdfRenderScale',
        description: 'PDF 페이지 렌더링 배율입니다. 1.0이 원본 크기, 2.0이면 2배 해상도입니다.',
        type: 'text',
        placeholder: '1.0',
        coerce: toNumber,
        validate: (value) => {
          const num = Number(value);
          if (!Number.isFinite(num) || num < 0.5 || num > 4.0) return '0.5~4.0 사이의 숫자를 입력하세요.';
          return null;
        },
      },
    ],
  },
  {
    id: 'identity',
    scope: 'personal',
    jsonPath: 'personal.identity',
    label: 'Identity',
    icon: UserRound,
    description: '익명/개인 환경에서 사용하는 작성자 이름과 이메일을 관리합니다.',
    items: [
      {
        key: 'personal.identity.displayName',
        label: '작성자 이름',
        helpKey: 'personal.identity.displayName',
        description: 'Git 커밋 작성자와 템플릿 작성자 이름으로 사용됩니다.',
        type: 'text',
        placeholder: 'Anonymous',
        validate: (value) => String(value ?? '').trim().length > 0 ? null : '작성자 이름은 필수입니다.',
      },
      {
        key: 'personal.identity.email',
        label: '작성자 이메일',
        helpKey: 'personal.identity.email',
        description: 'Git 커밋 작성자 이메일로 사용됩니다.',
        type: 'email',
        placeholder: 'anonymous@dms.local',
        validate: (value) => {
          const text = String(value ?? '').trim();
          if (!text) return '작성자 이메일은 필수입니다.';
          return EMAIL_REGEX.test(text) ? null : '이메일 형식이 올바르지 않습니다.';
        },
      },
    ],
  },
  {
    id: 'workspace',
    scope: 'personal',
    jsonPath: 'personal.workspace',
    label: 'Workspace',
    icon: Workflow,
    description: '설정 화면 진입 방식과 개인 작업 선호값을 관리합니다.',
    items: [
      {
        key: 'personal.workspace.defaultSettingsScope',
        label: '기본 설정 스코프',
        helpKey: 'personal.workspace.defaultSettingsScope',
        description: '설정 모드 진입 시 기본으로 열 스코프입니다.',
        type: 'select',
        options: [...SETTINGS_SCOPE_OPTIONS],
      },
      {
        key: 'personal.workspace.defaultSettingsView',
        label: '기본 설정 보기',
        helpKey: 'personal.workspace.defaultSettingsView',
        description: '설정 모드 진입 시 기본으로 열 보기 모드입니다.',
        type: 'select',
        options: [...SETTINGS_VIEW_MODE_OPTIONS],
      },
      {
        key: 'personal.workspace.showDiffByDefault',
        label: '설정 진입 시 Diff 우선 표시',
        helpKey: 'personal.workspace.showDiffByDefault',
        description: '활성화 시 설정 모드 진입 시 diff 보기로 시작합니다.',
        type: 'checkbox',
      },
      {
        key: 'personal.workspace.preferredStorageProvider',
        label: '선호 저장소',
        helpKey: 'personal.workspace.preferredStorageProvider',
        description: '개인 작업 시 우선적으로 사용할 저장소입니다.',
        type: 'select',
        options: [...STORAGE_PROVIDER_OPTIONS],
      },
    ],
  },
];

export function getSettingSectionsByScope(scope: SettingsScope): SettingSection[] {
  return SETTING_SECTIONS.filter((section) => section.scope === scope);
}

export function getSettingSection(scope: SettingsScope, sectionId: string): SettingSection | undefined {
  return getSettingSectionsByScope(scope).find((section) => section.id === sectionId);
}

export function searchSettingEntries(query: string): SettingSearchEntry[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const results: SettingSearchEntry[] = [];

  SETTING_SECTIONS.forEach((section) => {
    const scopeLabel = SETTINGS_SCOPE_LABELS[section.scope];
    const sectionScore =
      getSearchScore(normalizedQuery, section.label, section.description, scopeLabel, section.id) + 40;

    if (sectionScore > 40) {
      results.push({
        id: `section:${section.scope}:${section.id}`,
        scope: section.scope,
        sectionId: section.id,
        kind: 'section',
        title: section.label,
        subtitle: `${scopeLabel} · ${section.description}`,
        score: sectionScore,
      });
    }

    section.items.forEach((item) => {
      const fieldScore = getSearchScore(
        normalizedQuery,
        item.label,
        item.description,
        section.label,
        scopeLabel,
        item.helpKey
      );

      if (fieldScore === 0) return;

      results.push({
        id: `field:${section.scope}:${section.id}:${item.key}`,
        scope: section.scope,
        sectionId: section.id,
        kind: 'field',
        title: item.label,
        subtitle: `${scopeLabel} / ${section.label}${item.description ? ` · ${item.description}` : ''}`,
        score: fieldScore,
      });
    });
  });

  return results.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    if (left.kind !== right.kind) {
      return left.kind === 'section' ? -1 : 1;
    }

    return left.title.localeCompare(right.title);
  });
}
