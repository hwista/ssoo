import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TaskDto {
  @ApiProperty({ description: '태스크 ID' })
  id!: string;

  @ApiProperty({ description: '프로젝트 ID' })
  projectId!: string;

  @ApiProperty({ description: 'WBS 코드' })
  taskCode!: string;

  @ApiProperty({ description: '태스크명' })
  taskName!: string;

  @ApiProperty({ description: '상태' })
  statusCode!: string;

  @ApiProperty({ description: '진척률 (0-100)' })
  progressRate!: number;
}

export class MilestoneDto {
  @ApiProperty({ description: '마일스톤 ID' })
  id!: string;

  @ApiProperty({ description: '프로젝트 ID' })
  projectId!: string;

  @ApiProperty({ description: '마일스톤 코드' })
  milestoneCode!: string;

  @ApiProperty({ description: '마일스톤명' })
  milestoneName!: string;

  @ApiProperty({ description: '상태' })
  statusCode!: string;

  @ApiPropertyOptional({ description: '기한' })
  dueAt?: string;
}
