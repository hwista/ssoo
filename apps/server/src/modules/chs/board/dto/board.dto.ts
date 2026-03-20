import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBoardDto {
  @ApiProperty({ description: '게시판 코드', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  boardCode!: string;

  @ApiProperty({ description: '게시판명', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  boardName!: string;

  @ApiProperty({ description: '게시판 유형 (general, notice, qna)', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  boardType!: string;

  @ApiPropertyOptional({ description: '설명', maxLength: 1000 })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class UpdateBoardDto {
  @ApiPropertyOptional({ description: '게시판명', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  boardName?: string;

  @ApiPropertyOptional({ description: '게시판 유형', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  boardType?: string;

  @ApiPropertyOptional({ description: '설명', maxLength: 1000 })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

export class FindBoardsDto {
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

export class BoardDto {
  @ApiProperty({ description: '게시판 ID' })
  id!: string;

  @ApiProperty({ description: '게시판 코드' })
  boardCode!: string;

  @ApiProperty({ description: '게시판명' })
  boardName!: string;

  @ApiProperty({ description: '게시판 유형' })
  boardType!: string;

  @ApiPropertyOptional({ description: '설명' })
  description?: string;

  @ApiProperty({ description: '정렬 순서' })
  sortOrder!: number;

  @ApiProperty({ description: '생성일시' })
  createdAt!: string;

  @ApiProperty({ description: '수정일시' })
  updatedAt!: string;
}
