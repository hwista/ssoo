import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { PostService } from './post.service.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { success, paginated, deleted } from '../../../common/index.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import { CreatePostDto, UpdatePostDto, FindPostsDto, PostDto, PostListDto } from './dto/post.dto.js';

@ApiTags('chs-posts')
@ApiBearerAuth()
@Controller('chs/posts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get()
  @ApiOperation({ summary: '게시물 목록' })
  @ApiOkResponse({ type: PostListDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findAll(@Query() params: FindPostsDto) {
    const { data, total, page, pageSize } = await this.postService.findAll(params);
    const serialized = data.map((p) => serializeBigInt(p));
    return paginated(serialized as Record<string, unknown>[], page, pageSize, total);
  }

  @Get(':id')
  @ApiOperation({ summary: '게시물 상세' })
  @ApiOkResponse({ type: PostDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findOne(@Param('id') id: string, @CurrentUser() user: TokenPayload) {
    const post = await this.postService.findOne(BigInt(id), BigInt(user.userId));
    return success(serializeBigInt(post));
  }

  @Post()
  @ApiOperation({ summary: '게시물 생성' })
  @ApiOkResponse({ type: PostDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async create(@Body() dto: CreatePostDto, @CurrentUser() user: TokenPayload) {
    const post = await this.postService.create(dto, BigInt(user.userId));
    return success(serializeBigInt(post));
  }

  @Put(':id')
  @ApiOperation({ summary: '게시물 수정' })
  @ApiOkResponse({ type: PostDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async update(@Param('id') id: string, @Body() dto: UpdatePostDto) {
    const post = await this.postService.update(BigInt(id), dto);
    return success(serializeBigInt(post));
  }

  @Delete(':id')
  @ApiOperation({ summary: '게시물 삭제 (soft delete)' })
  @ApiOkResponse({ description: '게시물 삭제 완료' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async remove(@Param('id') id: string) {
    await this.postService.softDelete(BigInt(id));
    return deleted(true);
  }
}
