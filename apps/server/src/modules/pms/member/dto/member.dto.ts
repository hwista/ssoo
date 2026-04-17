import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectMemberDto {
  @ApiProperty({ description: '프로젝트 ID' })
  projectId!: string;

  @ApiProperty({ description: '사용자 ID' })
  userId!: string;

  @ApiProperty({ description: '역할 코드' })
  roleCode!: string;

  @ApiPropertyOptional({ description: '참여 조직 ID' })
  organizationId?: string | null;

  @ApiProperty({ description: '권한 등급', enum: ['owner', 'participant', 'contributor'] })
  accessLevel!: string;

  @ApiProperty({ description: '현재 phase 담당자 여부' })
  isPhaseOwner!: boolean;

  @ApiProperty({ description: '배정일' })
  assignedAt!: string;

  @ApiPropertyOptional({ description: '해제일' })
  releasedAt?: string | null;

  @ApiProperty({ description: '투입률 (0-100)' })
  allocationRate!: number;
}
