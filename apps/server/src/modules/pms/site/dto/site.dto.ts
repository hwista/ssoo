import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, IsInt } from 'class-validator';

export class CreateSiteDto {
  @ApiProperty({ description: '사이트 코드', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  siteCode!: string;

  @ApiProperty({ description: '사이트명', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  siteName!: string;

  @ApiPropertyOptional({ description: '사이트 유형', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  siteType?: string;

  @ApiProperty({ description: '고객사 ID' })
  @IsString()
  customerId!: string;

  @ApiPropertyOptional({ description: '부모 사이트 코드', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  parentCode?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '주소', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: '지역', maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional({ description: '현장 담당자', maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  contactPerson?: string;

  @ApiPropertyOptional({ description: '담당자 연락처', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  contactPhone?: string;

  @ApiPropertyOptional({ description: '설명', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  memo?: string;
}

export class UpdateSiteDto {
  @ApiPropertyOptional({ description: '사이트명', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  siteName?: string;

  @ApiPropertyOptional({ description: '사이트 유형', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  siteType?: string;

  @ApiPropertyOptional({ description: '부모 사이트 코드', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  parentCode?: string;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '주소', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: '지역', maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional({ description: '현장 담당자', maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  contactPerson?: string;

  @ApiPropertyOptional({ description: '담당자 연락처', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  contactPhone?: string;

  @ApiPropertyOptional({ description: '설명', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: '활성 여부' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  memo?: string;
}

export class FindSitesDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: '검색어 (사이트명, 코드)' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: '고객사 ID' })
  @IsString()
  @IsOptional()
  customerId?: string;
}

export class SiteDto {
  @ApiProperty({ description: '사이트 ID' })
  id!: string;

  @ApiProperty({ description: '사이트 코드' })
  siteCode!: string;

  @ApiProperty({ description: '사이트명' })
  siteName!: string;

  @ApiPropertyOptional({ description: '사이트 유형' })
  siteType?: string;

  @ApiProperty({ description: '고객사 ID' })
  customerId!: string;

  @ApiPropertyOptional({ description: '부모 사이트 코드' })
  parentCode?: string;

  @ApiProperty({ description: '정렬 순서' })
  sortOrder!: number;

  @ApiPropertyOptional({ description: '주소' })
  address?: string;

  @ApiPropertyOptional({ description: '지역' })
  region?: string;

  @ApiPropertyOptional({ description: '현장 담당자' })
  contactPerson?: string;

  @ApiPropertyOptional({ description: '담당자 연락처' })
  contactPhone?: string;

  @ApiPropertyOptional({ description: '설명' })
  description?: string;

  @ApiProperty({ description: '활성 여부' })
  isActive!: boolean;

  @ApiPropertyOptional({ description: '메모' })
  memo?: string;

  @ApiProperty({ description: '생성일시' })
  createdAt!: string;

  @ApiProperty({ description: '수정일시' })
  updatedAt!: string;
}
