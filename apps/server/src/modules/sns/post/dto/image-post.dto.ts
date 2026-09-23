import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, Matches } from 'class-validator';

export class CreateImagePostDto {
  @ApiProperty({ description: '재시도에도 동일하게 유지하는 작성 요청 식별자', format: 'uuid' })
  @IsUUID('4')
  submissionId!: string;

  @ApiProperty({ description: '게시물 본문', maxLength: 20000 })
  @IsString()
  @Matches(/\S/, { message: '본문을 입력해 주세요.' })
  @MaxLength(20000)
  content!: string;

  @ApiProperty({ enum: ['public', 'organization', 'followers', 'self'], required: false })
  @IsOptional()
  @IsIn(['public', 'organization', 'followers', 'self'])
  visibilityScopeCode?: string;
}

export class PostImageDto {
  @ApiProperty() id!: string;
  @ApiProperty() fileName!: string;
  @ApiProperty() mimeType!: string;
  @ApiProperty({ description: '바이트 수 (문자열)' }) fileSize!: string;
}
