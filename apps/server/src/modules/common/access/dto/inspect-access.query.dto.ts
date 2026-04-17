import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class InspectAccessQueryDto {
  @ApiPropertyOptional({ description: '대상 사용자 ID(BigInt string)' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: '대상 로그인 ID' })
  @IsString()
  @IsOptional()
  loginId?: string;

  @ApiPropertyOptional({ description: 'object axis target type' })
  @IsString()
  @IsOptional()
  targetObjectType?: string;

  @ApiPropertyOptional({ description: 'object axis target id' })
  @IsString()
  @IsOptional()
  targetObjectId?: string;

  @ApiPropertyOptional({
    description: 'object resolution 전에 더할 domain permission codes (comma-separated)',
  })
  @IsString()
  @IsOptional()
  domainPermissionCodes?: string;

  @ApiPropertyOptional({
    description: '비활성/만료 예외까지 포함할지 여부',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  includeInactive?: boolean;
}
