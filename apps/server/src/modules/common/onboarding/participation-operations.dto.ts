import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsISO8601, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class ParticipationListQuery {
  @ApiPropertyOptional() @IsOptional() @Matches(/^[1-9]\d{0,18}$/) userId?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^[1-9]\d{0,18}$/) organizationId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
  @ApiPropertyOptional() @IsIn(['all', 'active', 'inactive']) status: 'all' | 'active' | 'inactive' = 'all';
  @ApiPropertyOptional() @IsInt() @Min(1) @Max(100000) page: number = 1;
  @ApiPropertyOptional() @IsInt() @Min(1) @Max(100) pageSize: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsIn(['crm', 'pms', 'dms', 'sns']) serviceCode?: string;
}

export class ParticipationReasonDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(2000) reason!: string;
}

export class ParticipationRevisionDto extends ParticipationReasonDto {
  @ApiProperty() @IsISO8601({ strict: true }) expectedUpdatedAt!: string;
}

export class MembershipFieldsDto extends ParticipationReasonDto {
  @ApiProperty() @IsBoolean() isPrimary!: boolean;
  @ApiProperty() @IsBoolean() isLeader!: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) positionCode?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsISO8601({ strict: true }) effectiveFrom?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsISO8601({ strict: true }) effectiveTo?: string | null;
}

export class CreateMembershipDto extends MembershipFieldsDto {
  @ApiProperty() @Matches(/^[1-9]\d{0,18}$/) userId!: string;
  @ApiProperty() @Matches(/^[1-9]\d{0,18}$/) organizationId!: string;
}

export class UpdateMembershipDto extends MembershipFieldsDto {
  @ApiProperty() @IsISO8601({ strict: true }) expectedUpdatedAt!: string;
}

export class TransferMembershipDto extends ParticipationRevisionDto {
  @ApiProperty() @Matches(/^[1-9]\d{0,18}$/) organizationId!: string;
}

export class GrantFieldsDto extends ParticipationReasonDto {
  @ApiProperty() @IsIn(['viewer', 'user', 'manager']) roleCode!: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601({ strict: true }) expiresAt?: string | null;
}

export class CreateServiceGrantDto extends GrantFieldsDto {
  @ApiProperty() @Matches(/^[1-9]\d{0,18}$/) userId!: string;
  @ApiProperty() @Matches(/^[1-9]\d{0,18}$/) organizationId!: string;
  @ApiProperty() @IsIn(['crm', 'pms', 'dms', 'sns']) serviceCode!: string;
}

export class UpdateServiceGrantDto extends GrantFieldsDto {
  @ApiProperty() @IsISO8601({ strict: true }) expectedUpdatedAt!: string;
}
