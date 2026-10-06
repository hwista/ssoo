import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsBoolean, MaxLength } from 'class-validator';

export class CreateCodeDto {
  @ApiProperty({ description: '코드 그룹' })
  @IsString()
  @MaxLength(100)
  codeGroup!: string;

  @ApiProperty({ description: '코드 값' })
  @IsString()
  @MaxLength(100)
  codeValue!: string;

  @ApiPropertyOptional({ description: '상위 코드' })
  @IsString()
  @IsOptional()
  parentCode?: string;

  @ApiProperty({ description: '한국어 표시명' })
  @IsString()
  displayNameKo!: string;

  @ApiPropertyOptional({ description: '영어 표시명' })
  @IsString()
  @IsOptional()
  displayNameEn?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class UpdateCodeDto {
  @ApiPropertyOptional({ description: '코드 그룹' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  codeGroup?: string;

  @ApiPropertyOptional({ description: '코드 값' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  codeValue?: string;

  @ApiPropertyOptional({ description: '상위 코드' })
  @IsString()
  @IsOptional()
  parentCode?: string;

  @ApiPropertyOptional({ description: '한국어 표시명' })
  @IsString()
  @IsOptional()
  displayNameKo?: string;

  @ApiPropertyOptional({ description: '영어 표시명' })
  @IsString()
  @IsOptional()
  displayNameEn?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성 상태' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
