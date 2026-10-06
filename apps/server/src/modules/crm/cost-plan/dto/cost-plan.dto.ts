import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import type {
  CrmCostPlanAccountingPaymentExecutionEvidenceRequest,
  CrmCostPlanAccountingPaymentExecutionEvidenceStep,
  CrmCostPlanAccountingPaymentExecutionMode,
  CrmCostPlanAccountingPaymentExecutionRequest,
  CrmCostPlanAccountingPaymentExecutionStepKey,
  CrmCostPlanAccountingPaymentHandoffRequest,
  CrmCostPlanAmsExternalMonthlyInputRequest,
  CrmCostPlanAmsVendorWbsMappingRequest,
  CrmCostPlanAmsSourceExternalCostRequest,
  CrmCostPlanAmsSourceExternalCostRowInput,
  CrmCostPlanAmsSourceVendorCreateRequest,
  CrmCostPlanAmsSourceVendorWbsRequest,
  CrmCostPlanInternalMonthlyInputRequest,
  CrmCostPlanInternalSourceGridRequest,
  CrmCostPlanInternalSourceItemCode,
  CrmCostPlanInternalSourceItemInput,
  CrmCostPlanPreviewQuery,
  CrmCostPlanPreviewRegion,
} from '@ssoo/types/crm';

const CRM_COST_PLAN_PREVIEW_REGIONS = ['all', 'domestic', 'overseas', 'unspecified'] as const;
const CRM_COST_PLAN_INTERNAL_SOURCE_ITEM_CODES = ['labor', 'other', 'dept_adj', 'svc', 'dept_common'] as const;
const CRM_COST_PLAN_ACCOUNTING_PAYMENT_EXECUTION_STEP_KEYS = [
  'accounting-voucher',
  'payment-request',
  'payment-execution',
  'external-system-sync',
] as const satisfies readonly CrmCostPlanAccountingPaymentExecutionStepKey[];

export class CrmCostPlanPreviewQueryDto implements CrmCostPlanPreviewQuery {
  @ApiPropertyOptional({ description: '업무 조직 ID', maxLength: 19 })
  @IsString()
  @MaxLength(19)
  @IsOptional()
  ownerOrganizationId?: string;

  @ApiPropertyOptional({ description: '사업년도', default: new Date().getFullYear() })
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
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

  @ApiPropertyOptional({ description: '국내/해외', enum: CRM_COST_PLAN_PREVIEW_REGIONS, default: 'all' })
  @IsString()
  @IsIn(CRM_COST_PLAN_PREVIEW_REGIONS)
  @IsOptional()
  region?: CrmCostPlanPreviewRegion;

