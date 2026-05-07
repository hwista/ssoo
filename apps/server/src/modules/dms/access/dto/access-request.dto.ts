import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type {
  ApproveDmsDocumentAccessRequestPayload,
  CreateDmsDocumentAccessRequestPayload,
  CreateDmsDocumentDirectGrantPayload,
  DmsDocumentAccessRequestListQuery,
  DmsDocumentAccessRequestStatusFilter,
  RejectDmsDocumentAccessRequestPayload,
  TransferDocumentOwnershipPayload,
  UpdateDocumentVisibilityPayload,
} from '@ssoo/types/dms';

export const DMS_DOCUMENT_ACCESS_REQUEST_STATUS_FILTERS = [
  'all',
  'pending',
  'approved',
  'rejected',
  'expired',
  'revoked',
] as const;

export class CreateReadAccessRequestDto
  implements CreateDmsDocumentAccessRequestPayload {
  @ApiProperty({ description: '읽기 권한을 요청할 문서 경로' })
  @IsString()
  @MinLength(1)
  path!: string;

  @ApiPropertyOptional({ description: '요청 메시지', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  requestMessage?: string;

  @ApiPropertyOptional({ description: '희망 만료 시각 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  requestedExpiresAt?: string;
}

export class ListAccessRequestsDto
  implements DmsDocumentAccessRequestListQuery {
  @ApiPropertyOptional({
    description: '조회할 요청 상태',
    enum: DMS_DOCUMENT_ACCESS_REQUEST_STATUS_FILTERS,
    default: 'all',
  })
  @IsOptional()
  @IsIn(DMS_DOCUMENT_ACCESS_REQUEST_STATUS_FILTERS)
  status?: DmsDocumentAccessRequestStatusFilter;

  @ApiPropertyOptional({ description: '문서 경로 필터' })
  @IsOptional()
  @IsString()
  path?: string;
}

export class ApproveReadAccessRequestDto
  implements ApproveDmsDocumentAccessRequestPayload {
  @ApiPropertyOptional({ description: '응답 메시지', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  responseMessage?: string;

  @ApiPropertyOptional({ description: '승인 grant 만료 시각 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  grantExpiresAt?: string;
}

export class RejectReadAccessRequestDto
  implements RejectDmsDocumentAccessRequestPayload {
  @ApiPropertyOptional({ description: '거절 메시지', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  responseMessage?: string;
}

const VALID_VISIBILITY_SCOPES = ['self', 'organization'] as const;

export class UpdateDocumentVisibilityDto
  implements UpdateDocumentVisibilityPayload {
  @ApiProperty({
    description: '문서 공개범위',
    enum: VALID_VISIBILITY_SCOPES,
  })
  @IsIn(VALID_VISIBILITY_SCOPES)
  visibilityScope!: 'self' | 'organization';
}

export class TransferDocumentOwnershipDto
  implements TransferDocumentOwnershipPayload {
  @ApiProperty({ description: '새 소유자의 loginId' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  newOwnerLoginId!: string;
}

export class CreateDirectGrantDto implements CreateDmsDocumentDirectGrantPayload {
  @ApiProperty({ description: '권한을 부여할 문서 ID' })
  @IsString()
  @MinLength(1)
  documentId!: string;

  @ApiProperty({ description: 'grant 대상 사용자 ID' })
  @IsString()
  @MinLength(1)
  principalUserId!: string;

  @ApiPropertyOptional({ description: '권한 만료 시각 (ISO 8601), 미지정 시 무기한' })
  @IsOptional()
  @IsDateString()
  grantExpiresAt?: string;

  @ApiPropertyOptional({ description: '부여 사유/메모', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string;
}
