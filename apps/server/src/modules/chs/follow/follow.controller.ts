import { Controller, Get, Post, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { FollowService } from './follow.service.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { success, paginated } from '../../../common/index.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import { FollowPaginationDto } from './dto/follow.dto.js';

@ApiTags('chs-follows')
@ApiBearerAuth()
@Controller('chs/follows')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @Post(':userId')
  @ApiOperation({ summary: '사용자 팔로우' })
  @ApiOkResponse({ description: '팔로우 완료' })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async follow(@Param('userId') userId: string, @CurrentUser() user: TokenPayload) {
    const follow = await this.followService.follow(BigInt(user.userId), BigInt(userId));
    return success(serializeBigInt(follow));
  }

  @Delete(':userId')
  @ApiOperation({ summary: '사용자 언팔로우' })
  @ApiOkResponse({ description: '언팔로우 완료' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async unfollow(@Param('userId') userId: string, @CurrentUser() user: TokenPayload) {
    await this.followService.unfollow(BigInt(user.userId), BigInt(userId));
    return success(null);
  }

  @Get('followers')
  @ApiOperation({ summary: '내 팔로워 목록' })
  @ApiOkResponse({ description: '팔로워 목록' })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async getFollowers(@Query() params: FollowPaginationDto, @CurrentUser() user: TokenPayload) {
    const { data, total, page, pageSize } = await this.followService.getFollowers(BigInt(user.userId), params);
    const serialized = data.map((f) => serializeBigInt(f));
    return paginated(serialized as Record<string, unknown>[], page, pageSize, total);
  }

  @Get('following')
  @ApiOperation({ summary: '내 팔로잉 목록' })
  @ApiOkResponse({ description: '팔로잉 목록' })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async getFollowing(@Query() params: FollowPaginationDto, @CurrentUser() user: TokenPayload) {
    const { data, total, page, pageSize } = await this.followService.getFollowing(BigInt(user.userId), params);
    const serialized = data.map((f) => serializeBigInt(f));
    return paginated(serialized as Record<string, unknown>[], page, pageSize, total);
  }
}
