import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, IsArray, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

const CMS_VISIBILITY_SCOPE_CODES = ['public', 'organization', 'followers', 'self'] as const;

export class CreatePostDto {
  @ApiPropertyOptional({ description: '게시물 제목' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: '게시물 내용' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: '콘텐츠 유형 (text, markdown, html)', default: 'text' })
  @IsString()
  @IsOptional()
  contentType?: string;

  @ApiPropertyOptional({ description: '게시판 ID' })
  @IsString()
  @IsOptional()
  boardId?: string;

  @ApiPropertyOptional({ description: '카테고리 ID' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: '게시물 공개 범위',
    enum: CMS_VISIBILITY_SCOPE_CODES,
    default: 'public',
  })
  @IsString()
  @IsIn(CMS_VISIBILITY_SCOPE_CODES)
  @IsOptional()
  visibilityScopeCode?: string;

  @ApiPropertyOptional({ description: '태그 이름 목록', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagNames?: string[];
}

export class UpdatePostDto {
  @ApiPropertyOptional({ description: '게시물 제목' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: '게시물 내용' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: '콘텐츠 유형' })
  @IsString()
  @IsOptional()
  contentType?: string;

  @ApiPropertyOptional({ description: '게시판 ID' })
  @IsString()
  @IsOptional()
  boardId?: string;

  @ApiPropertyOptional({ description: '카테고리 ID' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: '게시물 공개 범위',
    enum: CMS_VISIBILITY_SCOPE_CODES,
  })
  @IsString()
  @IsIn(CMS_VISIBILITY_SCOPE_CODES)
  @IsOptional()
  visibilityScopeCode?: string;

  @ApiPropertyOptional({ description: '태그 이름 목록', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagNames?: string[];
}

export class FindPostsDto {
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

  @ApiPropertyOptional({ description: '게시판 ID 필터' })
  @IsString()
  @IsOptional()
  boardId?: string;

  @ApiPropertyOptional({ description: '작성자 사용자 ID 필터' })
  @IsString()
  @IsOptional()
  authorUserId?: string;

  @ApiPropertyOptional({ description: '검색어 (제목, 내용)' })
  @IsString()
  @IsOptional()
  search?: string;
}

export class PostDto {
  @ApiProperty({ description: '게시물 ID' })
  id!: string;

  @ApiProperty({ description: '작성자 사용자 ID' })
  authorUserId!: string;

  @ApiPropertyOptional({ description: '게시판 ID' })
  boardId?: string;

  @ApiPropertyOptional({ description: '카테고리 ID' })
  categoryId?: string;

  @ApiPropertyOptional({ description: '게시물 제목' })
  title?: string;

  @ApiProperty({ description: '게시물 내용' })
  content!: string;

  @ApiProperty({ description: '콘텐츠 유형' })
  contentType!: string;

  @ApiProperty({ description: '게시물 공개 범위', enum: CMS_VISIBILITY_SCOPE_CODES })
  visibilityScopeCode!: string;

  @ApiPropertyOptional({ description: '대상 조직 ID' })
  targetOrgId?: string | null;

  @ApiProperty({ description: '조회 수' })
  viewCount!: number;

  @ApiProperty({ description: '생성일시' })
  createdAt!: string;

  @ApiProperty({ description: '수정일시' })
  updatedAt!: string;
}

export class PostListDto {
  data!: PostDto[];
  meta!: { page: number; limit: number; total: number };
}
