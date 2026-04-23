import type { JsonFieldDescriptor } from '@/components/common/json';
import type { SettingsScope, SettingsViewMode } from '@/types/settings';
import {
  Bot,
  Cloud,
  Database,
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
  jsonPath: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  status?: 'active' | 'planned';
  kind?: 'fields' | 'custom';
  slotKey?:
    | 'document-access'
    | 'admin-documents'
    | 'system-schedulers'
    | 'template-marketplace'
    | 'admin-templates'
    | 'personal-templates'
    | 'my-activity';
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

function isVisibleSettingSection(section: SettingSection): boolean {
  return section.status !== 'planned';
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toNumber = (value: unknown) => Number(value);
const toInteger = (value: unknown) => Math.trunc(Number(value));
const toStringArray = (value: unknown) =>
  String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

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

const VIEWER_ZOOM_OPTIONS = [
  { label: '75%', value: '75' },
  { label: '100%', value: '100' },
  { label: '125%', value: '125' },
  { label: '150%', value: '150' },
  { label: '175%', value: '175' },
  { label: '200%', value: '200' },
] as const;

const AUTH_MODE_OPTIONS = [
  { label: 'Anonymous-first', value: 'anonymous-first' },
  { label: 'Organization SSO', value: 'organization-sso' },
] as const;

const IDENTITY_MAPPING_OPTIONS = [
  { label: '메일 주소(mail)', value: 'mail' },
  { label: 'UPN(userPrincipalName)', value: 'userPrincipalName' },
  { label: '표시 이름(displayName)', value: 'displayName' },
] as const;

const validatePositiveInteger = (value: unknown, minimum: number, message: string) => {
  const num = Number(value);
  if (!Number.isFinite(num) || !Number.isInteger(num) || num < minimum) {
    return message;
  }
  return null;
};

const validateCommaSeparatedList = (value: unknown) => {
  if (Array.isArray(value)) return null;
  const text = String(value ?? '').trim();
  if (!text) return null;
  return toStringArray(value).length > 0 ? null : '쉼표로 구분된 값을 입력하세요.';
};

export const SETTING_SECTIONS: SettingSection[] = [
  {
    id: 'documentAccess',
    scope: 'system',
    jsonPath: 'system.documentAccess',
    label: '문서 운영/권한',
    icon: Shield,
    description: '관리 가능 문서, 승인 inbox, 내 요청을 함께 운영하는 현재 기준 문서 운영 surface 입니다.',
    kind: 'custom',
    slotKey: 'document-access',
    items: [],
  },
  {
    id: 'adminDocuments',
    scope: 'system',
    jsonPath: 'system.adminDocuments',
    label: '전체 문서/폴더 관리',
    icon: FolderOpen,
    description: '관리자 기준의 전체 문서 및 폴더 운영 관리 슬롯입니다.',
    status: 'planned',
    kind: 'custom',
    slotKey: 'admin-documents',
    items: [],
  },
  {
    id: 'systemSchedulers',
    scope: 'system',
    jsonPath: 'system.systemSchedulers',
    label: '문서 품질/스케줄러',
    icon: Workflow,
    description: '문서 품질 관리와 시스템 전역 스케줄러 관리 슬롯입니다.',
    status: 'planned',
    kind: 'custom',
    slotKey: 'system-schedulers',
    items: [],
  },
  {
    id: 'templateMarketplace',
    scope: 'system',
    jsonPath: 'system.templateMarketplace',
    label: '템플릿 마켓',
    icon: Shapes,
    description: '템플릿 마켓플레이스와 공개 템플릿 관리 슬롯입니다.',
    status: 'planned',
    kind: 'custom',
    slotKey: 'template-marketplace',
    items: [],
  },
  {
    id: 'git',
    scope: 'system',
    jsonPath: 'system.git',
    label: 'Git',
    icon: GitBranch,
    description: 'system-managed markdown working tree observability 와 admin용 Git bootstrap/sync 정책을 함께 확인합니다.',
    items: [
      {
        key: 'system.git.bootstrapRemoteUrl',
        label: 'Bootstrap Remote URL',
        helpKey: 'system.git.bootstrapRemoteUrl',
        description: '빈 working tree일 때 clone 할 canonical Git remote URL입니다.',
        type: 'text',
        placeholder: 'https://git.example.com/dms/docs.git',
      },
      {
        key: 'system.git.bootstrapBranch',
        label: 'Bootstrap Branch',
        helpKey: 'system.git.bootstrapBranch',
        description: '빈 working tree를 clone/init 할 때 우선 사용할 branch입니다. 비워두면 remote 기본 branch를 사용합니다.',
        type: 'text',
        placeholder: 'main',
      },
      {
        key: 'system.git.autoInit',
        label: '저장소 자동 초기화',
        helpKey: 'system.git.autoInit',
        description: 'external markdown root 가 비어 있고 .git 이 없을 때만 git init 을 수행합니다. non-empty non-git 경로는 reconcile-needed 상태로 남깁니다.',
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
        placeholder: '/var/lib/ssoo/dms/storage/local',
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
        placeholder: 'http://localhost:3001/storage/local',
      },
      {
        key: 'system.storage.sharepoint.basePath',
        label: 'SharePoint 경로',
        helpKey: 'system.storage.sharepoint.basePath',
        description: 'SharePoint provider 가 사용할 library/mount 기준 경로입니다.',
        type: 'text',
        placeholder: '/sites/dms/shared-documents',
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
        placeholder: '/mnt/nas/dms',
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
        placeholder: 'file:///mnt/nas/dms',
      },
    ],
  },
  {
    id: 'ingest',
    scope: 'system',
    jsonPath: 'system.ingest',
    label: 'Ingest',
    icon: Database,
    description: '빌드 이미지 밖의 ingest queue 경로와 게시 정책을 관리합니다.',
    items: [
      {
        key: 'system.ingest.queuePath',
        label: '수집 큐 경로',
        helpKey: 'system.ingest.queuePath',
        description: '수집 작업 JSON 큐 파일을 저장하는 external runtime path 입니다.',
        type: 'text',
        placeholder: '/var/lib/ssoo/dms/ingest',
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
    jsonPath: 'system.templates',
    label: 'Template Runtime',
    icon: FolderOpen,
    description: '템플릿은 문서 Git 레포의 _templates/ 하위에 자동 배치됩니다 (markdownRoot 파생, 변경 불가).',
    items: [],
  },
  {
    id: 'uploads',
    scope: 'system',
    jsonPath: 'system.uploads',
    label: 'Uploads',
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
    jsonPath: 'system.search',
    label: 'Search',
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
    jsonPath: 'system.docAssist',
    label: 'Doc Assist',
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
    jsonPath: 'system.templates',
    label: '관리자 템플릿',
    icon: Shapes,
    description: '관리자 기준의 전역/개인 템플릿 관리 슬롯입니다.',
    kind: 'custom',
    slotKey: 'admin-templates',
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
    id: 'm365',
    scope: 'system',
    jsonPath: 'system.m365',
    label: 'M365',
    icon: Cloud,
    description: 'Microsoft 365 / Teams / SharePoint / SSO 연결 메타를 관리합니다. Secret/token은 env에서 관리합니다.',
    items: [
      {
        key: 'system.m365.sharepoint.tenantDomain',
        label: 'SharePoint 테넌트 도메인',
        helpKey: 'system.m365.sharepoint.tenantDomain',
        description: '예: contoso.sharepoint.com. 연결 메타만 저장하며 secret은 포함하지 않습니다.',
        type: 'text',
        placeholder: 'contoso.sharepoint.com',
      },
      {
        key: 'system.m365.sharepoint.sitePath',
        label: 'SharePoint 사이트 경로',
        helpKey: 'system.m365.sharepoint.sitePath',
        description: '예: /sites/dms',
        type: 'text',
        placeholder: '/sites/dms',
      },
      {
        key: 'system.m365.sharepoint.defaultLibrary',
        label: '기본 SharePoint 라이브러리',
        helpKey: 'system.m365.sharepoint.defaultLibrary',
        description: '예: shared-documents',
        type: 'text',
        placeholder: 'shared-documents',
      },
      {
        key: 'system.m365.teams.enabled',
        label: 'Teams 메타 설정 활성화',
        helpKey: 'system.m365.teams.enabled',
        description: 'Teams 연결 메타를 settings 에서 관리합니다. 실제 Teams runtime 연동은 별도 구현 범위입니다.',
        type: 'checkbox',
      },
      {
        key: 'system.m365.teams.ingestEnabled',
        label: 'Teams ingest 메타 활성화',
        helpKey: 'system.m365.teams.ingestEnabled',
        description: 'Teams 채널 ingest 정책 메타를 저장합니다.',
        type: 'checkbox',
      },
      {
        key: 'system.m365.teams.defaultTeam',
        label: '기본 Teams 팀',
        helpKey: 'system.m365.teams.defaultTeam',
        description: '예: DMS 운영팀',
        type: 'text',
        placeholder: 'DMS 운영팀',
      },
      {
        key: 'system.m365.teams.defaultChannel',
        label: '기본 Teams 채널',
        helpKey: 'system.m365.teams.defaultChannel',
        description: '예: documents',
        type: 'text',
        placeholder: 'documents',
      },
      {
        key: 'system.m365.teams.defaultDropPath',
        label: '기본 Teams drop 경로',
        helpKey: 'system.m365.teams.defaultDropPath',
        description: 'Teams 입력을 저장할 문서 경로 정책입니다.',
        type: 'text',
        placeholder: 'ingest/teams',
      },
      {
        key: 'system.m365.auth.mode',
        label: '조직 인증 모드',
        helpKey: 'system.m365.auth.mode',
        description: '현재는 metadata only 설정입니다. 실제 로그인 플로우는 별도 구현 범위입니다.',
        type: 'select',
        options: [...AUTH_MODE_OPTIONS],
      },
      {
        key: 'system.m365.auth.allowedTenantIds',
        label: '허용 테넌트 ID 목록',
        helpKey: 'system.m365.auth.allowedTenantIds',
        description: '쉼표로 구분해 입력합니다. 비워두면 제한을 두지 않습니다.',
        type: 'text',
        placeholder: 'tenant-a, tenant-b',
        coerce: toStringArray,
        validate: validateCommaSeparatedList,
      },
      {
        key: 'system.m365.auth.allowedDomains',
        label: '허용 도메인 목록',
        helpKey: 'system.m365.auth.allowedDomains',
        description: '쉼표로 구분해 입력합니다. 예: contoso.com, partner.co.kr',
        type: 'text',
        placeholder: 'contoso.com, partner.co.kr',
        coerce: toStringArray,
        validate: validateCommaSeparatedList,
      },
      {
        key: 'system.m365.auth.identityMapping',
        label: '사용자 식별자 매핑 기준',
        helpKey: 'system.m365.auth.identityMapping',
        description: '향후 조직 계정 연결 시 어떤 식별자를 우선 매핑할지 정의합니다.',
        type: 'select',
        options: [...IDENTITY_MAPPING_OPTIONS],
      },
    ],
  },
  {
    id: 'personalTemplates',
    scope: 'personal',
    jsonPath: 'personal.personalTemplates',
    label: '공개/내 템플릿',
    icon: Shapes,
    description: '공개 템플릿과 개인 템플릿 관리 슬롯입니다.',
    status: 'planned',
    kind: 'custom',
    slotKey: 'personal-templates',
    items: [],
  },
  {
    id: 'myActivity',
    scope: 'personal',
    jsonPath: 'personal.myActivity',
    label: '내 문서/내 활동',
    icon: UserRound,
    description: '내 문서와 개인 활동 현황을 위한 슬롯입니다.',
    status: 'planned',
    kind: 'custom',
    slotKey: 'my-activity',
    items: [],
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
  {
    id: 'viewer',
    scope: 'personal',
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
        key: 'personal.sidebar.sections.fileTree',
        label: '파일 트리 섹션 기본 펼침',
        helpKey: 'personal.sidebar.sections.fileTree',
        description: '앱 진입 시 file tree 섹션을 기본으로 펼칩니다.',
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
  return SETTING_SECTIONS.filter((section) => section.scope === scope && isVisibleSettingSection(section));
}

export function getSettingSection(scope: SettingsScope, sectionId: string): SettingSection | undefined {
  return getSettingSectionsByScope(scope).find((section) => section.id === sectionId);
}

export function searchSettingEntries(query: string): SettingSearchEntry[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const results: SettingSearchEntry[] = [];

  SETTING_SECTIONS.filter(isVisibleSettingSection).forEach((section) => {
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
