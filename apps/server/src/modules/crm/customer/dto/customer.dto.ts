import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import type {
  CrmCustomerActivityCreateRequest,
  CrmCustomerAiIndexBackfillRequest,
  CrmCustomerActivityStatus,
  CrmCustomerActivityType,
  CrmCustomerRegion,
  CrmCustomerType,
  CrmCustomerUpsertRequest,
} from '@ssoo/types/crm';

const CRM_CUSTOMER_TYPES = ['prospect', 'active', 'partner', 'inactive'] as const;
const CRM_CUSTOMER_REGIONS = ['domestic', 'overseas'] as const;
const CRM_CUSTOMER_ACTIVITY_TYPES = [
  'call',
  'meeting',
  'email',
  'proposal',
  'contract',
  'support',
  'opportunity-next-action',
] as const;
const CRM_CUSTOMER_ACTIVITY_STATUSES = ['planned', 'done', 'cancelled'] as const;

export class CrmCustomerListQueryDto {
  @ApiPropertyOptional({ description: '고객명/담당자/업종/다음 행동 검색어', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: '고객 상태', enum: [...CRM_CUSTOMER_TYPES, 'all'] })
  @IsString()
  @IsIn([...CRM_CUSTOMER_TYPES, 'all'])
  @IsOptional()
  type?: CrmCustomerType | 'all';

  @ApiPropertyOptional({ description: '정렬', enum: ['updated-desc', 'activity-desc', 'name-asc'] })
  @IsString()
  @IsIn(['updated-desc', 'activity-desc', 'name-asc'])
  @IsOptional()
  sort?: 'updated-desc' | 'activity-desc' | 'name-asc';

  @ApiPropertyOptional({ description: '최대 조회 건수', minimum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;
}

export class CrmCustomerUpsertDto implements CrmCustomerUpsertRequest {
  @ApiPropertyOptional({ description: '승인된 업무 조직 ID (신규 필수, 한 조직만 있으면 자동 선택)', maxLength: 19 })
  @IsOptional()
  @IsString()
  @MaxLength(19)
  ownerOrganizationId?: string;

  @ApiProperty({ description: '고객사명', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  customerName!: string;

  @ApiPropertyOptional({ description: '고객 상태', enum: CRM_CUSTOMER_TYPES })
  @IsString()
  @IsIn(CRM_CUSTOMER_TYPES)
  @IsOptional()
  type?: CrmCustomerType;

  @ApiProperty({ description: '계열/산업 구분', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  industryLine!: string;

  @ApiProperty({ description: '국내/해외', enum: CRM_CUSTOMER_REGIONS })
  @IsString()
  @IsIn(CRM_CUSTOMER_REGIONS)
  region!: CrmCustomerRegion;

  @ApiProperty({ description: '담당자명', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  ownerName!: string;

  @ApiPropertyOptional({ description: 'SSOO 공용 사용자 담당자 ID', maxLength: 40 })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  ownerUserId?: string;

  @ApiPropertyOptional({ description: '고객 담당자명', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  contactName?: string;

  @ApiPropertyOptional({ description: '고객 담당자 e-Mail', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional({ description: '고객 담당자 전화번호', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  contactPhone?: string;

  @ApiPropertyOptional({ description: '원천 영업기회 ID', maxLength: 40 })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  sourceOpportunityId?: string;

  @ApiPropertyOptional({ description: '최신 영업기회 코드', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  latestOpportunityCode?: string;

  @ApiPropertyOptional({ description: '최근 상호작용 요약', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  lastInteractionSummary?: string;

  @ApiProperty({ description: '다음 행동', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  nextAction!: string;
}

export class CrmCustomerActivityListQueryDto {
  @ApiPropertyOptional({ description: '활동 유형', enum: [...CRM_CUSTOMER_ACTIVITY_TYPES, 'all'] })
  @IsString()
  @IsIn([...CRM_CUSTOMER_ACTIVITY_TYPES, 'all'])
  @IsOptional()
  type?: CrmCustomerActivityType | 'all';

  @ApiPropertyOptional({ description: '최대 조회 건수', minimum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;
}

export class CrmCustomerActivityCreateDto implements CrmCustomerActivityCreateRequest {
  @ApiPropertyOptional({ description: '원천 영업기회 ID', maxLength: 40 })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  sourceOpportunityId?: string;

  @ApiPropertyOptional({ description: '원천 영업기회 코드', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  sourceOpportunityCode?: string;

  @ApiProperty({ description: '활동 유형', enum: CRM_CUSTOMER_ACTIVITY_TYPES })
  @IsString()
  @IsIn(CRM_CUSTOMER_ACTIVITY_TYPES)
  type!: CrmCustomerActivityType;

  @ApiPropertyOptional({ description: '활동 상태', enum: CRM_CUSTOMER_ACTIVITY_STATUSES })
  @IsString()
  @IsIn(CRM_CUSTOMER_ACTIVITY_STATUSES)
  @IsOptional()
  status?: CrmCustomerActivityStatus;

  @ApiProperty({ description: '활동 제목', maxLength: 300 })
  @IsString()
  @MaxLength(300)
  subject!: string;

  @ApiPropertyOptional({ description: '활동 일시(ISO 또는 YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  occurredAt?: string;

  @ApiPropertyOptional({ description: '후속 예정 일시(ISO 또는 YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  dueAt?: string;

  @ApiProperty({ description: '담당자명', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  ownerName!: string;

  @ApiPropertyOptional({ description: 'SSOO 공용 사용자 담당자 ID', maxLength: 40 })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  ownerUserId?: string;

  @ApiProperty({ description: '활동 요약', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  summary!: string;

  @ApiPropertyOptional({ description: '다음 행동', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  nextAction?: string;
}

export class CrmCustomerAiIndexBackfillDto implements CrmCustomerAiIndexBackfillRequest {
  @ApiPropertyOptional({ description: '재색인할 CRM 고객 ID 목록', type: [String], maxItems: 500 })
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @IsOptional()
  customerIds?: string[];

  @ApiPropertyOptional({ description: '재색인할 CRM 고객 활동 ID 목록', type: [String], maxItems: 500 })
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @IsOptional()
  activityIds?: string[];

  @ApiPropertyOptional({ description: '엔티티 타입별 최대 선택 건수', minimum: 1, maximum: 500 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: '비활성 고객/활동 포함 여부' })
  @IsBoolean()
  @IsOptional()
  includeInactive?: boolean;

  @ApiPropertyOptional({ description: 'AI 인덱스 재색인 요청 사유 코드', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  reasonCode?: string;
}
