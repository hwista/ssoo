import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, Max, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import type {
  CrmBillingSplitPreviewRequest,
  CrmBillingSplitTarget,
  CrmContractBillingActualUpsertLine,
  CrmContractBillingActualUpsertRequest,
  CrmContractBillingPlanUpsertLine,
  CrmContractDmsDocumentDraftRequest,
  CrmContractDmsDocumentExecutionEvidenceRequest,
  CrmContractDmsDocumentExecutionEvidenceStep,
  CrmContractDmsDocumentExecutionStepKey,
  CrmContractDmsDocumentLifecycleExecutionRequest,
  CrmContractPerformanceQuery,
  CrmContractPerformanceRegion,
  CrmContractStatus,
  CrmContractUpsertLine,
  CrmContractUpsertRequest,
  CrmOpportunityDiscountType,
  CrmOpportunityLineCategory,
  CrmOpportunityServiceType,
} from '@ssoo/types/crm';

const CRM_BILLING_SPLIT_TARGETS = ['revenue', 'external-cost', 'both'] as const;
const CRM_CONTRACT_STATUSES = ['review', 'active', 'completed', 'terminated'] as const;
const CRM_CONTRACT_REGIONS = ['domestic', 'overseas', 'unspecified'] as const;
const CRM_CONTRACT_PERFORMANCE_REGIONS = ['all', 'domestic', 'overseas', 'unspecified'] as const;
const CRM_CONTRACT_LINE_CATEGORIES = ['product', 'service', 'internal-cost', 'external-cost'] as const;
const CRM_CONTRACT_SERVICE_TYPES = ['internal', 'external'] as const;
const CRM_CONTRACT_DISCOUNT_TYPES = ['amount', 'rate'] as const;
const CRM_CONTRACT_DMS_EXECUTION_STEP_KEYS = ['template-review', 'attachment-confirmation', 'word-export', 'pdf-export', 'approval'] as const;

export class CrmContractUpsertLineDto implements CrmContractUpsertLine {
  @ApiPropertyOptional({ description: '클라이언트 라인 식별자' })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  id?: string;

  @ApiProperty({ description: '라인 분류', enum: CRM_CONTRACT_LINE_CATEGORIES })
  @IsString()
  @IsIn(CRM_CONTRACT_LINE_CATEGORIES)
  category!: CrmOpportunityLineCategory;

  @ApiProperty({ description: '라인명', maxLength: 300 })
  @IsString()
  @MaxLength(300)
  label!: string;

