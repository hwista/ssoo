import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListRegistrationRequestsQueryDto {
  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '페이지당 항목 수', default: 20, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: '상태 필터', enum: ['pending', 'approved', 'rejected', 'expired'] })
  @IsIn(['pending', 'approved', 'rejected', 'expired'])
  @IsOptional()
  statusCode?: string;
}

export class DecideRegistrationRequestDto {
  @ApiPropertyOptional({ description: '승인 시 부여할 역할 코드', default: 'user' })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  roleCode?: string;

  @ApiPropertyOptional({ description: '승인/반려 메모' })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  memo?: string | null;
}
