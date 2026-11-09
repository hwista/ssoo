import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsString, Matches } from 'class-validator';

import { ParticipationReasonDto } from '../../onboarding/participation-operations.dto.js';

export class UpdateRolePermissionsDto extends ParticipationReasonDto {
  @ApiProperty({ description: '조회한 역할 권한의 revision' })
  @Matches(/^[a-f0-9]{64}$/)
  expectedRevision!: string;

  @ApiProperty({ type: [String], description: '역할에 활성화할 전체 permission code 집합' })
  @IsArray()
  @ArrayMaxSize(500)
  @ArrayUnique()
  @IsString({ each: true })
  permissionCodes!: string[];
}
