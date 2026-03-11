import { Database, GitBranch, HardDrive, Shapes } from 'lucide-react';

export interface SettingItem {
  key: string;
  label: string;
  helpKey: string;
  description: string;
  type: 'text' | 'email' | 'checkbox' | 'select';
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  validate?: (value: unknown) => string | null;
}

export interface SettingSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  items: SettingItem[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const STORAGE_PROVIDER_OPTIONS = [
  { label: 'SharePoint', value: 'sharepoint' },
  { label: 'Local', value: 'local' },
  { label: 'NAS', value: 'nas' },
];

export const SETTING_SECTIONS: SettingSection[] = [
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
