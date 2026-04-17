import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';

// ─── Swagger Response DTOs ───

export class ProjectDeliverableDto {
  @ApiProperty({ description: '프로젝트 ID' })
  projectId!: string;

  @ApiProperty({ description: '상태 코드 (request/proposal/execution/transition)' })
  statusCode!: string;

  @ApiProperty({ description: '산출물 코드' })
  deliverableCode!: string;

  @ApiPropertyOptional({ description: '연결 이벤트 ID' })
  eventId?: string;

  @ApiPropertyOptional({ description: '산출물명 (마스터 조인)' })
  deliverableName?: string;

  @ApiPropertyOptional({ description: '연결 이벤트 정보' })
  event?: { eventId: string; eventCode: string; eventName: string } | null;

  @ApiProperty({ description: '제출 상태 코드' })
  submissionStatusCode!: string;

  @ApiPropertyOptional({ description: '제출일' })
  submittedAt?: string;

  @ApiPropertyOptional({ description: '제출자 ID' })
  submittedBy?: string;

  @ApiPropertyOptional({ description: '원본 파일명' })
  originalFileName?: string;

  @ApiPropertyOptional({ description: '메모' })
  memo?: string;

  @ApiProperty({ description: '활성 여부' })
  isActive!: boolean;
}

export class ProjectCloseConditionDto {
  @ApiProperty({ description: '프로젝트 ID' })
  projectId!: string;

  @ApiProperty({ description: '상태 코드 (request/proposal/execution/transition)' })
  statusCode!: string;

  @ApiProperty({ description: '종료 조건 코드' })
  conditionCode!: string;

  @ApiPropertyOptional({ description: '연결 이벤트 ID' })
  eventId?: string;

  @ApiProperty({ description: '산출물 필요 여부' })
  requiresDeliverable!: boolean;

  @ApiProperty({ description: '체크 여부' })
  isChecked!: boolean;

  @ApiPropertyOptional({ description: '체크 일시' })
  checkedAt?: string;

  @ApiPropertyOptional({ description: '체크자 ID' })
  checkedBy?: string;

  @ApiProperty({ description: '정렬 순서' })
  sortOrder!: number;

  @ApiPropertyOptional({ description: '메모' })
  memo?: string;

  @ApiProperty({ description: '활성 여부' })
  isActive!: boolean;

  @ApiPropertyOptional({ description: '연결 이벤트 정보' })
  event?: { eventId: string; eventCode: string; eventName: string } | null;
}

// ─── Request DTOs ───

export class UpsertDeliverableDto {
  @ApiProperty({ description: '상태 코드 (request/proposal/execution/transition)' })
  @IsString()
  statusCode!: string;

  @ApiProperty({ description: '산출물 코드' })
  @IsString()
  deliverableCode!: string;

  @ApiProperty({ description: '제출 상태 코드' })
  @IsString()
  submissionStatusCode!: string;

  @ApiPropertyOptional({ description: '연결 이벤트 ID' })
  @IsString()
  @IsOptional()
  eventId?: string;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  memo?: string;
}

export class UpdateSubmissionDto {
  @ApiProperty({ description: '제출 상태 코드' })
  @IsString()
  submissionStatusCode!: string;
}

export class UpsertCloseConditionDto {
  @ApiProperty({ description: '상태 코드 (request/proposal/execution/transition)' })
  @IsString()
  statusCode!: string;

  @ApiProperty({ description: '종료 조건 코드' })
  @IsString()
  conditionCode!: string;

  @ApiProperty({ description: '산출물 필요 여부' })
  @IsBoolean()
  requiresDeliverable!: boolean;

  @ApiPropertyOptional({ description: '연결 이벤트 ID' })
  @IsString()
  @IsOptional()
  eventId?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  memo?: string;
}

export class ToggleCheckDto {
  @ApiProperty({ description: '체크 여부' })
  @IsBoolean()
  isChecked!: boolean;
}
