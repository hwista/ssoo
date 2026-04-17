import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsIn,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: '사용자명', example: '홍길동' })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: '사용자명은 100자 이하여야 합니다' })
  userName?: string;

  @ApiPropertyOptional({ description: '표시명', example: '길동' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ description: '이메일', example: 'john@example.com' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: '전화번호', example: '010-1234-5678' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: '역할 코드', example: 'user' })
  @IsString()
  @IsOptional()
  roleCode?: string;

  @ApiPropertyOptional({ description: '부서 코드', example: 'DEV' })
  @IsString()
  @IsOptional()
  departmentCode?: string;

  @ApiPropertyOptional({ description: '직급 코드', example: 'senior' })
  @IsString()
  @IsOptional()
  positionCode?: string;

  @ApiPropertyOptional({ description: '사번', example: 'E240015' })
  @IsString()
  @IsOptional()
  employeeNumber?: string;

  @ApiPropertyOptional({ description: '외부 소속 회사명', example: 'Acme Corp' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ description: '고객사 ID', example: '1001' })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Primary affiliation type',
    enum: ['internal', 'external'],
    example: 'internal',
  })
  @IsString()
  @IsOptional()
  @IsIn(['internal', 'external'])
  primaryAffiliationType?: string;

  @ApiPropertyOptional({ description: '비밀번호 (변경 시에만)', example: 'NewPass1!' })
  @IsString()
  @IsOptional()
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다' })
  @MaxLength(100, { message: '비밀번호는 100자 이하여야 합니다' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*]).+$/, {
    message: '비밀번호는 영문, 숫자, 특수문자를 각각 1자 이상 포함해야 합니다',
  })
  password?: string;

  @ApiPropertyOptional({ description: '활성 상태', example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
