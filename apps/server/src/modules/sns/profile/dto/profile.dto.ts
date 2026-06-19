import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsDateString } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: '표시명', maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ description: '아바타 이미지 URL', maxLength: 1000 })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  avatarUrl?: string;

  @ApiPropertyOptional({ description: '자기소개', maxLength: 2000 })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ description: '커버 이미지 URL', maxLength: 1000 })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  coverImageUrl?: string;

  @ApiPropertyOptional({ description: 'LinkedIn URL', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  linkedinUrl?: string;

  @ApiPropertyOptional({ description: '웹사이트 URL', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  websiteUrl?: string;
}

export class CreateCareerDto {
  @ApiProperty({ description: '프로젝트명', maxLength: 300 })
  @IsString()
  @MaxLength(300)
  projectName!: string;

  @ApiProperty({ description: '역할명', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  roleName!: string;

  @ApiProperty({ description: '시작일 (ISO 8601)' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ description: '종료일 (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: '설명', maxLength: 2000 })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: '회사명', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  companyName?: string;
}

export class ProfileUserSummaryDto {
  @ApiProperty({ description: '사용자 ID' })
  id!: string;

  @ApiProperty({ description: '사용자명' })
  userName!: string;

  @ApiPropertyOptional({ description: '표시명' })
  displayName!: string | null;

  @ApiProperty({ description: '이메일' })
  email!: string;

  @ApiPropertyOptional({ description: '전화번호' })
  phone!: string | null;

  @ApiPropertyOptional({ description: '아바타 URL' })
  avatarUrl!: string | null;

  @ApiPropertyOptional({ description: '부서 코드' })
  departmentCode!: string | null;

  @ApiPropertyOptional({ description: '직급 코드' })
  positionCode!: string | null;
}

export class ProfileSkillDto {
  @ApiProperty({ description: '사용자 스킬 ID' })
  id!: string;

  @ApiProperty({ description: '프로필 ID' })
  profileId!: string;

  @ApiProperty({ description: '스킬 ID' })
  skillId!: string;

  @ApiProperty({ description: '스킬명' })
  skillName!: string;

  @ApiProperty({ description: '스킬 분류' })
  skillCategory!: string;

  @ApiProperty({ description: '숙련도' })
  proficiencyLevel!: number;

  @ApiProperty({ description: '경험 연수' })
  yearsOfExperience!: number;

  @ApiProperty({ description: '추천 수' })
  endorsementCount!: number;
}

export class ProfileCareerDto {
  @ApiProperty({ description: '경력 ID' })
  id!: string;

  @ApiProperty({ description: '프로필 ID' })
  profileId!: string;

  @ApiPropertyOptional({ description: '프로젝트 ID' })
  projectId!: string | null;

  @ApiPropertyOptional({ description: '회사명' })
  companyName!: string | null;

  @ApiProperty({ description: '프로젝트명' })
  projectName!: string;

  @ApiProperty({ description: '역할명' })
  roleName!: string;

  @ApiPropertyOptional({ description: '설명' })
  description!: string | null;

  @ApiProperty({ description: '시작일' })
  startDate!: string;

  @ApiPropertyOptional({ description: '종료일' })
  endDate!: string | null;
}

export class ProfileFollowStatsDto {
  @ApiProperty({ description: '팔로워 수' })
  followersCount!: number;

  @ApiProperty({ description: '팔로잉 수' })
  followingCount!: number;

  @ApiProperty({ description: '현재 사용자의 팔로우 여부' })
  isFollowing!: boolean;
}

export class ProfileDto {
  @ApiProperty({ description: '프로필 ID' })
  id!: string;

  @ApiProperty({ description: '사용자 ID' })
  userId!: string;

  @ApiProperty({ description: '사용자 표시 요약', type: () => ProfileUserSummaryDto })
  user!: ProfileUserSummaryDto;

  @ApiPropertyOptional({ description: '자기소개' })
  bio?: string;

  @ApiPropertyOptional({ description: '커버 이미지 URL' })
  coverImageUrl?: string;

  @ApiPropertyOptional({ description: 'LinkedIn URL' })
  linkedinUrl?: string;

  @ApiPropertyOptional({ description: '웹사이트 URL' })
  websiteUrl?: string;

  @ApiProperty({ description: '프로필 스킬 목록', type: () => [ProfileSkillDto] })
  skills!: ProfileSkillDto[];

  @ApiProperty({ description: '프로젝트/경력 목록', type: () => [ProfileCareerDto] })
  careers!: ProfileCareerDto[];

  @ApiProperty({ description: '팔로우 통계', type: () => ProfileFollowStatsDto })
  followStats!: ProfileFollowStatsDto;

  @ApiProperty({ description: '현재 사용자의 본인 프로필 여부' })
  isOwnProfile!: boolean;

  @ApiProperty({ description: '프로필 공용 경로' })
  profilePath!: string;

  @ApiProperty({ description: '생성일시' })
  createdAt!: string;

  @ApiProperty({ description: '수정일시' })
  updatedAt!: string;
}
