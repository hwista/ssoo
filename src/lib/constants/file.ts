export const FILE_EXTENSIONS = {
  MARKDOWN: ['.md', '.markdown'],
  TEXT: ['.txt', '.text'],
  IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  JSON: '.json',
  TYPESCRIPT: '.ts',
  TYPESCRIPT_REACT: '.tsx',
  JAVASCRIPT: '.js',
  JAVASCRIPT_REACT: '.jsx',
} as const;

export const MIME_TYPES = {
  MARKDOWN: 'text/markdown',
  TEXT: 'text/plain',
  IMAGE: 'image/*',
  JSON: 'application/json',
  HTML: 'text/html',
  CSS: 'text/css',
  JAVASCRIPT: 'application/javascript',
  DEFAULT: 'application/octet-stream',
  md: 'text/markdown',
  txt: 'text/plain',
  json: 'application/json',
  ts: 'text/typescript',
  tsx: 'text/typescript',
  js: 'application/javascript',
  jsx: 'application/javascript',
  css: 'text/css',
  html: 'text/html',
} as const;

// ─── 첨부파일 허용 확장자 ──────────────────────────────────

export interface AttachmentTypeInfo {
  ext: string;
  mime: string;
  category: 'document' | 'office' | 'text' | 'image' | 'web';
}

export const ATTACHMENT_TYPES: AttachmentTypeInfo[] = [
  // 문서
  { ext: '.pdf', mime: 'application/pdf', category: 'document' },

  // Office
  { ext: '.doc', mime: 'application/msword', category: 'office' },
  { ext: '.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: 'office' },
  { ext: '.xls', mime: 'application/vnd.ms-excel', category: 'office' },
  { ext: '.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', category: 'office' },
  { ext: '.ppt', mime: 'application/vnd.ms-powerpoint', category: 'office' },
  { ext: '.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', category: 'office' },

  // 텍스트
  { ext: '.txt', mime: 'text/plain', category: 'text' },
  { ext: '.md', mime: 'text/markdown', category: 'text' },
  { ext: '.csv', mime: 'text/csv', category: 'text' },
  { ext: '.json', mime: 'application/json', category: 'text' },
  { ext: '.xml', mime: 'application/xml', category: 'text' },
  { ext: '.yaml', mime: 'application/x-yaml', category: 'text' },
  { ext: '.yml', mime: 'application/x-yaml', category: 'text' },
  { ext: '.log', mime: 'text/plain', category: 'text' },

  // 이미지
  { ext: '.png', mime: 'image/png', category: 'image' },
  { ext: '.jpg', mime: 'image/jpeg', category: 'image' },
  { ext: '.jpeg', mime: 'image/jpeg', category: 'image' },
  { ext: '.gif', mime: 'image/gif', category: 'image' },
  { ext: '.webp', mime: 'image/webp', category: 'image' },
  { ext: '.svg', mime: 'image/svg+xml', category: 'image' },

  // 웹
  { ext: '.html', mime: 'text/html', category: 'web' },
  { ext: '.htm', mime: 'text/html', category: 'web' },
];

export const ATTACHMENT_ACCEPT_STRING = ATTACHMENT_TYPES.map((t) => t.ext).join(',');

export const ATTACHMENT_MAX_SIZE = 20 * 1024 * 1024; // 20MB

export const IMAGE_MAX_SIZE = 10 * 1024 * 1024; // 10MB

// ─── 텍스트/이미지 추출 설정 (코드 레벨 폴백; 런타임에는 dms.config.json 우선) ───
export const MAX_EXTRACTED_TEXT_LENGTH = 12_000;
export const MAX_EXTRACTED_IMAGES = 5;
export const MAX_EXTRACTED_IMAGE_SIZE = 1 * 1024 * 1024; // 1MB
export const PDF_MAX_RENDER_PAGES = 3;
export const PDF_RENDER_SCALE = 1.0;
export const EXTRACTABLE_IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

export const ATTACHMENT_ALLOWED_EXTENSIONS = new Set(ATTACHMENT_TYPES.map((t) => t.ext));

export const ATTACHMENT_STORAGE_DIR = '_assets/attachments';

export const REFERENCE_STORAGE_DIR = '_assets/references';
