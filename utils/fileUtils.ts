/**
 * 파일 관련 유틸리티 함수들
 * 파일 확장자, 파일 타입 검사, 파일명 처리 등을 담당
 */

import { FILE_EXTENSIONS, MIME_TYPES } from './constants';

/**
 * 파일이 마크다운 파일인지 검사
 * @param fileName 파일명
 * @returns 마크다운 파일 여부
 */
export function isMarkdownFile(fileName: string): boolean {
  if (!fileName || typeof fileName !== 'string') return false;
  
  const normalizedName = fileName.toLowerCase();
  return FILE_EXTENSIONS.MARKDOWN.some((ext: string) => normalizedName.endsWith(ext));
}

/**
 * 파일이 텍스트 파일인지 검사
 * @param fileName 파일명
 * @returns 텍스트 파일 여부
 */
export function isTextFile(fileName: string): boolean {
  if (!fileName || typeof fileName !== 'string') return false;
  
  const normalizedName = fileName.toLowerCase();
  return FILE_EXTENSIONS.TEXT.some((ext: string) => normalizedName.endsWith(ext));
}

/**
 * 파일이 이미지 파일인지 검사
 * @param fileName 파일명
 * @returns 이미지 파일 여부
 */
export function isImageFile(fileName: string): boolean {
  if (!fileName || typeof fileName !== 'string') return false;
  
  const normalizedName = fileName.toLowerCase();
  return FILE_EXTENSIONS.IMAGE.some((ext: string) => normalizedName.endsWith(ext));
}

/**
 * 파일 확장자 추출
 * @param fileName 파일명
 * @returns 확장자 (점 포함) 또는 빈 문자열
 */
export function getFileExtension(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') return '';
  
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === 0) return '';
  
  return fileName.substring(lastDotIndex).toLowerCase();
}

/**
 * 파일명에서 확장자 제거
 * @param fileName 파일명
 * @returns 확장자가 제거된 파일명
 */
export function removeFileExtension(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') return '';
  
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === 0) return fileName;
  
  return fileName.substring(0, lastDotIndex);
}

/**
 * 파일명에 확장자가 없는 경우 기본 확장자 추가
 * @param fileName 파일명
 * @param defaultExtension 기본 확장자 (점 포함)
 * @returns 확장자가 있는 파일명
 */
export function ensureFileExtension(fileName: string, defaultExtension: string): string {
  if (!fileName || typeof fileName !== 'string') return '';
  if (!defaultExtension || typeof defaultExtension !== 'string') return fileName;
  
  const hasExtension = getFileExtension(fileName);
  if (hasExtension) return fileName;
  
  // 기본 확장자가 점으로 시작하지 않으면 추가
  const extension = defaultExtension.startsWith('.') ? defaultExtension : `.${defaultExtension}`;
  return fileName + extension;
}

/**
 * 마크다운 파일명 정규화 (확장자 보장)
 * @param fileName 파일명
 * @returns .md 확장자가 보장된 소문자 파일명
 */
export function normalizeMarkdownFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') return '';

  const baseName = removeFileExtension(fileName);
  const lowerCaseBaseName = baseName.toLowerCase();

  return `${lowerCaseBaseName}.md`;
}

/**
 * 파일의 MIME 타입 추측
 * @param fileName 파일명
 * @returns MIME 타입 또는 기본값
 */
export function getMimeType(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') return MIME_TYPES.DEFAULT;
  
  const extension = getFileExtension(fileName);
  
  if (isMarkdownFile(fileName)) return MIME_TYPES.MARKDOWN;
  if (isTextFile(fileName)) return MIME_TYPES.TEXT;
  if (isImageFile(fileName)) return MIME_TYPES.IMAGE;
  if (extension === '.json') return MIME_TYPES.JSON;
  if (extension === '.html' || extension === '.htm') return MIME_TYPES.HTML;
  if (extension === '.css') return MIME_TYPES.CSS;
  if (extension === '.js') return MIME_TYPES.JAVASCRIPT;
  
  return MIME_TYPES.DEFAULT;
}

/**
 * 안전한 파일명 생성 (특수문자 제거/변환)
 * @param fileName 원본 파일명
 * @returns 안전한 파일명
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') return '';
  
  return fileName
    // 위험한 문자들을 언더스코어로 변경
    .replace(/[<>:"/\\|?*]/g, '_')
    // 연속된 언더스코어를 하나로 통합
    .replace(/_+/g, '_')
    // 앞뒤 공백과 점 제거
    .replace(/^[\s.]+|[\s.]+$/g, '')
    // 빈 문자열인 경우 기본값
    || 'untitled';
}

/**
 * 파일 크기를 읽기 쉬운 형태로 변환
 * @param bytes 바이트 크기
 * @returns 읽기 쉬운 크기 문자열
 */
export function formatFileSize(bytes: number): string {
  if (typeof bytes !== 'number' || bytes < 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  const formatted = unitIndex === 0 ? size.toString() : size.toFixed(1);
  return `${formatted} ${units[unitIndex]}`;
}