  @ApiPropertyOptional({ description: '수량 또는 M/M' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ description: '단가' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;

  @ApiPropertyOptional({ description: '직접 입력 금액. 수량/단가가 있으면 서버가 재계산합니다.' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ description: '원가 대비 매출 이익률' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  marginRate?: number;

  @ApiPropertyOptional({ description: '금액 절사 단위' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  truncUnit?: number;

  @ApiPropertyOptional({ description: '소속/부서', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ description: '성명 또는 수행 그룹', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  memberName?: string;

  @ApiPropertyOptional({ description: '등급', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  grade?: string;

  @ApiPropertyOptional({ description: '용역 구분', enum: CRM_CONTRACT_SERVICE_TYPES })
  @IsString()
  @IsIn(CRM_CONTRACT_SERVICE_TYPES)
  @IsOptional()
  serviceType?: CrmOpportunityServiceType;

  @ApiPropertyOptional({ description: '매출 연동 여부' })
  @IsBoolean()
  @IsOptional()
  revenueLinked?: boolean;

  @ApiPropertyOptional({ description: '연동된 원가 라인 식별자', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  linkedCostLineId?: string;

  @ApiPropertyOptional({ description: '매출 연동 단가' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  revenueUnitPrice?: number;
}

export class CrmContractBillingPlanUpsertLineDto implements CrmContractBillingPlanUpsertLine {
  @ApiProperty({ description: '청구 예정월(YYYY/MM)', maxLength: 7 })
  @IsString()
  @MaxLength(7)
  billingYm!: string;

  @ApiPropertyOptional({ description: '매출 청구계획 금액' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  revenueAmount?: number;

  @ApiPropertyOptional({ description: '외부원가 계획 금액' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  externalCostAmount?: number;
}

export class CrmContractBillingActualUpsertLineDto implements CrmContractBillingActualUpsertLine {
  @ApiProperty({ description: '청구 실적월(YYYY/MM)', maxLength: 7 })
  @IsString()
  @MaxLength(7)
  billingYm!: string;

  @ApiPropertyOptional({ description: '매출 청구실적 금액' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  revenueAmount?: number;

  @ApiPropertyOptional({ description: '외부원가 실적 금액' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  externalCostAmount?: number;
}

export class CrmContractBillingActualUpsertDto implements CrmContractBillingActualUpsertRequest {
  @ApiProperty({ description: '청구실적 라인', type: [CrmContractBillingActualUpsertLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrmContractBillingActualUpsertLineDto)
  lines!: CrmContractBillingActualUpsertLineDto[];
}

export class CrmContractDmsDocumentDraftDto implements CrmContractDmsDocumentDraftRequest {
  @ApiPropertyOptional({ description: '선택한 DMS 계약 DOCX 템플릿 key', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  templateKey?: string;

  @ApiPropertyOptional({ description: 'DMS markdown 초안 저장 메모', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  memo?: string;
}

export class CrmContractDmsDocumentExecutionEvidenceStepDto implements CrmContractDmsDocumentExecutionEvidenceStep {
  @ApiProperty({ description: 'DMS가 완료 증거를 남길 lifecycle step', enum: CRM_CONTRACT_DMS_EXECUTION_STEP_KEYS })
  @IsString()
  @IsIn(CRM_CONTRACT_DMS_EXECUTION_STEP_KEYS)
  key!: CrmContractDmsDocumentExecutionStepKey;

  @ApiProperty({ description: 'DMS 실행 결과 evidence path 또는 artifact reference', maxLength: 800 })
  @IsString()
  @MaxLength(800)
  evidencePath!: string;

  @ApiPropertyOptional({ description: 'Evidence label override', maxLength: 160 })
  @IsString()
  @MaxLength(160)
  @IsOptional()
  evidenceLabel?: string;

  @ApiPropertyOptional({ description: 'DMS 실행 결과 메모', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  note?: string;
}

export class CrmContractDmsDocumentExecutionEvidenceDto implements CrmContractDmsDocumentExecutionEvidenceRequest {
  @ApiProperty({ description: 'DMS lifecycle 실행 evidence step 목록', type: [CrmContractDmsDocumentExecutionEvidenceStepDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CrmContractDmsDocumentExecutionEvidenceStepDto)
  steps!: CrmContractDmsDocumentExecutionEvidenceStepDto[];

  @ApiPropertyOptional({ description: 'DMS execution evidence 기록 메모', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  memo?: string;
}

export class CrmContractDmsDocumentLifecycleExecutionDto implements CrmContractDmsDocumentLifecycleExecutionRequest {
  @ApiPropertyOptional({ description: 'DMS lifecycle 실행 메모' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  memo?: string;
}

export class CrmContractPerformanceQueryDto implements CrmContractPerformanceQuery {
  @ApiPropertyOptional({ description: '원천 화면은 계약명만 검색, 기본 운영 화면은 고객사/WBS 등을 함께 검색', enum: ['operations', 'source-compatible'], default: 'operations' })
  @IsIn(['operations', 'source-compatible'])
  @IsOptional()
  mode?: 'operations' | 'source-compatible';

  @ApiPropertyOptional({ description: '사업년도', default: new Date().getFullYear() })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  @IsOptional()
  year?: number;

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

  @ApiPropertyOptional({ description: '국내/해외', enum: CRM_CONTRACT_PERFORMANCE_REGIONS, default: 'all' })
  @IsString()
  @IsIn(CRM_CONTRACT_PERFORMANCE_REGIONS)
  @IsOptional()
  region?: CrmContractPerformanceRegion;

  @ApiPropertyOptional({ description: '계약명/고객사/WBS 검색어', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  search?: string;
}

export class CrmContractUpsertDto implements CrmContractUpsertRequest {
  @ApiPropertyOptional({ description: '승인된 업무 조직 ID (신규 필수, 한 조직만 있으면 자동 선택)', maxLength: 19 })
  @IsOptional()
  @IsString()
  @MaxLength(19)
  ownerOrganizationId?: string;

  @ApiPropertyOptional({ description: '전환 원천 영업기회 ID' })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  sourceOpportunityId?: string;

  @ApiPropertyOptional({ description: '전환 원천 영업기회 코드' })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  sourceOpportunityCode?: string;

  @ApiProperty({ description: '고객사명', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  customerName!: string;

  @ApiProperty({ description: '계약명', maxLength: 300 })
  @IsString()
  @MaxLength(300)
  contractName!: string;

  @ApiProperty({ description: '담당자명', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  ownerName!: string;

  @ApiPropertyOptional({ description: '고객사 계약 담당자명', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  clientContactName?: string;

  @ApiPropertyOptional({ description: 'SSOO 공용 사용자 담당자 ID', maxLength: 40 })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  ownerUserId?: string;

  @ApiProperty({ description: '사업구분', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  businessType!: string;

  @ApiProperty({ description: '계열/산업 구분', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  industryLine!: string;

  @ApiProperty({ description: '국내/해외', enum: CRM_CONTRACT_REGIONS })
  @IsString()
  @IsIn(CRM_CONTRACT_REGIONS)
  region!: 'domestic' | 'overseas' | 'unspecified';

  @ApiPropertyOptional({ description: '계약 상태', enum: CRM_CONTRACT_STATUSES, default: 'review' })
  @IsString()
  @IsIn(CRM_CONTRACT_STATUSES)
  @IsOptional()
  status?: CrmContractStatus;

  @ApiProperty({ description: '계약 시작일(YYYY-MM-DD). 임시 저장 시 빈 문자열 허용, 확정 시 필수' })
  @IsString()
  contractStartDate!: string;

  @ApiProperty({ description: '계약 종료일(YYYY-MM-DD). 임시 저장 시 빈 문자열 허용, 확정 시 필수' })
  @IsString()
  contractEndDate!: string;

  @ApiPropertyOptional({ description: 'WBS 코드', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  wbsCode?: string;

  @ApiPropertyOptional({ description: '수금조건 코드', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  paymentTermCode?: string;

  @ApiPropertyOptional({ description: '특별할인 유형', enum: CRM_CONTRACT_DISCOUNT_TYPES, default: 'amount' })
  @IsString()
  @IsIn(CRM_CONTRACT_DISCOUNT_TYPES)
  @IsOptional()
  specialDiscountType?: CrmOpportunityDiscountType;

  @ApiPropertyOptional({ description: '특별할인 값' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  specialDiscountValue?: number;

  @ApiProperty({ description: '매출 라인', type: [CrmContractUpsertLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrmContractUpsertLineDto)
  revenueLines!: CrmContractUpsertLineDto[];

  @ApiProperty({ description: '원가 라인', type: [CrmContractUpsertLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrmContractUpsertLineDto)
  costLines!: CrmContractUpsertLineDto[];

  @ApiPropertyOptional({ description: '청구계획', type: [CrmContractBillingPlanUpsertLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrmContractBillingPlanUpsertLineDto)
  @IsOptional()
  billingPlan?: CrmContractBillingPlanUpsertLineDto[];

  @ApiPropertyOptional({ description: '다음 행동', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  nextAction?: string;
}

export class CrmBillingSplitPreviewDto implements CrmBillingSplitPreviewRequest {
  @ApiProperty({ description: '계약 시작일(YYYY-MM-DD)' })
  @IsString()
  startDate!: string;

  @ApiProperty({ description: '계약 종료일(YYYY-MM-DD)' })
  @IsString()
  endDate!: string;

  @ApiProperty({ description: '분할 대상 매출 총액' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalRevenue!: number;

  @ApiProperty({ description: '분할 대상 외부원가 총액' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalExternalCost!: number;

  @ApiPropertyOptional({ description: '분할 대상', enum: CRM_BILLING_SPLIT_TARGETS, default: 'both' })
  @IsString()
  @IsIn(CRM_BILLING_SPLIT_TARGETS)
  @IsOptional()
  target?: CrmBillingSplitTarget;

  @ApiPropertyOptional({ description: '분할 주기(월)', default: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  periodMonths?: number;

  @ApiPropertyOptional({ description: '절사 단위', default: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  truncUnit?: number;

  @ApiPropertyOptional({ description: '종료월 강제 포함 여부', default: true })
  @IsBoolean()
  @IsOptional()
  includeLastMonth?: boolean;
}
