import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSystemInstanceDto {
  @ApiProperty({ description: '인스턴스 코드', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  instanceCode!: string;

  @ApiProperty({ description: '인스턴스명', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  instanceName!: string;

  @ApiProperty({ description: '시스템 카탈로그 ID' })
  @IsString()
  systemCatalogId!: string;

  @ApiProperty({ description: '고객사 ID' })
  @IsString()
  customerId!: string;

  @ApiProperty({ description: '사이트 ID' })
  @IsString()
  siteId!: string;

  @ApiPropertyOptional({ description: '부모 인스턴스 코드', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  parentCode?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '운영 주체 유형', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  operatorType?: string;

  @ApiPropertyOptional({ description: '운영 담당자 사용자 ID' })
  @IsString()
  @IsOptional()
  operatorUserId?: string;

  @ApiPropertyOptional({ description: '버전', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  version?: string;

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

export class UpdateSystemInstanceDto {
  @ApiPropertyOptional({ description: '인스턴스명', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  instanceName?: string;

  @ApiPropertyOptional({ description: '시스템 카탈로그 ID' })
  @IsString()
  @IsOptional()
  systemCatalogId?: string;

  @ApiPropertyOptional({ description: '사이트 ID' })
  @IsString()
  @IsOptional()
  siteId?: string;

  @ApiPropertyOptional({ description: '부모 인스턴스 코드', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  parentCode?: string;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '운영 주체 유형', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  operatorType?: string;

  @ApiPropertyOptional({ description: '운영 담당자 사용자 ID' })
  @IsString()
  @IsOptional()
  operatorUserId?: string;

  @ApiPropertyOptional({ description: '버전', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  version?: string;

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

export class FindSystemInstancesDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: '검색어 (인스턴스명, 코드)' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: '고객사 ID' })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: '사이트 ID' })
  @IsString()
  @IsOptional()
  siteId?: string;

  @ApiPropertyOptional({ description: '시스템 카탈로그 ID' })
  @IsString()
  @IsOptional()
  systemCatalogId?: string;

  @ApiPropertyOptional({ description: '운영 주체 유형' })
  @IsString()
  @IsOptional()
  operatorType?: string;
}

export class SystemInstanceDto {
  @ApiProperty({ description: '시스템 인스턴스 ID' })
  id!: string;

  @ApiProperty({ description: '인스턴스 코드' })
  instanceCode!: string;

  @ApiProperty({ description: '인스턴스명' })
  instanceName!: string;

  @ApiProperty({ description: '시스템 카탈로그 ID' })
  systemCatalogId!: string;

  @ApiProperty({ description: '고객사 ID' })
  customerId!: string;

  @ApiProperty({ description: '사이트 ID' })
  siteId!: string;

  @ApiPropertyOptional({ description: '부모 인스턴스 코드' })
  parentCode?: string;

  @ApiProperty({ description: '정렬 순서' })
  sortOrder!: number;

  @ApiPropertyOptional({ description: '운영 주체 유형' })
  operatorType?: string;

  @ApiPropertyOptional({ description: '운영 담당자 사용자 ID' })
  operatorUserId?: string;

  @ApiPropertyOptional({ description: '버전' })
  version?: string;

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
