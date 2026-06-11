import type { JsonFieldDescriptor } from '@/components/common/json';
import type { SettingsScope, SettingsViewMode } from '@/types/settings';
import {
  Bot,
  Database,
  ExternalLink,
  FileSearch,
  FolderOpen,
  GitBranch,
  HardDrive,
  PanelLeft,
  Search,
  Shapes,
  Shield,
  Upload,
  UserRound,
  Workflow,
} from 'lucide-react';


export interface SettingItem extends JsonFieldDescriptor {
  validate?: (value: unknown) => string | null;
  coerce?: (value: unknown) => unknown;
}

export interface SettingSection {
  id: string;
  scope: SettingsScope;
  group: SettingSectionGroup;
  jsonPath: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  kind?: 'fields' | 'custom';
  slotKey?: 'document-access' | 'admin-templates' | 'external-settings';
  items: SettingItem[];
}

export type SettingSectionGroup = 'operations' | 'system' | 'management' | 'personal' | 'external';

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
const toInteger = (value: unknown) => Math.trunc(Number(value));
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
  personal: '내 설정',
};

export const SETTINGS_SECTION_GROUP_LABELS: Record<SettingSectionGroup, string> = {
  operations: '운영 상태',
  system: '시스템 설정',
  management: '관리 업무',
  personal: '내 설정',
  external: '외부 설정 링크',
};

export const SETTINGS_SECTION_GROUP_ORDER: SettingSectionGroup[] = [
  'operations',
  'system',
  'management',
  'personal',
  'external',
];

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
  { label: '내 설정', value: 'personal' },
] as const;

const VIEWER_ZOOM_OPTIONS = [
  { label: '75%', value: '75' },
  { label: '100%', value: '100' },
  { label: '125%', value: '125' },
  { label: '150%', value: '150' },
  { label: '175%', value: '175' },
  { label: '200%', value: '200' },
] as const;

const validatePositiveInteger = (value: unknown, minimum: number, message: string) => {
  const num = Number(value);
  if (!Number.isFinite(num) || !Number.isInteger(num) || num < minimum) {
    return message;
  }
  return null;
};

