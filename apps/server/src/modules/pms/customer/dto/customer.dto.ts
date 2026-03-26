import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MaxLength, IsEmail } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ description: '고객사 코드', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  customerCode!: string;

  @ApiProperty({ description: '고객사명', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  customerName!: string;

  @ApiPropertyOptional({ description: '고객사 유형', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  customerType?: string;

  @ApiPropertyOptional({ description: '업종', maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({ description: '주소', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: '전화번호', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: '이메일', maxLength: 200 })
  @IsEmail()
  @IsOptional()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({ description: '담당자명', maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  contactPerson?: string;

  @ApiPropertyOptional({ description: '담당자 연락처', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  contactPhone?: string;

  @ApiPropertyOptional({ description: '웹사이트', maxLength: 300 })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  website?: string;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  memo?: string;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ description: '고객사명', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  customerName?: string;

  @ApiPropertyOptional({ description: '고객사 유형', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  customerType?: string;

  @ApiPropertyOptional({ description: '업종', maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({ description: '주소', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: '전화번호', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: '이메일', maxLength: 200 })
  @IsEmail()
  @IsOptional()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({ description: '담당자명', maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  contactPerson?: string;

  @ApiPropertyOptional({ description: '담당자 연락처', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  contactPhone?: string;

  @ApiPropertyOptional({ description: '웹사이트', maxLength: 300 })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  website?: string;

  @ApiPropertyOptional({ description: '활성 여부' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: '메모' })
  @IsString()
  @IsOptional()
  memo?: string;
}

export class FindCustomersDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: '검색어 (고객사명, 코드)' })
  @IsString()
  @IsOptional()
  search?: string;
}

export class CustomerDto {
  @ApiProperty({ description: '고객사 ID' })
  id!: string;

  @ApiProperty({ description: '고객사 코드' })
  customerCode!: string;

  @ApiProperty({ description: '고객사명' })
  customerName!: string;

  @ApiPropertyOptional({ description: '고객사 유형' })
  customerType?: string;

  @ApiPropertyOptional({ description: '업종' })
  industry?: string;

  @ApiPropertyOptional({ description: '주소' })
  address?: string;

  @ApiPropertyOptional({ description: '전화번호' })
  phone?: string;

  @ApiPropertyOptional({ description: '이메일' })
  email?: string;

  @ApiPropertyOptional({ description: '담당자명' })
  contactPerson?: string;

  @ApiPropertyOptional({ description: '담당자 연락처' })
  contactPhone?: string;

  @ApiPropertyOptional({ description: '웹사이트' })
  website?: string;

  @ApiProperty({ description: '활성 여부' })
  isActive!: boolean;

  @ApiPropertyOptional({ description: '메모' })
  memo?: string;

  @ApiProperty({ description: '생성일시' })
  createdAt!: string;

  @ApiProperty({ description: '수정일시' })
  updatedAt!: string;
}
