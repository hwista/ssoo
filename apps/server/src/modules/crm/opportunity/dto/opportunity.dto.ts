import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import type {
  CrmOpportunityLineCategory,
  CrmOpportunityDiscountType,
  CrmOpportunityServiceType,
  CrmOpportunityPriority,
  CrmOpportunityContractConversionRequest,
  CrmOpportunityContractDocumentDraftRequest,
  CrmOpportunityContractDocumentLifecycleExecutionRequest,
  CrmOpportunityStatus,
  CrmOpportunityUpsertLine,
  CrmOpportunityUpsertRequest,
  CrmQuoteDmsDocumentDraftRequest,
  CrmQuoteDmsDocumentExecutionEvidenceRequest,
  CrmQuoteDmsDocumentExecutionEvidenceStep,
  CrmQuoteDmsDocumentExecutionStepKey,
  CrmQuoteDmsDocumentLifecycleExecutionRequest,
  CrmQuoteWorkflowStatus,
  CrmQuoteWorkflowUpdateRequest,
} from '@ssoo/types/crm';

const CRM_OPPORTUNITY_STATUSES = ['draft', 'qualified', 'proposal', 'won', 'lost', 'hold'] as const;
const CRM_OPPORTUNITY_PRIORITIES = ['high', 'medium', 'low'] as const;
const CRM_OPPORTUNITY_REGIONS = ['domestic', 'overseas', 'unspecified'] as const;
const CRM_OPPORTUNITY_LINE_CATEGORIES = ['product', 'service', 'internal-cost', 'external-cost'] as const;
const CRM_OPPORTUNITY_SERVICE_TYPES = ['internal', 'external'] as const;
const CRM_OPPORTUNITY_DISCOUNT_TYPES = ['amount', 'rate'] as const;
const CRM_QUOTE_WORKFLOW_STATUSES = ['draft', 'review', 'approved', 'sent', 'accepted', 'rejected', 'void'] as const;
const CRM_QUOTE_DMS_EXECUTION_STEP_KEYS = ['template-review', 'word-export', 'pdf-export'] as const;

export class CrmOpportunityUpsertLineDto implements CrmOpportunityUpsertLine {
  @ApiPropertyOptional({ description: '클라이언트 라인 식별자' })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ description: '라인 분류', enum: CRM_OPPORTUNITY_LINE_CATEGORIES })
  @IsString()
  @IsIn(CRM_OPPORTUNITY_LINE_CATEGORIES)
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

  @ApiPropertyOptional({ description: '용역 구분', enum: CRM_OPPORTUNITY_SERVICE_TYPES })
  @IsString()
  @IsIn(CRM_OPPORTUNITY_SERVICE_TYPES)
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

export class CrmOpportunityUpsertDto implements CrmOpportunityUpsertRequest {
  @ApiPropertyOptional({ description: '승인된 업무 조직 ID (신규 필수, 한 조직만 있으면 자동 선택)', maxLength: 19 })
  @IsOptional()
  @IsString()
  @MaxLength(19)
  ownerOrganizationId?: string;

