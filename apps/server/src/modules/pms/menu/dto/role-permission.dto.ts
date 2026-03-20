import { IsString, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class PermissionItemDto {
  @ApiProperty({ description: '메뉴 ID' })
  @IsString()
  menuId!: string;

  @ApiProperty({ description: '접근 타입', enum: ['full', 'read', 'none'] })
  @IsString()
  @IsIn(['full', 'read', 'none'])
  accessType!: string;
}

export class UpdateRolePermissionsDto {
  @ApiProperty({ description: '권한 목록', type: [PermissionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionItemDto)
  permissions!: PermissionItemDto[];
}
