import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { success } from '../../../common/responses.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { DmsFeatureGuard } from '../access/dms-feature.guard.js';
import { RequireDmsFeature } from '../access/require-dms-feature.decorator.js';
import { CommentsService } from './comments.service.js';
import { CreateCommentDto, MutateCommentDto } from './dto/comment.dto.js';

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/comments')
@UseGuards(DmsFeatureGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @RequireDmsFeature('canReadDocuments')
  @ApiOperation({ summary: 'DMS 문서 댓글 목록 조회' })
  @ApiOkResponse({ description: '댓글 목록 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async list(
    @CurrentUser() currentUser: TokenPayload,
    @Query('path') path: string,
  ) {
    return success(await this.commentsService.list(path, currentUser));
  }

  @Post()
  @HttpCode(200)
  @RequireDmsFeature('canReadDocuments')
  @ApiOperation({ summary: 'DMS 문서 댓글 작성' })
  @ApiOkResponse({ description: '작성 결과 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async create(
    @CurrentUser() currentUser: TokenPayload,
    @Body() body: CreateCommentDto,
  ) {
    return success(await this.commentsService.create(body, currentUser));
  }

  @Delete(':commentId')
  @RequireDmsFeature('canReadDocuments')
  @ApiOperation({ summary: 'DMS 문서 댓글 삭제' })
  @ApiOkResponse({ description: '삭제 결과 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async delete(
    @CurrentUser() currentUser: TokenPayload,
    @Param('commentId') commentId: string,
    @Query('path') path: string,
  ) {
    return success(await this.commentsService.delete(path, commentId, currentUser));
  }

  @Patch(':commentId/restore')
  @RequireDmsFeature('canReadDocuments')
  @ApiOperation({ summary: 'DMS 문서 댓글 복원' })
  @ApiOkResponse({ description: '복원 결과 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async restore(
    @CurrentUser() currentUser: TokenPayload,
    @Param('commentId') commentId: string,
    @Body() body: MutateCommentDto,
  ) {
    return success(await this.commentsService.restore(body.path, commentId, currentUser));
  }
}
