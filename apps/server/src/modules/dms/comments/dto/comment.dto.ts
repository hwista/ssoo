import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type {
  CreateDmsDocumentCommentPayload,
  MutateDmsDocumentCommentPayload,
} from '@ssoo/types/dms';

export class CreateCommentDto implements CreateDmsDocumentCommentPayload {
  @ApiProperty({ description: '댓글을 작성할 문서 경로' })
  @IsString()
  @MinLength(1)
  path!: string;

  @ApiProperty({ description: '댓글 내용', maxLength: 4000 })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;

  @ApiPropertyOptional({ description: '답글 대상 댓글 ID' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  parentId?: string;
}

export class MutateCommentDto implements MutateDmsDocumentCommentPayload {
  @ApiProperty({ description: '댓글이 속한 문서 경로' })
  @IsString()
  @MinLength(1)
  path!: string;
}
