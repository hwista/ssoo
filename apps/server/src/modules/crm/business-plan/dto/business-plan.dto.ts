import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, ValidateNested, IsIn, IsNumber, IsInt, Max, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import type {
  CrmBusinessPlanCarryForwardRequest,
  CrmBusinessPlanListQuery,
  CrmBusinessPlanMonthlyPlanInputRequest,
  CrmBusinessPlanPerformanceActualInputRequest,
  CrmBusinessPlanPerformanceMode,
  CrmBusinessPlanPerformanceQuery,
  CrmBusinessPlanPreviewQuery,
  CrmBusinessPlanPreviewRegion,
  CrmBusinessPlanRowUpsertRequest,
  CrmBusinessPlanRowWbsUpdateRequest,
  CrmBusinessPlanSnapshotRequest,
  CrmBusinessPlanStatus,
} from '@ssoo/types/crm';

const CRM_BUSINESS_PLAN_PREVIEW_REGIONS = ['all', 'domestic', 'overseas', 'unspecified'] as const;
const CRM_BUSINESS_PLAN_INPUT_REGIONS = ['domestic', 'overseas', 'unspecified'] as const;
const CRM_BUSINESS_PLAN_STATUSES = ['all', 'draft', 'confirmed'] as const;
const CRM_BUSINESS_PLAN_PERFORMANCE_MODES = ['extended-actual', 'source-compatible'] as const;

export class CrmBusinessPlanPreviewQueryDto implements CrmBusinessPlanPreviewQuery {
  @ApiPropertyOptional({ description: '업무 조직 ID', maxLength: 19 })
  @IsString()
  @MaxLength(19)
  @IsOptional()
  ownerOrganizationId?: string;

  @ApiPropertyOptional({ description: '3개년 preview 시작 사업년도', default: new Date().getFullYear() })
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  @IsOptional()
  baseYear?: number;