export const SETTING_SECTIONS: SettingSection[] = [
  {
    id: 'documentAccess',
    scope: 'system',
    group: 'management',
    jsonPath: 'system.documentAccess',
    label: '문서 권한 관리',
    icon: Shield,
    description: '문서의 접근 권한, 요청/승인, grant 회수, 공개 범위, 소유권 이전을 실제 운영 화면에서 처리합니다.',
    kind: 'custom',
    slotKey: 'document-access',
    items: [],
  },
  {
    id: 'git',
    scope: 'system',
    group: 'operations',
    jsonPath: 'system.git',
    label: '문서 저장소 상태',
    icon: GitBranch,
    description: 'runtime role(prod/dev/local-test) 기준으로 결정되는 document Git binding observability 를 읽기 전용으로 확인합니다.',
    items: [
      {
        key: 'system.git.bootstrapRemoteUrl',
        label: 'Bootstrap Remote URL',
        helpKey: 'system.git.bootstrapRemoteUrl',
        description: '런타임 역할 계약으로 결정된 canonical document remote 입니다. settings 에서 수정하지 않습니다.',
        type: 'text',
        placeholder: 'runtime-managed',
      },
      {
        key: 'system.git.bootstrapBranch',
        label: 'Bootstrap Branch',
        helpKey: 'system.git.bootstrapBranch',
        description: '빈 working tree clone/init 에 사용하는 branch 입니다. 기본값은 master 이며 settings 에서 수정하지 않습니다.',
        type: 'text',
        placeholder: 'master',
      },
      {
        key: 'system.git.autoInit',
        label: '저장소 자동 초기화',
        helpKey: 'system.git.autoInit',
        description: '현재 runtime bootstrap 정책을 그대로 보여 줍니다. Git section 은 observability 전용이므로 저장으로 바꾸지 않습니다.',
        type: 'checkbox',
      },
    ],
  },
  {
    id: 'storage',
    scope: 'system',
    group: 'system',
    jsonPath: 'system.storage',
    label: '첨부 저장소 정책',
    icon: HardDrive,
    description: 'Git 비대상 binary/runtime storage roots 와 provider 정책을 관리합니다.',
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
        description: 'Local binary storage root 입니다. attachment/reference/image 는 이 외부 경로를 사용할 수 있습니다.',
        type: 'text',
        placeholder: '/var/lib/ssoo/document-storage/local',
      },
      {
        key: 'system.storage.local.enabled',
        label: 'Local 저장소 활성화',
        helpKey: 'system.storage.local.enabled',
        description: 'Local provider를 업로드 대상 후보로 허용합니다.',
        type: 'checkbox',
      },
      {
        key: 'system.storage.local.webBaseUrl',
        label: 'Local 웹 기본 URL',
        helpKey: 'system.storage.local.webBaseUrl',
        description: '브라우저 열기 시 사용할 public base URL입니다. 비워두면 내부 open API를 사용합니다.',
        type: 'text',
        placeholder: 'http://localhost:3003/storage/local',
      },
      {
        key: 'system.storage.sharepoint.basePath',
        label: 'SharePoint 경로',
        helpKey: 'system.storage.sharepoint.basePath',
        description: 'SharePoint provider 가 사용할 library/mount 기준 경로입니다.',
        type: 'text',
        placeholder: '/sites/documents/shared-documents',
      },
      {
        key: 'system.storage.sharepoint.enabled',
        label: 'SharePoint 저장소 활성화',
        helpKey: 'system.storage.sharepoint.enabled',
        description: 'SharePoint provider를 업로드/열기 대상 후보로 허용합니다.',
        type: 'checkbox',
      },
      {
        key: 'system.storage.sharepoint.webBaseUrl',
        label: 'SharePoint 웹 기본 URL',
        helpKey: 'system.storage.sharepoint.webBaseUrl',
        description: '저장된 파일의 browser open URL을 조합할 기본 URL입니다.',
        type: 'text',
        placeholder: 'https://sharepoint.local',
      },
      {
        key: 'system.storage.nas.basePath',
        label: 'NAS 경로',
        helpKey: 'system.storage.nas.basePath',
        description: 'NAS provider 가 사용할 mount/gateway 기준 경로입니다.',
        type: 'text',
        placeholder: '/mnt/nas/documents',
      },
      {
        key: 'system.storage.nas.enabled',
        label: 'NAS 저장소 활성화',
        helpKey: 'system.storage.nas.enabled',
        description: 'NAS provider를 업로드/열기 대상 후보로 허용합니다.',
        type: 'checkbox',
      },
      {
        key: 'system.storage.nas.webBaseUrl',
        label: 'NAS 웹 기본 URL',
        helpKey: 'system.storage.nas.webBaseUrl',
        description: '브라우저 열기 시 사용할 gateway 또는 file URL입니다.',
        type: 'text',
        placeholder: 'file:///mnt/nas/documents',
      },
    ],
  },
  {
    id: 'ingest',
    scope: 'system',
    group: 'operations',
    jsonPath: 'system.ingest',
    label: '수집 큐 상태',
    icon: Database,
    description: '빌드 이미지 밖의 ingest queue 경로와 게시 정책을 관리합니다.',
    items: [
      {
        key: 'system.ingest.queuePath',
        label: '수집 큐 경로',
        helpKey: 'system.ingest.queuePath',
        description: '수집 작업 JSON 큐 파일을 저장하는 external runtime path 입니다.',
        type: 'text',
        placeholder: '/var/lib/ssoo/document-ingest',
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
    id: 'templates-runtime',
    scope: 'system',
    group: 'operations',
    jsonPath: 'system.templates',
    label: '템플릿 저장 위치',
    icon: FolderOpen,
    description: '템플릿은 문서 Git 레포의 _templates/ 하위에 자동 배치됩니다 (markdownRoot 파생, 변경 불가).',
    items: [],
  },
  {
    id: 'uploads',
    scope: 'system',
    group: 'system',
    jsonPath: 'system.uploads',
    label: '업로드 한도',
    icon: Upload,
    description: '첨부/이미지 업로드 한도를 관리합니다.',
    items: [
      {
        key: 'system.uploads.attachmentMaxSizeMb',
        label: '첨부 최대 크기 (MB)',
        helpKey: 'system.uploads.attachmentMaxSizeMb',
        description: '첨부파일, 참조파일, 텍스트 추출 업로드에 공통 적용되는 최대 크기입니다.',
        type: 'text',
        placeholder: '20',
        coerce: toInteger,
        validate: (value) => validatePositiveInteger(value, 1, '1 이상의 정수를 입력하세요.'),
      },
      {
        key: 'system.uploads.imageMaxSizeMb',
        label: '이미지 최대 크기 (MB)',
        helpKey: 'system.uploads.imageMaxSizeMb',
        description: '에디터 이미지 업로드에 적용되는 최대 크기입니다.',
        type: 'text',
        placeholder: '10',
        coerce: toInteger,
        validate: (value) => validatePositiveInteger(value, 1, '1 이상의 정수를 입력하세요.'),
      },
    ],
  },
  {
    id: 'search',
    scope: 'system',
    group: 'system',
    jsonPath: 'system.search',
    label: '검색 정책',
    icon: Search,
    description: '검색 결과 수, 시맨틱 threshold, 임베딩 chunk 정책을 관리합니다.',
    items: [
      {
        key: 'system.search.maxResults',
        label: '최대 검색 결과 수',
        helpKey: 'system.search.maxResults',
        description: '키워드/시맨틱 검색 공통 최대 결과 수입니다.',
        type: 'text',
        placeholder: '100',
        coerce: toInteger,
        validate: (value) => validatePositiveInteger(value, 1, '1 이상의 정수를 입력하세요.'),
      },
      {
        key: 'system.search.semanticThreshold',
        label: '시맨틱 검색 임계값',
        helpKey: 'system.search.semanticThreshold',
        description: '0~1 사이 유사도 threshold 입니다.',
        type: 'text',
        placeholder: '0.5',
        coerce: toNumber,
        validate: (value) => {
          const num = Number(value);
          if (!Number.isFinite(num) || num < 0 || num > 1) return '0~1 사이 숫자를 입력하세요.';
          return null;
        },
      },
      {
        key: 'system.search.chunkSize',
        label: '임베딩 chunk 크기',
        helpKey: 'system.search.chunkSize',
        description: '문서를 임베딩 청크로 분할할 최대 글자 수입니다.',
        type: 'text',
        placeholder: '1000',
        coerce: toInteger,
        validate: (value) => validatePositiveInteger(value, 100, '100 이상의 정수를 입력하세요.'),
      },
      {
        key: 'system.search.chunkOverlap',
        label: '임베딩 chunk overlap',
        helpKey: 'system.search.chunkOverlap',
        description: '다음 청크에 이어 붙일 overlap 길이입니다.',
        type: 'text',
        placeholder: '200',
        coerce: toInteger,
        validate: (value) => validatePositiveInteger(value, 0, '0 이상의 정수를 입력하세요.'),
      },
      {
        key: 'system.search.summaryConcurrency',
        label: '검색 요약 동시 처리 수',
        helpKey: 'system.search.summaryConcurrency',
        description: '검색 결과 요약 생성 시 동시 처리할 최대 작업 수입니다.',
        type: 'text',
        placeholder: '3',
        coerce: toInteger,
        validate: (value) => validatePositiveInteger(value, 1, '1 이상의 정수를 입력하세요.'),
      },
    ],
  },
  {
    id: 'docAssist',
    scope: 'system',
    group: 'system',
    jsonPath: 'system.docAssist',
    label: '문서 AI 보조 정책',
    icon: Bot,
    description: 'AI 문서 작성 컨텍스트 길이와 요약 첨부 한도를 관리합니다.',
    items: [
      {
        key: 'system.docAssist.maxCurrentContentChars',
        label: '현재 문서 컨텍스트 최대 글자 수',
        helpKey: 'system.docAssist.maxCurrentContentChars',
        description: 'AI compose 에 전달할 현재 문서 컨텍스트 상한입니다.',
        type: 'text',
        placeholder: '6000',
        coerce: toInteger,
        validate: (value) => validatePositiveInteger(value, 500, '500 이상의 정수를 입력하세요.'),
      },
      {
        key: 'system.docAssist.maxTemplateChars',
        label: '템플릿 컨텍스트 최대 글자 수',
        helpKey: 'system.docAssist.maxTemplateChars',
        description: 'AI compose 에 전달할 템플릿 컨텍스트 상한입니다.',
        type: 'text',
        placeholder: '1500',
        coerce: toInteger,
        validate: (value) => validatePositiveInteger(value, 100, '100 이상의 정수를 입력하세요.'),
      },
      {
        key: 'system.docAssist.maxSummaryFileCount',
        label: '최대 요약 첨부 파일 수',
        helpKey: 'system.docAssist.maxSummaryFileCount',
        description: '요약 첨부 컨텍스트로 함께 보낼 최대 파일 수입니다.',
        type: 'text',
        placeholder: '2',
        coerce: toInteger,
        validate: (value) => validatePositiveInteger(value, 1, '1 이상의 정수를 입력하세요.'),
      },
      {
        key: 'system.docAssist.maxSummaryFileChars',
        label: '요약 첨부 파일당 최대 글자 수',
        helpKey: 'system.docAssist.maxSummaryFileChars',
        description: '각 요약 첨부에서 AI 에 전달할 최대 글자 수입니다.',
        type: 'text',
        placeholder: '2000',
        coerce: toInteger,
        validate: (value) => validatePositiveInteger(value, 100, '100 이상의 정수를 입력하세요.'),
      },
      {
        key: 'system.docAssist.maxImagesPerRequest',
        label: '요청당 최대 이미지 수',
        helpKey: 'system.docAssist.maxImagesPerRequest',
        description: 'AI compose 요청에 함께 보낼 최대 이미지 수입니다.',
        type: 'text',
        placeholder: '5',
        coerce: toInteger,
        validate: (value) => validatePositiveInteger(value, 1, '1 이상의 정수를 입력하세요.'),
      },
    ],
  },
  {
    id: 'templates',
    scope: 'system',
    group: 'management',
    jsonPath: 'system.templates',
    label: '관리자 템플릿',
    icon: Shapes,
    description: '문서 도메인 안에서 전역/개인 템플릿을 관리하는 슬롯입니다.',
    kind: 'custom',
    slotKey: 'admin-templates',
    items: [],
  },
  {
    id: 'extraction',
    scope: 'system',
    group: 'system',
    jsonPath: 'system.extraction',
    label: '문서 분석/추출 정책',
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
    id: 'externalSettings',
    scope: 'system',
    group: 'external',
    jsonPath: 'system.externalLinks',
    label: '공통 설정으로 이동',
    icon: ExternalLink,
    description: '플랫폼 공통은 Admin, 문서 도메인의 세부 시스템 설정/제어/운영은 이 설정 화면이라는 책임 경계를 보여 주고, SNS Profile/Account·Admin/조직·AI Control Plane 은 외부 surface로 분리합니다.',
    kind: 'custom',
    slotKey: 'external-settings',
    items: [],
  },
  {
    id: 'identity',
    scope: 'personal',
    group: 'personal',
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
        placeholder: 'anonymous@documents.local',
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
    group: 'personal',
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
  {
    id: 'viewer',
    scope: 'personal',
    group: 'personal',
    jsonPath: 'personal.viewer',
    label: 'Viewer',
    icon: FileSearch,
    description: '문서 viewer 기본 확대 배율을 관리합니다.',
    items: [
      {
        key: 'personal.viewer.defaultZoom',
        label: '기본 확대 배율',
        helpKey: 'personal.viewer.defaultZoom',
        description: 'Viewer 진입 시 기본으로 적용할 확대 배율입니다.',
        type: 'select',
        options: [...VIEWER_ZOOM_OPTIONS],
        coerce: toInteger,
        validate: (value) => {
          const zoom = Number(value);
          if (!Number.isFinite(zoom) || !VIEWER_ZOOM_OPTIONS.some((option) => Number(option.value) === zoom)) {
            return '지원되는 배율을 선택하세요.';
          }
          return null;
        },
      },
    ],
  },
  {
    id: 'sidebar',
    scope: 'personal',
    group: 'personal',
    jsonPath: 'personal.sidebar',
    label: 'Sidebar',
    icon: PanelLeft,
    description: '앱 진입 시 기본으로 펼칠 sidebar 섹션을 관리합니다.',
    items: [
      {
        key: 'personal.sidebar.sections.bookmarks',
        label: '북마크 섹션 기본 펼침',
        helpKey: 'personal.sidebar.sections.bookmarks',
        description: '앱 진입 시 bookmarks 섹션을 기본으로 펼칩니다.',
        type: 'checkbox',
      },
      {
        key: 'personal.sidebar.sections.openTabs',
        label: '열린 탭 섹션 기본 펼침',
        helpKey: 'personal.sidebar.sections.openTabs',
        description: '앱 진입 시 open tabs 섹션을 기본으로 펼칩니다.',
        type: 'checkbox',
      },
      {
        key: 'personal.sidebar.sections.changes',
        label: '변경사항 섹션 기본 펼침',
        helpKey: 'personal.sidebar.sections.changes',
        description: '앱 진입 시 changes 섹션을 기본으로 펼칩니다.',
        type: 'checkbox',
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
