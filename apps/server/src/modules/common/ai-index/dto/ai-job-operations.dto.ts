import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { ParticipationReasonDto } from '../../onboarding/participation-operations.dto.js';

export class AiJobListQuery {
  @ApiPropertyOptional() @IsInt() @Min(1) @Max(100000) page: number = 1;
  @ApiPropertyOptional() @IsInt() @Min(1) @Max(100) pageSize: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsIn(['admin', 'crm', 'pms', 'dms', 'sns']) sourceApp?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['pending', 'running', 'indexed', 'skipped', 'failed', 'cancelled']) status?: string;
}
export class RetryAiJobDto extends ParticipationReasonDto {
  @ApiProperty() @Matches(/^[a-f0-9]{64}$/) expectedRevision!: string;
}
