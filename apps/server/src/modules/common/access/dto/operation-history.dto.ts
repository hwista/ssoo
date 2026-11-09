import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class OperationHistoryQueryDto {
  @ApiPropertyOptional({ enum: ['business', 'all'] }) @IsOptional() @IsIn(['business', 'all']) scope?: 'business' | 'all';
  @ApiPropertyOptional() @IsOptional() @IsISO8601({ strict: true }) asOf?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) category?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) subjectId?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^[1-9]\d{0,18}$/) userId?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^[1-9]\d{0,18}$/) organizationId?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^[1-9]\d{0,18}$/) roleId?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^[1-9]\d{0,18}$/) operatorUserId?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601({ strict: true }) from?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601({ strict: true }) to?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) result?: string;
  @ApiPropertyOptional() @IsInt() @Min(1) @Max(100000) page: number = 1;
  @ApiPropertyOptional() @IsInt() @Min(1) @Max(100) pageSize: number = 30;
}
