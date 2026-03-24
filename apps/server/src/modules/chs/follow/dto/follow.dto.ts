import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class FollowPaginationDto {
  @ApiPropertyOptional({ description: '대상 사용자 ID' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '페이지 크기', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number;
}
