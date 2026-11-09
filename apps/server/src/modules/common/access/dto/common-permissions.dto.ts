import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ParticipationListQuery, ParticipationReasonDto } from '../../onboarding/participation-operations.dto.js';

export class CommonPermissionQuery extends ParticipationListQuery {
  @ApiPropertyOptional() @IsOptional() @Matches(/^[1-9]\d{0,18}$/) targetId?: string;
}

export class CommonPermissionDto extends ParticipationReasonDto {
  @ApiProperty() @Matches(/^[1-9]\d{0,18}$/) targetId!: string;
  @ApiProperty() @IsString() @MaxLength(100) permissionCode!: string;
  @ApiProperty() @IsIn(['grant', 'revoke']) effect!: 'grant' | 'revoke';
  @ApiPropertyOptional() @IsOptional() @IsISO8601({ strict: true }) effectiveFrom?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsISO8601({ strict: true }) effectiveTo?: string | null;
}

export class CommonPermissionUpdateDto extends CommonPermissionDto {
  @ApiProperty() @IsISO8601({ strict: true }) expectedUpdatedAt!: string;
}
