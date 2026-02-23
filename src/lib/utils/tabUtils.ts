/**
 * 탭 관련 유틸리티
 */

/**
 * 탭 경로에서 쿼리 파라미터 추출
 * 
 * @param path - 탭 경로 (예: '/ai/search?q=hello')
 * @returns 쿼리 문자열 값 (q 파라미터)
 * 
 * @example
 * getQueryFromTabPath('/ai/search?q=hello') // 'hello'
 * getQueryFromTabPath('/ai/search')       // ''
 */
export function getQueryFromTabPath(path?: string): string {
  if (!path) return '';
  const [, queryString = ''] = path.split('?');
  const params = new URLSearchParams(queryString);
  return params.get('q')?.trim() ?? '';
}
