import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, Max, Min } from 'class-validator';

export class CreateBusinessYearDto {
  @ApiProperty({ description: 'CRM 사업연도', minimum: 2000, maximum: 2100 })
  @IsInt()
  @Transform(({ obj, key }) => obj[key])
  @Min(2000)
  @Max(2100)
  year!: number;
}

export class UpdateBusinessYearDto {
  @ApiProperty({ description: '사업연도 활성 상태' })
  @IsBoolean()
  @Transform(({ obj, key }) => obj[key])
  isActive!: boolean;
}
