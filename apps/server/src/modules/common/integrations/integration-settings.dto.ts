import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsObject, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class UpdateIntegrationSettingsDto {
  @ApiProperty({ description: '제공자별 연결 설정. 비밀값은 secret으로 분리합니다.' })
  @IsObject()
  config!: Record<string, unknown>;

  @ApiPropertyOptional({ description: '공백은 기존 값 유지, null은 삭제. 응답에 반환하지 않습니다.' })
  @IsOptional() @IsString() @MaxLength(4096)
  secret?: string | null;

  @ApiProperty({ nullable: true, description: '조회 시 받은 updatedAt, 최초 저장은 null' })
  @ValidateIf((_object, value) => value !== null) @IsISO8601()
  expectedUpdatedAt!: string | null;

  @ApiProperty({ description: '변경 사유' })
  @IsString() @MinLength(1) @MaxLength(500)
  reason!: string;
}
