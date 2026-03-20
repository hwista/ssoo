import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: '로그인 ID', example: 'john.doe' })
  @IsString()
  @IsNotEmpty({ message: '로그인 ID를 입력해주세요' })
  @MaxLength(50, { message: '로그인 ID는 50자 이하여야 합니다' })
  loginId!: string;

  @ApiProperty({ description: '비밀번호', example: 'Password1!' })
  @IsString()
  @IsNotEmpty({ message: '비밀번호를 입력해주세요' })
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다' })
  @MaxLength(100, { message: '비밀번호는 100자 이하여야 합니다' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*]).+$/, {
    message: '비밀번호는 영문, 숫자, 특수문자를 각각 1자 이상 포함해야 합니다',
  })
  password!: string;

  @ApiProperty({ description: '사용자명', example: '홍길동' })
  @IsString()
  @IsNotEmpty({ message: '사용자명을 입력해주세요' })
  @MaxLength(100, { message: '사용자명은 100자 이하여야 합니다' })
  userName!: string;

  @ApiPropertyOptional({ description: '표시명', example: '길동' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  displayName?: string;

  @ApiProperty({ description: '이메일', example: 'john@example.com' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  @IsNotEmpty({ message: '이메일을 입력해주세요' })
  email!: string;

  @ApiPropertyOptional({ description: '전화번호', example: '010-1234-5678' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: '역할 코드', example: 'user', default: 'user' })
  @IsString()
  @IsOptional()
  roleCode?: string;

  @ApiPropertyOptional({ description: '사용자 유형 코드', example: 'internal', default: 'internal' })
  @IsString()
  @IsOptional()
  userTypeCode?: string;

  @ApiPropertyOptional({ description: '부서 코드', example: 'DEV' })
  @IsString()
  @IsOptional()
  departmentCode?: string;

  @ApiPropertyOptional({ description: '직급 코드', example: 'senior' })
  @IsString()
  @IsOptional()
  positionCode?: string;
}