  @ApiProperty({ description: '고객사명', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  customerName!: string;

  @ApiProperty({ description: '영업기회명', maxLength: 300 })
  @IsString()
  @MaxLength(300)
  opportunityName!: string;

  @ApiProperty({ description: '담당자명', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  ownerName!: string;

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

  @ApiProperty({ description: '국내/해외', enum: CRM_OPPORTUNITY_REGIONS })
  @IsString()
  @IsIn(CRM_OPPORTUNITY_REGIONS)
  region!: 'domestic' | 'overseas' | 'unspecified';

  @ApiProperty({ description: '영업상태', enum: CRM_OPPORTUNITY_STATUSES })
  @IsString()
  @IsIn(CRM_OPPORTUNITY_STATUSES)
  status!: CrmOpportunityStatus;

  @ApiProperty({ description: '우선순위', enum: CRM_OPPORTUNITY_PRIORITIES })
  @IsString()
  @IsIn(CRM_OPPORTUNITY_PRIORITIES)
  priority!: CrmOpportunityPriority;

  @ApiPropertyOptional({ description: '수금조건 코드', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  paymentTermCode?: string;

  @ApiPropertyOptional({ description: '특별할인 유형', enum: CRM_OPPORTUNITY_DISCOUNT_TYPES, default: 'amount' })
  @IsString()
  @IsIn(CRM_OPPORTUNITY_DISCOUNT_TYPES)
  @IsOptional()
  specialDiscountType?: CrmOpportunityDiscountType;

  @ApiPropertyOptional({ description: '특별할인 값' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  specialDiscountValue?: number;

  @ApiPropertyOptional({ description: '예상 시작일(YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  expectedStartDate?: string;

  @ApiPropertyOptional({ description: '예상 종료일(YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  expectedEndDate?: string;

  @ApiPropertyOptional({ description: '견적 수신 고객 담당자명', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  clientContactName?: string;

  @ApiProperty({ description: '다음 행동', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  nextAction!: string;

  @ApiProperty({ description: '매출 라인', type: [CrmOpportunityUpsertLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrmOpportunityUpsertLineDto)
  revenueLines!: CrmOpportunityUpsertLineDto[];

  @ApiProperty({ description: '원가 라인', type: [CrmOpportunityUpsertLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrmOpportunityUpsertLineDto)
  costLines!: CrmOpportunityUpsertLineDto[];
}

export class CrmOpportunityContractConversionDto implements CrmOpportunityContractConversionRequest {
  @ApiPropertyOptional({ description: '계약 시작일(YYYY-MM-DD). 미입력 시 영업기회 예상 시작일을 사용합니다.' })
  @IsString()
  @IsOptional()
  contractStartDate?: string;

  @ApiPropertyOptional({ description: '계약 종료일(YYYY-MM-DD). 미입력 시 영업기회 예상 종료일을 사용합니다.' })
  @IsString()
  @IsOptional()
  contractEndDate?: string;

  @ApiPropertyOptional({ description: '계약 WBS 코드', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  wbsCode?: string;

  @ApiPropertyOptional({ description: '계약 전환 후 다음 행동', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  nextAction?: string;
}

export class CrmOpportunityContractDocumentDraftDto implements CrmOpportunityContractDocumentDraftRequest {
  @ApiPropertyOptional({ description: '선택한 DMS 영업기회 계약서 DOCX 템플릿 key', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  templateKey?: string;

  @ApiPropertyOptional({ description: '원천 22개 변수 DMS 초안 저장 메모', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  memo?: string;
}

export class CrmOpportunityContractDocumentLifecycleExecutionDto implements CrmOpportunityContractDocumentLifecycleExecutionRequest {
  @ApiPropertyOptional({ description: 'DMS 영업기회 계약서 DOCX 산출 실행 메모', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  memo?: string;
}

export class CrmOpportunityQuoteWorkflowDto implements CrmQuoteWorkflowUpdateRequest {
  @ApiProperty({ description: '견적 업무 상태', enum: CRM_QUOTE_WORKFLOW_STATUSES })
  @IsString()
  @IsIn(CRM_QUOTE_WORKFLOW_STATUSES)
  status!: CrmQuoteWorkflowStatus;

  @ApiPropertyOptional({ description: '견적 수신 고객 담당자명', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  clientContactName?: string;

  @ApiPropertyOptional({ description: '견적 상태 메모', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  quoteMemo?: string;

  @ApiPropertyOptional({ description: '견적 발행 기준일(YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  issuedAt?: string;

  @ApiPropertyOptional({ description: '견적 유효기한(YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  validUntil?: string;
}

export class CrmQuoteDmsDocumentDraftDto implements CrmQuoteDmsDocumentDraftRequest {
  @ApiPropertyOptional({ description: '선택한 DMS 견적 DOCX 템플릿 key', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  templateKey?: string;

  @ApiPropertyOptional({ description: '견적 DMS markdown 초안 저장 메모', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  memo?: string;
}

export class CrmQuoteDmsDocumentExecutionEvidenceStepDto implements CrmQuoteDmsDocumentExecutionEvidenceStep {
  @ApiProperty({ description: 'DMS 견적 lifecycle 단계', enum: CRM_QUOTE_DMS_EXECUTION_STEP_KEYS })
  @IsString()
  @IsIn(CRM_QUOTE_DMS_EXECUTION_STEP_KEYS)
  key!: CrmQuoteDmsDocumentExecutionStepKey;

  @ApiProperty({ description: 'DMS 산출 evidence 경로', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  evidencePath!: string;

  @ApiPropertyOptional({ description: 'DMS 산출 evidence 라벨', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  evidenceLabel?: string;

  @ApiPropertyOptional({ description: 'DMS 산출 evidence 메모', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  note?: string;
}

export class CrmQuoteDmsDocumentExecutionEvidenceDto implements CrmQuoteDmsDocumentExecutionEvidenceRequest {
  @ApiProperty({ description: 'DMS 견적 lifecycle execution evidence', type: [CrmQuoteDmsDocumentExecutionEvidenceStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrmQuoteDmsDocumentExecutionEvidenceStepDto)
  steps!: CrmQuoteDmsDocumentExecutionEvidenceStepDto[];

  @ApiPropertyOptional({ description: 'DMS 견적 execution evidence 기록 메모', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  memo?: string;
}

export class CrmQuoteDmsDocumentLifecycleExecutionDto implements CrmQuoteDmsDocumentLifecycleExecutionRequest {
  @ApiPropertyOptional({ description: 'DMS 견적 lifecycle artifact 실행 메모', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  memo?: string;
}
