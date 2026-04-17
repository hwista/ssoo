import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FindNotificationsDto {
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

  @ApiPropertyOptional({ description: '읽지 않은 알림만 필터' })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  unreadOnly?: boolean;
}
