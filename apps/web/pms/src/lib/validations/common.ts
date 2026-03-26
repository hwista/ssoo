import { z } from 'zod';

/**
 * 공통 유효성 검증 스키마
 *
 * 재사용 가능한 기본 필드 스키마 정의
 */

// ========================================
// 기본 문자열
// ========================================

/** 필수 문자열 (빈 값 불허) */
export const requiredString = z
  .string({ required_error: '필수 입력입니다.' })
  .min(1, '필수 입력입니다.');

/** 선택 문자열 (빈 값 → undefined) */
export const optionalString = z
  .string()
  .optional()
  .transform((val) => (val === '' ? undefined : val));

/** 필수 문자열 (최대 길이 지정) */
export const requiredStringMax = (max: number) =>
  requiredString.max(max, `최대 ${max}자까지 입력 가능합니다.`);

/** 선택 문자열 (최대 길이 지정) */
export const optionalStringMax = (max: number) =>
  optionalString.pipe(
    z
      .string()
      .max(max, `최대 ${max}자까지 입력 가능합니다.`)
      .optional(),
  );

// ========================================
// 연락처
// ========================================

/** 이메일 */
export const emailField = z
  .string()
  .email('올바른 이메일 형식이 아닙니다.')
  .or(z.literal(''))
  .transform((val) => (val === '' ? undefined : val));

/** 필수 이메일 */
export const requiredEmail = z
  .string({ required_error: '이메일을 입력하세요.' })
  .min(1, '이메일을 입력하세요.')
  .email('올바른 이메일 형식이 아닙니다.');

/** 전화번호 (한국) */
export const phoneField = z
  .string()
  .regex(/^(01[016789]-?\d{3,4}-?\d{4}|0[2-6][0-5]?-?\d{3,4}-?\d{4})$/, '올바른 전화번호 형식이 아닙니다.')
  .or(z.literal(''))
  .transform((val) => (val === '' ? undefined : val));

/** 휴대폰 번호 */
export const mobileField = z
  .string()
  .regex(/^01[016789]-?\d{3,4}-?\d{4}$/, '올바른 휴대폰 번호 형식이 아닙니다.')
  .or(z.literal(''))
  .transform((val) => (val === '' ? undefined : val));

// ========================================
// 숫자
// ========================================

/** 필수 숫자 (양수) */
export const requiredPositiveNumber = z
  .number({ required_error: '숫자를 입력하세요.' })
  .positive('0보다 큰 값을 입력하세요.');

/** 선택 숫자 */
export const optionalNumber = z
  .number()
  .optional()
  .nullable()
  .transform((val) => val ?? undefined);

/** 금액 (0 이상) */
export const amountField = z
  .number()
  .min(0, '0 이상의 금액을 입력하세요.')
  .optional()
  .nullable()
  .transform((val) => val ?? undefined);

/** 문자열 → 숫자 변환 (폼 입력용) */
export const stringToNumber = z
  .string()
  .transform((val) => (val === '' ? undefined : Number(val)))
  .pipe(z.number().optional());

/** 문자열 → 양수 변환 */
export const stringToPositiveNumber = z
  .string()
  .min(1, '필수 입력입니다.')
  .transform((val) => Number(val))
  .pipe(z.number().positive('0보다 큰 값을 입력하세요.'));

// ========================================
// 날짜
// ========================================

/** 날짜 문자열 (YYYY-MM-DD) */
export const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식이 아닙니다. (YYYY-MM-DD)')
  .or(z.literal(''))
  .transform((val) => (val === '' ? undefined : val));

/** 필수 날짜 */
export const requiredDate = z
  .string({ required_error: '날짜를 선택하세요.' })
  .min(1, '날짜를 선택하세요.')
  .regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식이 아닙니다.');

/** 날짜/시간 문자열 (ISO 8601) */
export const dateTimeField = z
  .string()
  .datetime({ message: '올바른 날짜/시간 형식이 아닙니다.' })
  .optional();

// ========================================
// ID / 코드
// ========================================

/** ID (양의 정수) */
export const idField = z.number().int().positive();

/** 선택 ID */
export const optionalId = z
  .number()
  .int()
  .positive()
  .optional()
  .nullable()
  .transform((val) => val ?? undefined);

/** 코드 문자열 (영문 소문자, 숫자, 언더스코어) */
export const codeField = z
  .string()
  .regex(/^[a-z][a-z0-9_]*$/, '영문 소문자로 시작하고, 영문 소문자/숫자/밑줄만 사용 가능합니다.');

// ========================================
// Boolean
// ========================================

/** 체크박스 (문자열 → boolean) */
export const checkboxField = z
  .union([z.boolean(), z.string()])
  .transform((val) => val === true || val === 'true' || val === 'on');

// ========================================
// Select
// ========================================

/** 필수 선택 */
export const requiredSelect = z
  .string({ required_error: '선택하세요.' })
  .min(1, '선택하세요.');

/** 선택 (빈 값 → undefined) */
export const optionalSelect = z
  .string()
  .optional()
  .transform((val) => (val === '' ? undefined : val));
