import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import type {
  AskContextMode,
  AskMessageInput,
  AskTemplateInput,
} from '@ssoo/types/dms';

export const ASK_CONTEXT_MODES = ['doc', 'deep', 'attachments-only'] as const;

export class AskDocumentsDto {
  @ApiPropertyOptional({ description: '질문 텍스트' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: '대화 메시지 목록' })
  @IsOptional()
  @IsArray()
  messages?: AskMessageInput[];

  @ApiPropertyOptional({
    description: '질문 컨텍스트 모드',
    enum: ASK_CONTEXT_MODES,
    default: 'doc',
  })
  @IsOptional()
  @IsIn(ASK_CONTEXT_MODES)
  contextMode?: AskContextMode;

  @ApiPropertyOptional({ description: '현재 활성 문서 경로' })
  @IsOptional()
  @IsString()
  activeDocPath?: string;

  @ApiPropertyOptional({ description: '질문 시 함께 참고할 템플릿 목록' })
  @IsOptional()
  @IsArray()
  templates?: AskTemplateInput[];

  @ApiPropertyOptional({ description: '스트리밍 응답 여부', default: true })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;
}
