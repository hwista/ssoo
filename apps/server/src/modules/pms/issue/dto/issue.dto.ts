import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IssueDto {
  @ApiProperty({ description: '이슈 ID' })
  id!: string;

  @ApiProperty({ description: '프로젝트 ID' })
  projectId!: string;

  @ApiProperty({ description: '이슈 코드' })
  issueCode!: string;

  @ApiProperty({ description: '이슈 제목' })
  issueTitle!: string;

  @ApiProperty({ description: '이슈 유형' })
  issueTypeCode!: string;

  @ApiProperty({ description: '상태' })
  statusCode!: string;

  @ApiProperty({ description: '우선순위' })
  priorityCode!: string;

  @ApiPropertyOptional({ description: '담당자 ID' })
  assigneeUserId?: string;
}
