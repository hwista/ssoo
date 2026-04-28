import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { PostService } from './post.service.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { success, paginated, deleted } from '../../../common/index.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import { CreatePostDto, UpdatePostDto, FindPostsDto, PostDto, PostListDto } from './dto/post.dto.js';
import { CmsFeatureGuard } from '../access/cms-feature.guard.js';
import { RequireCmsFeature } from '../access/require-cms-feature.decorator.js';

@ApiTags('cms-posts')
@ApiBearerAuth()
@Controller('cms/posts')
@UseGuards(RolesGuard)
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get()
  @ApiOperation({ summary: '게시물 목록' })
  @ApiOkResponse({ type: PostListDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  @UseGuards(CmsFeatureGuard)
  @RequireCmsFeature('canReadFeed')
  async findAll(@Query() params: FindPostsDto, @CurrentUser() user: TokenPayload) {
    const { data, total, page, pageSize } = await this.postService.findAll(params, user);
    const serialized = data.map((p) => serializeBigInt(p));
    return paginated(serialized as Record<string, unknown>[], page, pageSize, total);
  }

  @Get(':id')
  @ApiOperation({ summary: '게시물 상세' })
  @ApiOkResponse({ type: PostDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  @UseGuards(CmsFeatureGuard)
  @RequireCmsFeature('canReadFeed')
  async findOne(@Param('id') id: string, @CurrentUser() user: TokenPayload) {
    const post = await this.postService.findOne(BigInt(id), user);
    return success(serializeBigInt(post));
  }

  @Post()
  @ApiOperation({ summary: '게시물 생성' })
  @ApiOkResponse({ type: PostDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  @UseGuards(CmsFeatureGuard)
  @RequireCmsFeature('canCreatePost')
  async create(@Body() dto: CreatePostDto, @CurrentUser() user: TokenPayload) {
    const post = await this.postService.create(dto, user);
    return success(serializeBigInt(post));
  }

  @Put(':id')
  @ApiOperation({ summary: '게시물 수정' })
  @ApiOkResponse({ type: PostDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  @UseGuards(CmsFeatureGuard)
  @RequireCmsFeature('canCreatePost')
  async update(@Param('id') id: string, @Body() dto: UpdatePostDto, @CurrentUser() user: TokenPayload) {
    const post = await this.postService.update(BigInt(id), dto, user);
    return success(serializeBigInt(post));
  }

  @Delete(':id')
  @ApiOperation({ summary: '게시물 삭제 (soft delete)' })
  @ApiOkResponse({ description: '게시물 삭제 완료' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  @UseGuards(CmsFeatureGuard)
  @RequireCmsFeature('canCreatePost')
  async remove(@Param('id') id: string, @CurrentUser() user: TokenPayload) {
    await this.postService.softDelete(BigInt(id), user);
    return deleted(true);
  }
}
