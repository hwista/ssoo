import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestPasswordResetDto {
  @ApiProperty({ description: '가입된 이메일 주소', example: 'user@example.com' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  @IsNotEmpty({ message: '이메일을 입력해주세요' })
  email!: string;
}

export class ConfirmPasswordResetDto {
  @ApiProperty({ description: '가입된 이메일 주소', example: 'user@example.com' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  @IsNotEmpty({ message: '이메일을 입력해주세요' })
  email!: string;

  @ApiProperty({ description: '메일로 받은 재설정 코드', example: '123456' })
  @IsString()
  @IsNotEmpty({ message: '재설정 코드를 입력해주세요' })
  @MaxLength(10)
  code!: string;

  @ApiProperty({ description: '새 비밀번호', example: 'NewPass1!' })
  @IsString()
  @IsNotEmpty({ message: '새 비밀번호를 입력해주세요' })
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다' })
  @MaxLength(100, { message: '비밀번호는 100자 이하여야 합니다' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*]).+$/, {
    message: '비밀번호는 영문, 숫자, 특수문자를 각각 1자 이상 포함해야 합니다',
  })
  newPassword!: string;
}
