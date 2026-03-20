import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FeedQueryDto {
  @ApiPropertyOptional({ description: '커서 (마지막 게시물 ID)' })
  @IsString()
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({ description: '한 번에 가져올 개수', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: '피드 유형 (all, following)', default: 'all' })
  @IsString()
  @IsOptional()
  feedType?: string;
}

export class ReactionDto {
  @ApiPropertyOptional({ description: '반응 유형 (like, love, celebrate)', default: 'like' })
  @IsString()
  @IsOptional()
  reactionType?: string;
}
