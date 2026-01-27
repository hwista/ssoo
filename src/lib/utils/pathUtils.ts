/**
 * 경로 처리 유틸리티
 * 크로스 플랫폼 경로 호환성 및 경로 조작 기능 제공
 */

import path from 'path';
import { PATH_SEPARATORS } from './constants';

/**
 * 경로를 정규화하여 크로스 플랫폼 호환성 보장
 * Windows의 백슬래시를 Unix 스타일 슬래시로 변환
 * 
 * @param inputPath - 정규화할 경로
 * @returns 정규화된 경로 (슬래시 구분자 사용)
 * 
 * @example
 * normalizePath('folder\\file.md') // 'folder/file.md'
 * normalizePath('folder/file.md')  // 'folder/file.md'
 */
export function normalizePath(inputPath: string): string {
  if (!inputPath || typeof inputPath !== 'string') {
    return '';
  }
  
  // 백슬래시를 슬래시로 변환 (단일 및 이중 백슬래시 모두 처리)
  return inputPath
    .replace(/\\\\/g, PATH_SEPARATORS.UNIX)  // 이중 백슬래시 처리
    .replace(/\\/g, PATH_SEPARATORS.UNIX);   // 단일 백슬래시 처리
}

/**
 * 경로가 유효한 형식인지 검증
 * 
 * @param inputPath - 검증할 경로
 * @returns 유효한 경로인지 여부
 */
export function isValidPath(inputPath: string): boolean {
  if (!inputPath || typeof inputPath !== 'string') {
    return false;
  }
  
  // 빈 문자열이나 공백만 있는 경우
  if (inputPath.trim() === '') {
    return false;
  }
  
  // 위험한 패턴 검사
  const dangerousPatterns = [
    /\.\./,           // 상위 디렉토리 참조
    /^\/+/,           // 루트 경로
    /^[a-zA-Z]:\\/,   // Windows 절대 경로
    /[\x00-\x1f]/,    // 제어 문자
  ];
  
  return !dangerousPatterns.some(pattern => pattern.test(inputPath));
}

/**
 * 상대 경로를 안전하게 결합
 * 
 * @param basePath - 기본 경로
 * @param relativePath - 상대 경로
 * @returns 결합된 경로
 */
export function resolveRelativePath(basePath: string, relativePath: string): string {
  if (!basePath || !relativePath) {
    return normalizePath(basePath || relativePath || '');
  }
  
  const normalizedBase = normalizePath(basePath);
  const normalizedRelative = normalizePath(relativePath);
  
  // path.join 사용하여 안전하게 결합 후 정규화
  const joined = path.join(normalizedBase, normalizedRelative);
  return normalizePath(joined);
}

/**
 * 경로에서 파일명 추출
 * 
 * @param inputPath - 파일 경로
 * @returns 파일명 (확장자 포함)
 * 
 * @example
 * getFileName('folder/file.md') // 'file.md'
 * getFileName('file.md')        // 'file.md'
 */
export function getFileName(inputPath: string): string {
  if (!inputPath) {
    return '';
  }
  
  const normalizedPath = normalizePath(inputPath);
  return path.basename(normalizedPath);
}

/**
 * 경로에서 디렉토리 경로 추출
 * 
 * @param inputPath - 파일 경로
 * @returns 디렉토리 경로
 * 
 * @example
 * getDirectoryPath('folder/subfolder/file.md') // 'folder/subfolder'
 * getDirectoryPath('file.md')                  // ''
 */
export function getDirectoryPath(inputPath: string): string {
  if (!inputPath) {
    return '';
  }
  
  const normalizedPath = normalizePath(inputPath);
  const dir = path.dirname(normalizedPath);
  
  // '.'인 경우 빈 문자열 반환 (현재 디렉토리)
  return dir === '.' ? '' : dir;
}

/**
 * 두 경로를 안전하게 결합
 * 
 * @param paths - 결합할 경로들
 * @returns 결합된 경로
 * 
 * @example
 * joinPaths('folder', 'subfolder', 'file.md') // 'folder/subfolder/file.md'
 */
export function joinPaths(...paths: string[]): string {
  if (paths.length === 0) {
    return '';
  }
  
  // 빈 문자열 및 null/undefined 필터링
  const validPaths = paths.filter(p => p && typeof p === 'string' && p.trim() !== '');
  
  if (validPaths.length === 0) {
    return '';
  }
  
  // path.join 사용 후 정규화
  const joined = path.join(...validPaths);
  return normalizePath(joined);
}

/**
 * 경로의 깊이 계산 (슬래시로 구분된 레벨 수)
 * 
 * @param inputPath - 경로
 * @returns 경로 깊이
 * 
 * @example
 * getPathDepth('folder/subfolder/file.md') // 3
 * getPathDepth('file.md')                  // 1
 */
export function getPathDepth(inputPath: string): number {
  if (!inputPath) {
    return 0;
  }
  
  const normalizedPath = normalizePath(inputPath);
  const trimmedPath = normalizedPath.trim();
  
  if (trimmedPath === '' || trimmedPath === '/') {
    return 0;
  }
  
  // 슬래시로 분할하여 깊이 계산
  return trimmedPath.split('/').filter(part => part.length > 0).length;
}

/**
 * 경로가 다른 경로의 하위 경로인지 확인
 * 
 * @param childPath - 확인할 경로
 * @param parentPath - 부모 경로
 * @returns 하위 경로인지 여부
 */
export function isSubPath(childPath: string, parentPath: string): boolean {
  if (!childPath || !parentPath) {
    return false;
  }
  
  const normalizedChild = normalizePath(childPath);
  const normalizedParent = normalizePath(parentPath);
  
  // 부모 경로가 더 길면 하위 경로가 될 수 없음
  if (normalizedParent.length >= normalizedChild.length) {
    return false;
  }
  
  // 자식 경로가 부모 경로로 시작하고 다음 문자가 구분자인지 확인
  return normalizedChild.startsWith(normalizedParent + '/');
}