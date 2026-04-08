import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import type { SearchContextMode, SearchIndexSyncAction } from '@ssoo/types/dms';

export const SEARCH_CONTEXT_MODES = ['doc', 'deep'] as const;
export const SEARCH_INDEX_SYNC_ACTIONS = ['upsert', 'delete'] as const;

export class SearchDocumentsDto {
  @ApiProperty({ description: '검색 질의' })
  @IsString()
  @MinLength(2)
  query!: string;

  @ApiPropertyOptional({
    description: '검색 컨텍스트 모드',
    enum: SEARCH_CONTEXT_MODES,
    default: 'doc',
  })
  @IsOptional()
  @IsIn(SEARCH_CONTEXT_MODES)
  contextMode?: SearchContextMode;

  @ApiPropertyOptional({ description: '현재 활성 문서 경로' })
  @IsOptional()
  @IsString()
  activeDocPath?: string;
}

export class SyncSearchIndexDto {
  @ApiProperty({ description: '동기화 대상 문서 또는 폴더 경로' })
  @IsString()
  @MinLength(1)
  path!: string;

  @ApiPropertyOptional({
    description: '검색 인덱스 동기화 액션',
    enum: SEARCH_INDEX_SYNC_ACTIONS,
    default: 'upsert',
  })
  @IsOptional()
  @IsIn(SEARCH_INDEX_SYNC_ACTIONS)
  action?: SearchIndexSyncAction;

  @ApiPropertyOptional({ description: 'rename 등 이전 경로가 있을 때 전달' })
  @IsOptional()
  @IsString()
  previousPath?: string;
}
