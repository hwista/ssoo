import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsDateString } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: '자기소개', maxLength: 2000 })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ description: '커버 이미지 URL', maxLength: 1000 })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  coverImageUrl?: string;

  @ApiPropertyOptional({ description: 'LinkedIn URL', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  linkedinUrl?: string;

  @ApiPropertyOptional({ description: '웹사이트 URL', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  websiteUrl?: string;
}

export class CreateCareerDto {
  @ApiProperty({ description: '프로젝트명', maxLength: 300 })
  @IsString()
  @MaxLength(300)
  projectName!: string;

  @ApiProperty({ description: '역할명', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  roleName!: string;

  @ApiProperty({ description: '시작일 (ISO 8601)' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ description: '종료일 (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: '설명', maxLength: 2000 })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: '회사명', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  companyName?: string;
}

export class ProfileDto {
  @ApiProperty({ description: '프로필 ID' })
  id!: string;

  @ApiProperty({ description: '사용자 ID' })
  userId!: string;

  @ApiPropertyOptional({ description: '자기소개' })
  bio?: string;

  @ApiPropertyOptional({ description: '커버 이미지 URL' })
  coverImageUrl?: string;

  @ApiPropertyOptional({ description: 'LinkedIn URL' })
  linkedinUrl?: string;

  @ApiPropertyOptional({ description: '웹사이트 URL' })
  websiteUrl?: string;

  @ApiProperty({ description: '생성일시' })
  createdAt!: string;

  @ApiProperty({ description: '수정일시' })
  updatedAt!: string;
}
