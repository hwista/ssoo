import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectMemberDto {
  @ApiProperty({ description: '프로젝트 ID' })
  projectId!: string;

  @ApiProperty({ description: '사용자 ID' })
  userId!: string;

  @ApiProperty({ description: '역할 코드' })
  roleCode!: string;

  @ApiProperty({ description: '배정일' })
  assignedAt!: string;

  @ApiPropertyOptional({ description: '해제일' })
  releasedAt?: string | null;

  @ApiProperty({ description: '투입률 (0-100)' })
  allocationRate!: number;
}
