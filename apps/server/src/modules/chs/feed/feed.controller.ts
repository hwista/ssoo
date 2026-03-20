import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { FeedService } from './feed.service.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { success } from '../../../common/index.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import { FeedQueryDto, ReactionDto } from './dto/feed.dto.js';

@ApiTags('chs-feed')
@ApiBearerAuth()
@Controller('chs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get('feed')
  @ApiOperation({ summary: '피드 타임라인' })
  @ApiOkResponse({ description: '피드 목록 (커서 기반 페이지네이션)' })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async getTimeline(@Query() params: FeedQueryDto, @CurrentUser() user: TokenPayload) {
    const result = await this.feedService.getTimeline(BigInt(user.userId), params);
    return success({
      items: result.items.map((item) => serializeBigInt(item)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  }

  @Post('posts/:postId/reactions')
  @ApiOperation({ summary: '게시물 반응 추가' })
  @ApiOkResponse({ description: '반응 추가 완료' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async addReaction(
    @Param('postId') postId: string,
    @Body() dto: ReactionDto,
    @CurrentUser() user: TokenPayload,
  ) {
    const reaction = await this.feedService.addReaction(BigInt(user.userId), BigInt(postId), dto);
    return success(serializeBigInt(reaction));
  }

  @Delete('posts/:postId/reactions')
  @ApiOperation({ summary: '게시물 반응 제거' })
  @ApiOkResponse({ description: '반응 제거 완료' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async removeReaction(@Param('postId') postId: string, @CurrentUser() user: TokenPayload) {
    await this.feedService.removeReaction(BigInt(user.userId), BigInt(postId));
    return success(null);
  }

  @Post('posts/:postId/bookmark')
  @ApiOperation({ summary: '게시물 북마크' })
  @ApiOkResponse({ description: '북마크 추가 완료' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async addBookmark(@Param('postId') postId: string, @CurrentUser() user: TokenPayload) {
    const bookmark = await this.feedService.addBookmark(BigInt(user.userId), BigInt(postId));
    return success(serializeBigInt(bookmark));
  }

  @Delete('posts/:postId/bookmark')
  @ApiOperation({ summary: '게시물 북마크 제거' })
  @ApiOkResponse({ description: '북마크 제거 완료' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async removeBookmark(@Param('postId') postId: string, @CurrentUser() user: TokenPayload) {
    await this.feedService.removeBookmark(BigInt(user.userId), BigInt(postId));
    return success(null);
  }
}
