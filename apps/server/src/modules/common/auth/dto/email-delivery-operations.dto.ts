import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';
import { ParticipationReasonDto } from '../../onboarding/participation-operations.dto.js';

export class EmailDeliveryListQuery {
  @ApiPropertyOptional() @IsInt() @Min(1) @Max(100000) page: number = 1;
  @ApiPropertyOptional() @IsInt() @Min(1) @Max(100) pageSize: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsIn(['pending','processing','sent','failed','superseded','consumed']) status?: string;
}
export class RetryEmailDeliveryDto extends ParticipationReasonDto {
  @ApiProperty() @IsISO8601({ strict: true }) expectedUpdatedAt!: string;
}
