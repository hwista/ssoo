import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { AuthEmailDeliveryMode } from '@ssoo/types/common';

export class UpdateAuthProviderSettingsDto {
  @ApiPropertyOptional({ description: '로컬 ID/PW 로그인 허용' })
  @IsBoolean()
  @IsOptional()
  passwordLoginEnabled?: boolean;

  @ApiPropertyOptional({ description: '이메일 코드 기반 비밀번호 찾기 허용' })
  @IsBoolean()
  @IsOptional()
  passwordResetEnabled?: boolean;

  @ApiPropertyOptional({ description: '로그인 상태의 비밀번호 변경 허용' })
  @IsBoolean()
  @IsOptional()
  passwordChangeEnabled?: boolean;

  @ApiPropertyOptional({ description: '비밀번호 재설정 코드 TTL(분)', minimum: 5, maximum: 60 })
  @IsInt()
  @Min(5)
  @Max(60)
  @IsOptional()
  resetCodeTtlMinutes?: number;

  @ApiPropertyOptional({ description: '비밀번호 재설정 코드 길이', minimum: 6, maximum: 10 })
  @IsInt()
  @Min(6)
  @Max(10)
  @IsOptional()
  resetCodeLength?: number;

  @ApiPropertyOptional({ description: '사내 SSO 버튼 노출 여부' })
  @IsBoolean()
  @IsOptional()
  internalSsoEnabled?: boolean;

  @ApiPropertyOptional({ description: '사내 SSO 시작 URL' })
  @IsUrl({ require_tld: false }, { message: '사내 SSO URL 형식이 올바르지 않습니다' })
  @IsOptional()
  internalSsoLoginUrl?: string | null;

  @ApiPropertyOptional({ description: 'Microsoft 365 로그인 허용' })
  @IsBoolean()
  @IsOptional()
  microsoftLoginEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Microsoft OAuth 기반 가입 신청 허용' })
  @IsBoolean()
  @IsOptional()
  microsoftSignupRequestEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Microsoft Entra tenant ID' })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  microsoftTenantId?: string | null;

  @ApiPropertyOptional({ description: 'Microsoft Entra app client ID' })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  microsoftClientId?: string | null;

  @ApiPropertyOptional({ description: 'Microsoft client secret. 응답에는 노출되지 않습니다.' })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  microsoftClientSecret?: string | null;

  @ApiPropertyOptional({ description: 'Microsoft OAuth redirect URI' })
  @IsUrl({ require_tld: false }, { message: 'Microsoft redirect URI 형식이 올바르지 않습니다' })
  @IsOptional()
  microsoftRedirectUri?: string | null;

  @ApiPropertyOptional({ description: 'Microsoft OAuth scopes', type: [String] })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  @IsOptional()
  microsoftScopes?: string[];

  @ApiPropertyOptional({ description: '허용 Microsoft tenant ID 목록', type: [String] })
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  @IsOptional()
  allowedTenantIds?: string[];

  @ApiPropertyOptional({ description: '허용 이메일 도메인 목록', type: [String] })
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  @IsOptional()
  allowedEmailDomains?: string[];

  @ApiPropertyOptional({ description: '셀프 회원가입 허용' })
  @IsBoolean()
  @IsOptional()
  selfSignupEnabled?: boolean;

  @ApiPropertyOptional({ description: '인증 메일 전달 모드', enum: ['outbox', 'disabled'] })
  @IsIn(['outbox', 'disabled'])
  @IsOptional()
  emailDeliveryMode?: AuthEmailDeliveryMode;

  @ApiPropertyOptional({ description: '인증 메일 발신 주소' })
  @IsString()
  @MaxLength(320)
  @IsOptional()
  emailFromAddress?: string | null;
}