  @ApiPropertyOptional({ description: '사업구분', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  businessType?: string;

  @ApiPropertyOptional({ description: '계열/산업 구분', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  industryLine?: string;

  @ApiPropertyOptional({ description: '국내/해외', enum: CRM_BUSINESS_PLAN_PREVIEW_REGIONS, default: 'all' })
  @IsString()
  @IsIn(CRM_BUSINESS_PLAN_PREVIEW_REGIONS)
  @IsOptional()
  region?: CrmBusinessPlanPreviewRegion;

  @ApiPropertyOptional({ description: '고객/건명/담당자/WBS 검색어', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  search?: string;
}

export class CrmBusinessPlanPerformanceQueryDto implements CrmBusinessPlanPerformanceQuery {
  @ApiPropertyOptional({ description: '업무 조직 ID', maxLength: 19 })
  @IsString()
  @MaxLength(19)
  @IsOptional()
  ownerOrganizationId?: string;

  @ApiPropertyOptional({ description: '사업계획대비실적 preview 기준 사업년도', minimum: 2000, maximum: 2100, type: 'integer', default: new Date().getFullYear() })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({ description: '실적 의미. source-compatible은 원천 데모처럼 확정 계약 청구계획을 실적으로 사용', enum: CRM_BUSINESS_PLAN_PERFORMANCE_MODES, default: 'extended-actual' })
  @IsString()
  @IsIn(CRM_BUSINESS_PLAN_PERFORMANCE_MODES)
  @IsOptional()
  mode?: CrmBusinessPlanPerformanceMode;

  @ApiPropertyOptional({ description: '사업구분', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  businessType?: string;

  @ApiPropertyOptional({ description: '계열/산업 구분', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  industryLine?: string;

  @ApiPropertyOptional({ description: '국내/해외', enum: CRM_BUSINESS_PLAN_PREVIEW_REGIONS, default: 'all' })
  @IsString()
  @IsIn(CRM_BUSINESS_PLAN_PREVIEW_REGIONS)
  @IsOptional()
  region?: CrmBusinessPlanPreviewRegion;

  @ApiPropertyOptional({ description: '고객/건명/담당자/WBS 검색어', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  search?: string;
}

export class CrmBusinessPlanListQueryDto implements CrmBusinessPlanListQuery {
  @ApiPropertyOptional({ description: '업무 조직 ID', maxLength: 19 })
  @IsString()
  @MaxLength(19)
  @IsOptional()
  ownerOrganizationId?: string;

  @ApiPropertyOptional({ description: '사업계획 기준년도. 생략하면 전체 연도', default: new Date().getFullYear() })
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  @IsOptional()
  baseYear?: number;

  @ApiPropertyOptional({ description: '사업계획 상태', enum: CRM_BUSINESS_PLAN_STATUSES, default: 'all' })
  @IsString()
  @IsIn(CRM_BUSINESS_PLAN_STATUSES)
  @IsOptional()
  status?: CrmBusinessPlanStatus | 'all';

  @ApiPropertyOptional({ description: '차수명/코드/필터 검색어', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  search?: string;
}

export class CrmBusinessPlanSnapshotDto extends CrmBusinessPlanPreviewQueryDto implements CrmBusinessPlanSnapshotRequest {
  @ApiPropertyOptional({ description: '후보 없이 빈 최초 차수 생성', default: false })
  @IsBoolean()
  @IsOptional()
  empty?: boolean;

  @ApiPropertyOptional({ description: '저장할 사업계획 차수명', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  planName?: string;

  @ApiPropertyOptional({ description: '차수 메모', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  memo?: string;
}

export class CrmBusinessPlanCarryForwardDto extends CrmBusinessPlanSnapshotDto implements CrmBusinessPlanCarryForwardRequest {
  @ApiPropertyOptional({ description: '이월 원천 사업계획 기준년도. 생략하면 baseYear - 1', default: new Date().getFullYear() - 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  @IsOptional()
  sourceBaseYear?: number;
}

export class CrmBusinessPlanMonthlyPlanInputDto implements CrmBusinessPlanMonthlyPlanInputRequest {
  @ApiPropertyOptional({ description: '1월부터 12월까지의 직접 입력 계획 매출', type: [Number], minItems: 12, maxItems: 12 })
  @IsArray()
  @ArrayMinSize(12)
  @ArrayMaxSize(12)
  @IsNumber({}, { each: true })
  monthlyRevenueAmounts!: number[];

  @ApiProperty({ description: '1월부터 12월까지의 직접 입력 계획 외부원가', type: [Number], minItems: 12, maxItems: 12 })
  @IsArray()
  @ArrayMinSize(12)
  @ArrayMaxSize(12)
  @IsNumber({}, { each: true })
  monthlyExternalCostAmounts!: number[];

  @ApiPropertyOptional({ description: '월별 입력 메모', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  memo?: string;
}

export class CrmBusinessPlanRowUpsertDto implements CrmBusinessPlanRowUpsertRequest {
  @ApiProperty({ description: '사업구분', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  businessType!: string;

  @ApiProperty({ description: '계열/산업 구분', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  industryLine!: string;

  @ApiProperty({ description: '담당자', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  ownerName!: string;

  @ApiProperty({ description: '국내/해외', enum: CRM_BUSINESS_PLAN_INPUT_REGIONS })
  @IsString()
  @IsIn(CRM_BUSINESS_PLAN_INPUT_REGIONS)
  region!: Exclude<CrmBusinessPlanPreviewRegion, 'all'>;

  @ApiProperty({ description: '사업명', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  businessName!: string;

  @ApiPropertyOptional({ description: 'WBS 코드', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  wbsCode?: string;

  @ApiProperty({ description: '기준년도 1~12월 계획 매출', type: [Number], minItems: 12, maxItems: 12 })
  @IsArray()
  @ArrayMinSize(12)
  @ArrayMaxSize(12)
  @IsNumber({}, { each: true })
  monthlyRevenueAmounts!: number[];

  @ApiProperty({ description: '기준년도 1~12월 계획 외부원가', type: [Number], minItems: 12, maxItems: 12 })
  @IsArray()
  @ArrayMinSize(12)
  @ArrayMaxSize(12)
  @IsNumber({}, { each: true })
  monthlyExternalCostAmounts!: number[];

  @ApiProperty({ description: '차년도 연간 계획 매출' })
  @IsNumber()
  nextYearRevenueAmount!: number;

  @ApiProperty({ description: '차년도 연간 계획 외부원가' })
  @IsNumber()
  nextYearExternalCostAmount!: number;

  @ApiProperty({ description: '차차년도 연간 계획 매출' })
  @IsNumber()
  followingYearRevenueAmount!: number;

  @ApiProperty({ description: '차차년도 연간 계획 외부원가' })
  @IsNumber()
  followingYearExternalCostAmount!: number;

  @ApiPropertyOptional({ description: '행 메모', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  memo?: string;
}

export class CrmBusinessPlanRowWbsUpdateDto implements CrmBusinessPlanRowWbsUpdateRequest {
  @ApiPropertyOptional({ description: '확정 여부와 무관하게 갱신 가능한 WBS 코드', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  wbsCode?: string;
}

export class CrmBusinessPlanPerformanceActualInputDto implements CrmBusinessPlanPerformanceActualInputRequest {
  @ApiPropertyOptional({ description: '업무 조직 ID', maxLength: 19 })
  @IsString()
  @MaxLength(19)
  @IsOptional()
  ownerOrganizationId?: string;

  @ApiPropertyOptional({ description: '사업계획대비실적 직접 입력 기준년도', default: new Date().getFullYear() })
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  year!: number;

  @ApiPropertyOptional({ description: '사업구분', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  businessType!: string;

  @ApiPropertyOptional({ description: '계열/산업 구분', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  industryLine!: string;

  @ApiPropertyOptional({ description: '담당자', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  ownerName!: string;

  @ApiPropertyOptional({ description: '국내/해외', enum: CRM_BUSINESS_PLAN_INPUT_REGIONS, default: 'domestic' })
  @IsString()
  @IsIn(CRM_BUSINESS_PLAN_INPUT_REGIONS)
  region!: Exclude<CrmBusinessPlanPreviewRegion, 'all'>;

  @ApiPropertyOptional({ description: 'WBS 코드', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  wbsCode?: string;

  @ApiPropertyOptional({ description: '1월부터 12월까지의 직접 입력 실적 매출', type: [Number], minItems: 12, maxItems: 12 })
  @IsArray()
  @ArrayMinSize(12)
  @ArrayMaxSize(12)
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  monthlyRevenueAmounts!: number[];

  @ApiPropertyOptional({ description: '1월부터 12월까지의 직접 입력 실적 원가', type: [Number], minItems: 12, maxItems: 12 })
  @IsArray()
  @ArrayMinSize(12)
  @ArrayMaxSize(12)
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  monthlyCostAmounts!: number[];

  @ApiPropertyOptional({ description: '직접 실적 입력 메모', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  memo?: string;
}

export class CrmBusinessPlanBulkRowDto extends CrmBusinessPlanRowUpsertDto {
  @ApiPropertyOptional({ description: '수정할 기존 행 코드. 생략하면 새 행', maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  rowCode?: string;
}

export class CrmBusinessPlanBulkRowsDto {
  @ApiProperty({ type: [CrmBusinessPlanBulkRowDto], minItems: 1, maxItems: 500 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CrmBusinessPlanBulkRowDto)
  rows!: CrmBusinessPlanBulkRowDto[];
}

export class CrmBusinessPlanCarryContractsDto extends CrmBusinessPlanPreviewQueryDto {
  @ApiPropertyOptional({ description: '진행 계약 배분 기준', enum: ['billing', 'progress'], default: 'billing' })
  @IsOptional()
  @IsIn(['billing', 'progress'])
  method?: 'billing' | 'progress';
}
