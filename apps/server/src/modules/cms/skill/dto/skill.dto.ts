import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, IsArray, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSkillDto {
  @ApiProperty({ description: '스킬명', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  skillName!: string;

  @ApiProperty({ description: '스킬 카테고리', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  skillCategory!: string;

  @ApiPropertyOptional({ description: '상위 스킬 ID' })
  @IsString()
  @IsOptional()
  parentSkillId?: string;

  @ApiPropertyOptional({ description: '설명', maxLength: 1000 })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: '동의어 목록', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  synonyms?: string[];
}

export class AddUserSkillDto {
  @ApiProperty({ description: '스킬 ID' })
  @IsString()
  skillId!: string;

  @ApiPropertyOptional({ description: '숙련도 (1~5)', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  proficiencyLevel?: number;

  @ApiPropertyOptional({ description: '경력 연수', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  yearsOfExperience?: number;
}

export class EndorseSkillDto {
  @ApiProperty({ description: '추천 대상 프로필의 사용자 스킬 ID' })
  @IsString()
  userSkillId!: string;

  @ApiPropertyOptional({ description: '추천 코멘트', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  comment?: string;
}

export class SearchExpertsDto {
  @ApiPropertyOptional({ description: '스킬 ID 목록', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skillIds?: string[];

  @ApiPropertyOptional({ description: '검색 키워드' })
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '페이지 크기', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number;
}

export class SkillDto {
  @ApiProperty({ description: '스킬 ID' })
  id!: string;

  @ApiProperty({ description: '스킬명' })
  skillName!: string;

  @ApiProperty({ description: '스킬 카테고리' })
  skillCategory!: string;

  @ApiPropertyOptional({ description: '설명' })
  description?: string;

  @ApiProperty({ description: '생성일시' })
  createdAt!: string;
}
