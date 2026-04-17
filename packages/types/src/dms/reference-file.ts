export interface ExtractedImageItem {
  base64: string;
  mimeType: string;
  name: string;
  size: number;
}

export type ReferenceFileOrigin =
  | 'manual'
  | 'ingest'
  | 'teams'
  | 'network_drive'
  | 'reference'
  | 'template'
  | 'picker'
  | 'assistant'
  | 'current-document'
  | 'template-selected';

export interface ReferenceFile {
  name: string;
  path: string;
  type?: string;
  size?: number;
  url?: string;
  storageUri?: string;
  provider?: 'local' | 'sharepoint' | 'nas' | string;
  versionId?: string;
  etag?: string;
  checksum?: string;
  origin?: ReferenceFileOrigin;
  status?: 'draft' | 'pending_confirm' | 'published';
  textContent?: string;
  storage?: 'path' | 'inline';
  kind?: 'document' | 'file';
  tempId?: string;
  images?: ExtractedImageItem[];
}
