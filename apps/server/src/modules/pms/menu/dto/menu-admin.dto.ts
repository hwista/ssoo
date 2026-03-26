import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsBoolean, IsIn } from 'class-validator';

export class CreateMenuDto {
  @ApiProperty({ description: '메뉴 고유 코드' })
  @IsString()
  menuCode!: string;

  @ApiProperty({ description: '메뉴명 (한글)' })
  @IsString()
  menuName!: string;

  @ApiPropertyOptional({ description: '메뉴명 (영문)' })
  @IsString()
  @IsOptional()
  menuNameEn?: string;

  @ApiPropertyOptional({ description: '메뉴 유형', enum: ['group', 'menu', 'action'], default: 'menu' })
  @IsString()
  @IsIn(['group', 'menu', 'action'])
  @IsOptional()
  menuType?: string;

  @ApiPropertyOptional({ description: '부모 메뉴 ID' })
  @IsString()
  @IsOptional()
  parentMenuId?: string;

  @ApiPropertyOptional({ description: '라우트 경로' })
  @IsString()
  @IsOptional()
  menuPath?: string;

  @ApiPropertyOptional({ description: '아이콘 (lucide-react)' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: '정렬 순서', default: 0 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '사이드바 표시 여부', default: true })
  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @ApiPropertyOptional({ description: '관리자 전용 메뉴 여부', default: false })
  @IsBoolean()
  @IsOptional()
  isAdminMenu?: boolean;

  @ApiPropertyOptional({ description: '열기 방식', enum: ['tab', 'modal', 'external'], default: 'tab' })
  @IsString()
  @IsIn(['tab', 'modal', 'external'])
  @IsOptional()
  openType?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateMenuDto {
  @ApiPropertyOptional({ description: '메뉴명 (한글)' })
  @IsString()
  @IsOptional()
  menuName?: string;

  @ApiPropertyOptional({ description: '메뉴명 (영문)' })
  @IsString()
  @IsOptional()
  menuNameEn?: string;

  @ApiPropertyOptional({ description: '메뉴 유형', enum: ['group', 'menu', 'action'] })
  @IsString()
  @IsIn(['group', 'menu', 'action'])
  @IsOptional()
  menuType?: string;

  @ApiPropertyOptional({ description: '부모 메뉴 ID' })
  @IsString()
  @IsOptional()
  parentMenuId?: string;

  @ApiPropertyOptional({ description: '라우트 경로' })
  @IsString()
  @IsOptional()
  menuPath?: string;

  @ApiPropertyOptional({ description: '아이콘 (lucide-react)' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '사이드바 표시 여부' })
  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @ApiPropertyOptional({ description: '활성화 여부' })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: '관리자 전용 메뉴 여부' })
  @IsBoolean()
  @IsOptional()
  isAdminMenu?: boolean;

  @ApiPropertyOptional({ description: '열기 방식', enum: ['tab', 'modal', 'external'] })
  @IsString()
  @IsIn(['tab', 'modal', 'external'])
  @IsOptional()
  openType?: string;

  @ApiPropertyOptional({ description: '설명' })
  @IsString()
  @IsOptional()
  description?: string;
}
