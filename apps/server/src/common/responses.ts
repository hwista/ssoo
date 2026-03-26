/**
 * API 응답 헬퍼 함수
 * 
 * 일관된 응답 형식을 제공합니다.
 */

/**
 * 성공 응답
 * 
 * @example
 * return success(user, '조회 성공');
 */
export function success<T>(data: T, message?: string) {
  return {
    success: true as const,
    data,
    ...(message && { message }),
  };
}

/**
 * 페이지네이션 성공 응답
 * 
 * @example
 * return paginated(projects, 1, 10, 100);
 */
export function paginated<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
) {
  return {
    success: true as const,
    data,
    meta: { page, limit, total },
  };
}

/**
 * 에러 응답
 * 
 * @example
 * return error('VALIDATION_ERROR', '유효하지 않은 입력입니다.');
 */
export function error(code: string, message: string) {
  return {
    success: false as const,
    error: { code, message },
  };
}

/**
 * Not Found 에러
 * 
 * @example
 * return notFound('프로젝트');
 */
export function notFound(entity: string) {
  return error('NOT_FOUND', `${entity}을(를) 찾을 수 없습니다.`);
}

/**
 * 삭제 성공 응답
 * 
 * @example
 * return deleted(true);
 */
export function deleted(result: boolean) {
  return success({ deleted: result });
}
