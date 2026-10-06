import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import type {
  CrmReportsConfirmRequest,
  CrmReportsPreviewQuery,
  CrmReportsPreviewRegion,
} from '@ssoo/types/crm';

const CRM_REPORTS_PREVIEW_REGIONS = ['all', 'domestic', 'overseas', 'unspecified'] as const;

export class CrmReportsPreviewQueryDto implements CrmReportsPreviewQuery {
  @ApiPropertyOptional({ description: '보고 업무 조직 ID', maxLength: 19 })
  @IsString()
  @MaxLength(19)
  @IsOptional()
  ownerOrganizationId?: string;

  @ApiPropertyOptional({ description: '조회 사업년도', example: 2026, minimum: 2000, maximum: 2100 })
  @Type(() => Number)
  @IsNumber()
  @Min(2000)
  @Max(2100)
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({ description: '사업구분 필터', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  businessType?: string;

  @ApiPropertyOptional({ description: '계열/산업 필터', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  industryLine?: string;

  @ApiPropertyOptional({ description: '국내/해외 필터', enum: CRM_REPORTS_PREVIEW_REGIONS, default: 'all' })
  @IsString()
  @IsIn(CRM_REPORTS_PREVIEW_REGIONS)
  @IsOptional()
  region?: CrmReportsPreviewRegion;

  @ApiPropertyOptional({ description: '고객/건명/담당자/WBS 검색어', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  search?: string;
}

export class CrmReportsConfirmDto extends CrmReportsPreviewQueryDto implements CrmReportsConfirmRequest {
  @ApiPropertyOptional({ description: '보고 확정 메모', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  memo?: string;
}
