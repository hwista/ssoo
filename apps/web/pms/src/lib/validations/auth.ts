import { z } from 'zod';
import { requiredString } from './common';

/**
 * 인증 관련 유효성 검증 스키마
 */

/** 로그인 스키마 */
export const loginSchema = z.object({
  loginId: requiredString.describe('아이디'),
  password: requiredString.describe('비밀번호'),
});

/** 비밀번호 변경 스키마 */
export const changePasswordSchema = z
  .object({
    currentPassword: requiredString.describe('현재 비밀번호'),
    newPassword: requiredString
      .min(8, '비밀번호는 8자 이상이어야 합니다.')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
        '영문 대/소문자, 숫자, 특수문자를 포함해야 합니다.',
      )
      .describe('새 비밀번호'),
    confirmPassword: requiredString.describe('새 비밀번호 확인'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  });

/** 초대 수락 스키마 (계정 설정) */
export const acceptInvitationSchema = z
  .object({
    token: requiredString,
    password: requiredString
      .min(8, '비밀번호는 8자 이상이어야 합니다.')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
        '영문 대/소문자, 숫자, 특수문자를 포함해야 합니다.',
      )
      .describe('비밀번호'),
    confirmPassword: requiredString.describe('비밀번호 확인'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  });

// ========================================
// 타입 추론
// ========================================

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
