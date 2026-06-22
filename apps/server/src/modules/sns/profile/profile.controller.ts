import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ProfileService } from './profile.service.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { success } from '../../../common/index.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import { UpdateProfileDto, CreateCareerDto, ProfileDto } from './dto/profile.dto.js';
import { SnsFeatureGuard } from '../access/sns-feature.guard.js';
import { RequireSnsFeature } from '../access/require-sns-feature.decorator.js';

@ApiTags('sns-profiles')
@ApiBearerAuth()
@Controller('sns/profiles')
@UseGuards(RolesGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  @ApiOperation({ summary: '내 프로필 조회' })
  @ApiOkResponse({ type: ProfileDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  @UseGuards(SnsFeatureGuard)
  @RequireSnsFeature('canReadFeed')
  async getMyProfile(@CurrentUser() user: TokenPayload) {
    const profile = await this.profileService.getMyProfile(BigInt(user.userId));
    return success(serializeBigInt(profile));
  }

  @Get(':userId')
  @ApiOperation({ summary: '사용자 프로필 조회' })
  @ApiOkResponse({ type: ProfileDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  @UseGuards(SnsFeatureGuard)
  @RequireSnsFeature('canReadFeed')
  async getProfileByUserId(@Param('userId') userId: string, @CurrentUser() user: TokenPayload) {
    const profile = await this.profileService.getProfileByUserId(
      BigInt(userId),
      BigInt(user.userId),
    );
    return success(serializeBigInt(profile));
  }

  @Put('me')
  @ApiOperation({ summary: '내 프로필 수정' })
  @ApiOkResponse({ type: ProfileDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  @UseGuards(SnsFeatureGuard)
  @RequireSnsFeature('canReadFeed')
  async updateProfile(@Body() dto: UpdateProfileDto, @CurrentUser() user: TokenPayload) {
    const profile = await this.profileService.updateProfile(BigInt(user.userId), dto);
    return success(serializeBigInt(profile));
  }

  @Post('me/careers')
  @ApiOperation({ summary: '경력 추가' })
  @ApiOkResponse({ description: '경력 추가 완료' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  @UseGuards(SnsFeatureGuard)
  @RequireSnsFeature('canReadFeed')
  async addCareer(@Body() dto: CreateCareerDto, @CurrentUser() user: TokenPayload) {
    const career = await this.profileService.addCareer(BigInt(user.userId), dto);
    return success(serializeBigInt(career));
  }
}
