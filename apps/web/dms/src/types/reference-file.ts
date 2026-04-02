/**
 * 통합 참조 파일 타입
 *
 * 기존 3개 타입을 하나로 통합:
 * - SourceFileMeta (문서 첨부 파일)
 * - TemplateReferenceDoc (템플릿 참조 문서)
 * - InlineSummaryFileItem (AI 컴포즈 파일)
 *
 * 베이스: SourceFileMeta 구조
 * 차용: TemplateReferenceDoc.textContent/storage, InlineSummaryFileItem.images
 */

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
  /** 파일 이름 */
  name: string;
  /** 파일 경로 */
  path: string;
  /** MIME 타입 (예: 'text/markdown', 'application/pdf') */
  type?: string;
  /** 파일 크기 (bytes) */
  size?: number;

  // --- SourceFileMeta 기존 필드 ---
  url?: string;
  storageUri?: string;
  provider?: 'local' | 'sharepoint' | 'nas' | string;
  versionId?: string;
  etag?: string;
  checksum?: string;
  origin?: ReferenceFileOrigin;
  status?: 'draft' | 'pending_confirm' | 'published';

  // --- TemplateReferenceDoc 차용 필드 ---
  /** 인라인 텍스트 콘텐츠 (파일 본문 추출 결과) */
  textContent?: string;
  /** 저장 방식: path=경로 참조, inline=텍스트 인라인 */
  storage?: 'path' | 'inline';
  /** 참조 문서 종류 */
  kind?: 'document' | 'file';
  /** 임시 식별자 (UI에서의 추적용) */
  tempId?: string;

  // --- InlineSummaryFileItem 차용 필드 ---
  /** AI 요약용 추출 이미지 */
  images?: ExtractedImageItem[];
}
