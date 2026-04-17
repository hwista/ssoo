import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: '댓글 내용' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: '상위 댓글 ID (대댓글)' })
  @IsString()
  @IsOptional()
  parentCommentId?: string;
}

export class UpdateCommentDto {
  @ApiPropertyOptional({ description: '댓글 내용' })
  @IsString()
  @IsOptional()
  content?: string;
}

export class CommentDto {
  @ApiProperty({ description: '댓글 ID' })
  id!: string;

  @ApiProperty({ description: '게시물 ID' })
  postId!: string;

  @ApiProperty({ description: '작성자 사용자 ID' })
  authorUserId!: string;

  @ApiPropertyOptional({ description: '상위 댓글 ID' })
  parentCommentId?: string;

  @ApiProperty({ description: '댓글 내용' })
  content!: string;

  @ApiProperty({ description: '댓글 깊이' })
  depth!: number;

  @ApiProperty({ description: '생성일시' })
  createdAt!: string;

  @ApiProperty({ description: '수정일시' })
  updatedAt!: string;
}
