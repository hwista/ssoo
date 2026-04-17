import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CommentService } from './comment.service.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { success, deleted } from '../../../common/index.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import { CreateCommentDto, UpdateCommentDto, CommentDto } from './dto/comment.dto.js';
import { CmsFeatureGuard } from '../access/cms-feature.guard.js';
import { RequireCmsFeature } from '../access/require-cms-feature.decorator.js';

@ApiTags('cms-comments')
@ApiBearerAuth()
@Controller('cms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get('posts/:postId/comments')
  @ApiOperation({ summary: '게시물 댓글 목록' })
  @ApiOkResponse({ type: [CommentDto] })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  @UseGuards(CmsFeatureGuard)
  @RequireCmsFeature('canReadFeed')
  async findByPost(@Param('postId') postId: string, @CurrentUser() user: TokenPayload) {
    const comments = await this.commentService.findByPost(BigInt(postId), user);
    return success(comments.map((c) => serializeBigInt(c)));
  }

  @Post('posts/:postId/comments')
  @ApiOperation({ summary: '댓글 작성' })
  @ApiOkResponse({ type: CommentDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  @UseGuards(CmsFeatureGuard)
  @RequireCmsFeature('canComment')
  async create(
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: TokenPayload,
  ) {
    const comment = await this.commentService.create(BigInt(postId), dto, user);
    return success(serializeBigInt(comment));
  }

  @Put('comments/:id')
  @ApiOperation({ summary: '댓글 수정' })
  @ApiOkResponse({ type: CommentDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  @UseGuards(CmsFeatureGuard)
  @RequireCmsFeature('canComment')
  async update(@Param('id') id: string, @Body() dto: UpdateCommentDto, @CurrentUser() user: TokenPayload) {
    const comment = await this.commentService.update(BigInt(id), dto, user);
    return success(serializeBigInt(comment));
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: '댓글 삭제 (soft delete)' })
  @ApiOkResponse({ description: '댓글 삭제 완료' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  @UseGuards(CmsFeatureGuard)
  @RequireCmsFeature('canComment')
  async remove(@Param('id') id: string, @CurrentUser() user: TokenPayload) {
    await this.commentService.softDelete(BigInt(id), user);
    return deleted(true);
  }
}
