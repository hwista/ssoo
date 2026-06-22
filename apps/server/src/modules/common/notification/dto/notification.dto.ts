import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import type { CommonNotificationListQuery, CommonNotificationSourceApp } from '@ssoo/types/common';

export const COMMON_NOTIFICATION_SOURCE_APPS = [
  'system',
  'dms',
  'sns',
  'pms',
  'admin',
  'crm',
] as const;

export class ListNotificationsDto implements CommonNotificationListQuery {
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

  @ApiPropertyOptional({ description: '읽지 않은 알림만 조회' })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ description: '읽은 알림만 조회' })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  readOnly?: boolean;

  @ApiPropertyOptional({ description: '출처 앱', enum: COMMON_NOTIFICATION_SOURCE_APPS })
  @IsIn(COMMON_NOTIFICATION_SOURCE_APPS)
  @IsOptional()
  sourceApp?: CommonNotificationSourceApp;

  @ApiPropertyOptional({ description: '알림 타입', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  notificationType?: string;
}

export class MarkNotificationsByReferenceDto {
  @ApiProperty({ description: '알림 참조 경로', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  path!: string;

  @ApiPropertyOptional({ description: '출처 앱', enum: COMMON_NOTIFICATION_SOURCE_APPS })
  @IsIn(COMMON_NOTIFICATION_SOURCE_APPS)
  @IsOptional()
  sourceApp?: CommonNotificationSourceApp;
}

export class NotificationSourceAppQueryDto {
  @ApiPropertyOptional({ description: '출처 앱', enum: COMMON_NOTIFICATION_SOURCE_APPS })
  @IsIn(COMMON_NOTIFICATION_SOURCE_APPS)
  @IsOptional()
  sourceApp?: CommonNotificationSourceApp;
}
