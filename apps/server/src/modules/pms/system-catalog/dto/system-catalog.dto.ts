import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, IsInt } from 'class-validator';

export class CreateSystemCatalogDto {
  @ApiProperty({ description: '카탈로그 코드', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  catalogCode!: string;

  @ApiProperty({ description: '카탈로그명', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  catalogName!: string;

  @ApiPropertyOptional({ description: '설명', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: '부모 카탈로그 코드', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  parentCode?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  memo?: string;
}

export class UpdateSystemCatalogDto {
  @ApiPropertyOptional({ description: '카탈로그명', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  catalogName?: string;

  @ApiPropertyOptional({ description: '설명', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: '부모 카탈로그 코드', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  parentCode?: string;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성 여부' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  memo?: string;
}

export class FindSystemCatalogsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: '검색어 (코드, 카탈로그명)' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: '부모 카탈로그 코드', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  parentCode?: string;
}

export class SystemCatalogDto {
  @ApiProperty({ description: '카탈로그 ID' })
  id!: string;

  @ApiProperty({ description: '카탈로그 코드' })
  catalogCode!: string;

  @ApiProperty({ description: '카탈로그명' })
  catalogName!: string;

  @ApiPropertyOptional({ description: '설명' })
  description?: string;

  @ApiPropertyOptional({ description: '부모 카탈로그 코드' })
  parentCode?: string;

  @ApiProperty({ description: '정렬 순서' })
  sortOrder!: number;

  @ApiProperty({ description: '활성 여부' })
  isActive!: boolean;

  @ApiPropertyOptional({ description: '메모' })
  memo?: string;

  @ApiProperty({ description: '생성일시' })
  createdAt!: string;

  @ApiProperty({ description: '수정일시' })
  updatedAt!: string;
}
