export type AttachmentCategory = 'document' | 'office' | 'text' | 'image' | 'web';

export interface AttachmentTypeInfo {
  ext: string;
  mime: string;
  category: AttachmentCategory;
}

export const ATTACHMENT_TYPES: AttachmentTypeInfo[] = [
  { ext: '.pdf', mime: 'application/pdf', category: 'document' },
  { ext: '.doc', mime: 'application/msword', category: 'office' },
  { ext: '.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: 'office' },
  { ext: '.xls', mime: 'application/vnd.ms-excel', category: 'office' },
  { ext: '.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', category: 'office' },
  { ext: '.ppt', mime: 'application/vnd.ms-powerpoint', category: 'office' },
  { ext: '.pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', category: 'office' },
  { ext: '.txt', mime: 'text/plain', category: 'text' },
  { ext: '.md', mime: 'text/markdown', category: 'text' },
  { ext: '.csv', mime: 'text/csv', category: 'text' },
  { ext: '.json', mime: 'application/json', category: 'text' },
  { ext: '.xml', mime: 'application/xml', category: 'text' },
  { ext: '.yaml', mime: 'application/x-yaml', category: 'text' },
  { ext: '.yml', mime: 'application/x-yaml', category: 'text' },
  { ext: '.log', mime: 'text/plain', category: 'text' },
  { ext: '.png', mime: 'image/png', category: 'image' },
  { ext: '.jpg', mime: 'image/jpeg', category: 'image' },
  { ext: '.jpeg', mime: 'image/jpeg', category: 'image' },
  { ext: '.gif', mime: 'image/gif', category: 'image' },
  { ext: '.webp', mime: 'image/webp', category: 'image' },
  { ext: '.svg', mime: 'image/svg+xml', category: 'image' },
  { ext: '.html', mime: 'text/html', category: 'web' },
  { ext: '.htm', mime: 'text/html', category: 'web' },
];

export const ATTACHMENT_ALLOWED_EXTENSIONS = new Set(ATTACHMENT_TYPES.map((item) => item.ext));
export const ATTACHMENT_STORAGE_DIR = '_assets/attachments';
export const IMAGE_STORAGE_DIR = '_assets/images';
export const REFERENCE_STORAGE_DIR = '_assets/references';
export const IMAGE_ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]);

export const MAX_EXTRACTED_TEXT_LENGTH = 12_000;
export const MAX_EXTRACTED_IMAGES = 5;
export const MAX_EXTRACTED_IMAGE_SIZE = 1 * 1024 * 1024;
export const PDF_MAX_RENDER_PAGES = 3;
export const PDF_RENDER_SCALE = 1.0;
export const EXTRACTABLE_IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

export function getMimeType(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  const ext = lastDotIndex >= 0 ? fileName.slice(lastDotIndex).toLowerCase() : '';
  const info = ATTACHMENT_TYPES.find((item) => item.ext === ext);
  return info?.mime ?? 'application/octet-stream';
}