  @ApiPropertyOptional({ description: '고객/건명/담당자/WBS 검색어', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  search?: string;
}

export class CrmCostPlanAccountingPaymentHandoffDto
  extends CrmCostPlanPreviewQueryDto
  implements CrmCostPlanAccountingPaymentHandoffRequest {
  @ApiPropertyOptional({ description: '회계·지급 handoff snapshot 메모', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  memo?: string;
}

export class CrmCostPlanAccountingPaymentExecutionEvidenceStepDto
  implements CrmCostPlanAccountingPaymentExecutionEvidenceStep {
  @ApiProperty({ description: '외부 회계·지급 실행 evidence 단계', enum: CRM_COST_PLAN_ACCOUNTING_PAYMENT_EXECUTION_STEP_KEYS })
  @IsString()
  @IsIn(CRM_COST_PLAN_ACCOUNTING_PAYMENT_EXECUTION_STEP_KEYS)
  key!: CrmCostPlanAccountingPaymentExecutionStepKey;

  @ApiProperty({ description: '외부 회계·지급 시스템 산출물 경로 또는 참조 키', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  evidencePath!: string;

  @ApiPropertyOptional({ description: 'evidence 표시명', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  evidenceLabel?: string;

  @ApiPropertyOptional({ description: 'evidence 메모', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  note?: string;
}

export class CrmCostPlanAccountingPaymentExecutionEvidenceDto
  implements CrmCostPlanAccountingPaymentExecutionEvidenceRequest {
  @ApiProperty({ description: '외부 회계·지급 시스템에서 완료한 실행 evidence 목록', type: [CrmCostPlanAccountingPaymentExecutionEvidenceStepDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CrmCostPlanAccountingPaymentExecutionEvidenceStepDto)
  steps!: CrmCostPlanAccountingPaymentExecutionEvidenceStepDto[];

  @ApiPropertyOptional({ description: '회계·지급 실행 evidence 수신 메모', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  memo?: string;
}

export class CrmCostPlanAccountingPaymentExecutionDto
  implements CrmCostPlanAccountingPaymentExecutionRequest {
  @ApiPropertyOptional({ description: '회계·지급 실행 모드. 기본값은 CRM demo evidence 생성이며, external-api는 provider 환경 설정 시 외부 ERP/API로 전송한다.', enum: ['demo', 'external-api'], default: 'demo' })
  @IsString()
  @IsIn(['demo', 'external-api'])
  @IsOptional()
  mode?: CrmCostPlanAccountingPaymentExecutionMode;

  @ApiPropertyOptional({ description: '회계·지급 실행 메모', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  memo?: string;
}

export class CrmCostPlanInternalMonthlyInputDto implements CrmCostPlanInternalMonthlyInputRequest {
  @ApiPropertyOptional({ description: '업무 조직 ID', maxLength: 19 })
  @IsString()
  @MaxLength(19)
  @IsOptional()
  ownerOrganizationId?: string;

  @ApiProperty({ description: '입력 대상 사업년도', minimum: 2000 })
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  targetYear!: number;

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

  @ApiProperty({ description: '국내/해외', enum: ['domestic', 'overseas', 'unspecified'] })
  @IsString()
  @IsIn(['domestic', 'overseas', 'unspecified'])
  region!: Exclude<CrmCostPlanPreviewRegion, 'all'>;

  @ApiPropertyOptional({ description: 'WBS 코드', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  wbsCode?: string;

  @ApiProperty({ description: '12개월 내부원가 계획 입력 금액', type: [Number], minItems: 12, maxItems: 12 })
  @IsArray()
  @ArrayMinSize(12)
  @ArrayMaxSize(12)
  @Type(() => Number)
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  monthlyPlanAmounts!: number[];

  @ApiProperty({ description: '12개월 내부원가 실적 입력 금액', type: [Number], minItems: 12, maxItems: 12 })
  @IsArray()
  @ArrayMinSize(12)
  @ArrayMaxSize(12)
  @Type(() => Number)
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  monthlyActualAmounts!: number[];

  @ApiPropertyOptional({ description: '메모', maxLength: 300 })
  @IsString()
  @MaxLength(300)
  @IsOptional()
  memo?: string;
}

export class CrmCostPlanInternalSourceItemInputDto implements CrmCostPlanInternalSourceItemInput {
  @ApiProperty({ description: '원본 내부원가 고정 항목 코드', enum: CRM_COST_PLAN_INTERNAL_SOURCE_ITEM_CODES })
  @IsString()
  @IsIn(CRM_COST_PLAN_INTERNAL_SOURCE_ITEM_CODES)
  itemCode!: CrmCostPlanInternalSourceItemCode;

  @ApiProperty({ description: '12개월 내부원가 항목 계획 금액(음수 허용)', type: [Number], minItems: 12, maxItems: 12 })
  @IsArray()
  @ArrayMinSize(12)
  @ArrayMaxSize(12)
  @Type(() => Number)
  @IsNumber({}, { each: true })
  monthlyPlanAmounts!: number[];

  @ApiProperty({ description: '12개월 내부원가 항목 실적 금액(음수 허용)', type: [Number], minItems: 12, maxItems: 12 })
  @IsArray()
  @ArrayMinSize(12)
  @ArrayMaxSize(12)
  @Type(() => Number)
  @IsNumber({}, { each: true })
  monthlyActualAmounts!: number[];
}

export class CrmCostPlanInternalSourceGridDto implements CrmCostPlanInternalSourceGridRequest {
  @ApiPropertyOptional({ description: '업무 조직 ID', maxLength: 19 })
  @IsString()
  @MaxLength(19)
  @IsOptional()
  ownerOrganizationId?: string;

  @ApiProperty({ description: '입력 대상 사업년도', minimum: 2000 })
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  targetYear!: number;

  @ApiProperty({ description: '원본 고정 순서의 내부원가 5개 항목', type: [CrmCostPlanInternalSourceItemInputDto], minItems: 5, maxItems: 5 })
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => CrmCostPlanInternalSourceItemInputDto)
  items!: CrmCostPlanInternalSourceItemInputDto[];
}

export class CrmCostPlanAmsSourceVendorCreateDto implements CrmCostPlanAmsSourceVendorCreateRequest {
  @ApiPropertyOptional({ description: '업무 조직 ID', maxLength: 19 })
  @IsString()
  @MaxLength(19)
  @IsOptional()
  ownerOrganizationId?: string;

  @ApiProperty({ description: '공급업체 대상 사업년도', minimum: 2000 })
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  targetYear!: number;

  @ApiProperty({ description: '공급업체명', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  vendorName!: string;
}

export class CrmCostPlanAmsSourceVendorWbsDto implements CrmCostPlanAmsSourceVendorWbsRequest {
  @ApiPropertyOptional({ description: '업무 조직 ID', maxLength: 19 })
  @IsString()
  @MaxLength(19)
  @IsOptional()
  ownerOrganizationId?: string;

  @ApiProperty({ description: '공급업체 대상 사업년도', minimum: 2000 })
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  targetYear!: number;

  @ApiProperty({ description: '확정 AMS 계약 WBS 코드 목록', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  wbsCodes!: string[];
}

export class CrmCostPlanAmsSourceExternalCostRowDto implements CrmCostPlanAmsSourceExternalCostRowInput {
  @ApiProperty({ description: 'AMS 공급업체 ID' })
  @IsString()
  vendorId!: string;

  @ApiProperty({ description: 'WBS 코드', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  wbsCode!: string;

  @ApiProperty({ description: '12개월 계획 금액(음수 허용)', type: [Number], minItems: 12, maxItems: 12 })
  @IsArray()
  @ArrayMinSize(12)
  @ArrayMaxSize(12)
  @Type(() => Number)
  @IsNumber({}, { each: true })
  monthlyPlanAmounts!: number[];

  @ApiProperty({ description: '12개월 실적 금액(음수 허용)', type: [Number], minItems: 12, maxItems: 12 })
  @IsArray()
  @ArrayMinSize(12)
  @ArrayMaxSize(12)
  @Type(() => Number)
  @IsNumber({}, { each: true })
  monthlyActualAmounts!: number[];
}

export class CrmCostPlanAmsSourceExternalCostDto implements CrmCostPlanAmsSourceExternalCostRequest {
  @ApiPropertyOptional({ description: '업무 조직 ID', maxLength: 19 })
  @IsString()
  @MaxLength(19)
  @IsOptional()
  ownerOrganizationId?: string;

  @ApiProperty({ description: '외부원가 대상 사업년도', minimum: 2000 })
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  targetYear!: number;

  @ApiProperty({ description: '현재 업체-WBS 매핑 전체의 외부원가 행', type: [CrmCostPlanAmsSourceExternalCostRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrmCostPlanAmsSourceExternalCostRowDto)
  rows!: CrmCostPlanAmsSourceExternalCostRowDto[];
}

export class CrmCostPlanAmsVendorWbsMappingDto implements CrmCostPlanAmsVendorWbsMappingRequest {
  @ApiPropertyOptional({ description: '업무 조직 ID', maxLength: 19 })
  @IsString()
  @MaxLength(19)
  @IsOptional()
  ownerOrganizationId?: string;

  @ApiProperty({ description: '매핑 대상 사업년도', minimum: 2000 })
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  targetYear!: number;

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

  @ApiProperty({ description: '국내/해외', enum: ['domestic', 'overseas', 'unspecified'] })
  @IsString()
  @IsIn(['domestic', 'overseas', 'unspecified'])
  region!: Exclude<CrmCostPlanPreviewRegion, 'all'>;

  @ApiProperty({ description: 'WBS 코드', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  wbsCode!: string;

  @ApiProperty({ description: 'AMS 업체명', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  vendorName!: string;

  @ApiPropertyOptional({ description: '업체 계약/발주 번호', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  vendorContractNo?: string;

  @ApiPropertyOptional({ description: '메모', maxLength: 300 })
  @IsString()
  @MaxLength(300)
  @IsOptional()
  memo?: string;
}

export class CrmCostPlanAmsExternalMonthlyInputDto implements CrmCostPlanAmsExternalMonthlyInputRequest {
  @ApiPropertyOptional({ description: '업무 조직 ID', maxLength: 19 })
  @IsString()
  @MaxLength(19)
  @IsOptional()
  ownerOrganizationId?: string;

  @ApiProperty({ description: '입력 대상 사업년도', minimum: 2000 })
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  targetYear!: number;

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

  @ApiProperty({ description: '국내/해외', enum: ['domestic', 'overseas', 'unspecified'] })
  @IsString()
  @IsIn(['domestic', 'overseas', 'unspecified'])
  region!: Exclude<CrmCostPlanPreviewRegion, 'all'>;

  @ApiProperty({ description: 'WBS 코드', maxLength: 80 })
  @IsString()
  @MaxLength(80)
  wbsCode!: string;

  @ApiProperty({ description: 'AMS 업체명', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  vendorName!: string;

  @ApiPropertyOptional({ description: '업체 계약/발주 번호', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  vendorContractNo?: string;

  @ApiProperty({ description: '12개월 AMS 외부원가 계획 입력 금액', type: [Number], minItems: 12, maxItems: 12 })
  @IsArray()
  @ArrayMinSize(12)
  @ArrayMaxSize(12)
  @Type(() => Number)
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  monthlyPlanAmounts!: number[];

  @ApiProperty({ description: '12개월 AMS 외부원가 실적 입력 금액', type: [Number], minItems: 12, maxItems: 12 })
  @IsArray()
  @ArrayMinSize(12)
  @ArrayMaxSize(12)
  @Type(() => Number)
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  monthlyActualAmounts!: number[];

  @ApiPropertyOptional({ description: '메모', maxLength: 300 })
  @IsString()
  @MaxLength(300)
  @IsOptional()
  memo?: string;
}
