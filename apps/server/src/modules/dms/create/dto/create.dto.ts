import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import type { CreateSummaryTemplateType } from '@ssoo/types/dms';

export const CREATE_SUMMARY_TEMPLATE_TYPES = [
  'default',
  'doc',
  'sheet',
  'slide',
  'pdf',
] as const;

export class CreateSummaryDto {
  @ApiProperty({ description: '요약할 텍스트' })
  @IsString()
  @MinLength(10)
  text!: string;

  @ApiPropertyOptional({
    description: '요약 템플릿 유형',
    enum: CREATE_SUMMARY_TEMPLATE_TYPES,
    default: 'default',
  })
  @IsOptional()
  @IsIn(CREATE_SUMMARY_TEMPLATE_TYPES)
  templateType?: CreateSummaryTemplateType;
}
