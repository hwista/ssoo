import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import type { PermissionExceptionAxis } from '@ssoo/types/common';

export class ListPermissionExceptionsQueryDto {
  @ApiPropertyOptional({ description: '대상 사용자 ID(BigInt string)' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: '대상 로그인 ID' })
  @IsString()
  @IsOptional()
  loginId?: string;

  @ApiPropertyOptional({ enum: ['action', 'object'], description: '예외 축(action|object)' })
  @IsIn(['action', 'object'] satisfies PermissionExceptionAxis[])
  @IsOptional()
  exceptionAxis?: PermissionExceptionAxis;

  @ApiPropertyOptional({ description: 'target object type filter' })
  @IsString()
  @IsOptional()
  targetObjectType?: string;

  @ApiPropertyOptional({ description: 'target object id filter' })
  @IsString()
  @IsOptional()
  targetObjectId?: string;

  @ApiPropertyOptional({ description: 'permission code filter' })
  @IsString()
  @IsOptional()
  permissionCode?: string;

  @ApiPropertyOptional({
    description: '비활성/만료 예외까지 포함할지 여부',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  includeInactive?: boolean;

  @ApiPropertyOptional({
    description: '최대 반환 개수',
    minimum: 1,
    maximum: 500,
    default: 100,
  })
  @IsInt()
  @Min(1)
  @Max(500)
  @IsOptional()
  limit?: number = 100;
}
