import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import type { OnboardingRequestKind, OnboardingRoleCode, OnboardingServiceCode } from '@ssoo/types/common';

export class CreateOnboardingRequestDto {
  @ApiProperty({ enum: ['membership', 'organization', 'service'] })
  @IsIn(['membership', 'organization', 'service'])
  kind!: OnboardingRequestKind;

  @ApiPropertyOptional() @IsOptional() @Matches(/^[1-9]\d{0,18}$/)
  organizationId?: string;

  @ApiPropertyOptional() @IsOptional() @Matches(/^[1-9]\d{0,18}$/)
  parentOrganizationId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(120)
  organizationName?: string;

  @ApiPropertyOptional({ enum: ['crm', 'pms', 'dms', 'sns'] })
  @IsOptional() @IsIn(['crm', 'pms', 'dms', 'sns'])
  serviceCode?: OnboardingServiceCode;

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(2000)
  message!: string;
}

export class DecideOnboardingRequestDto {
  @ApiProperty({ enum: ['approve', 'reject'] }) @IsIn(['approve', 'reject'])
  decision!: 'approve' | 'reject';

  @ApiProperty() @IsString() @MinLength(1) @MaxLength(2000)
  message!: string;

  @ApiPropertyOptional({ enum: ['viewer', 'user', 'manager'] })
  @IsOptional() @IsIn(['viewer', 'user', 'manager'])
  roleCode?: OnboardingRoleCode;
}

export class SetApprovalAuthorityDto {
  @ApiProperty() @Matches(/^[1-9]\d{0,18}$/)
  userId!: string;

  @ApiProperty({ enum: ['organization', 'service'] }) @IsIn(['organization', 'service'])
  authorityKind!: 'organization' | 'service';

  @ApiPropertyOptional() @IsOptional() @Matches(/^[1-9]\d{0,18}$/)
  organizationId?: string;

  @ApiPropertyOptional({ enum: ['crm', 'pms', 'dms', 'sns'] })
  @IsOptional() @IsIn(['crm', 'pms', 'dms', 'sns'])
  serviceCode?: OnboardingServiceCode;

  @ApiProperty({ enum: ['viewer', 'user', 'manager'] }) @IsIn(['viewer', 'user', 'manager'])
  maxRoleCode!: OnboardingRoleCode;
}
