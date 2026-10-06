import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RequestPostAccessDto {
  @ApiProperty({ enum: ['read', 'write'] })
  @IsIn(['read', 'write'])
  role!: 'read' | 'write';

  @ApiProperty({ maxLength: 500 })
  @IsString() @MinLength(1) @MaxLength(500)
  message!: string;
}

export class DecidePostAccessDto {
  @ApiProperty({ enum: ['approve', 'reject', 'cancel', 'revoke'] })
  @IsIn(['approve', 'reject', 'cancel', 'revoke'])
  decision!: 'approve' | 'reject' | 'cancel' | 'revoke';

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500)
  message?: string;

  @ApiPropertyOptional({ description: '승인 권한 만료 시각', format: 'date-time' })
  @IsOptional() @IsDateString()
  expiresAt?: string;
}
