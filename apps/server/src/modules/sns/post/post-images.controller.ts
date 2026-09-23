import { Body, Controller, Get, Param, Post, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiConsumes, ApiForbiddenResponse, ApiNotFoundResponse, ApiOperation, ApiProduces, ApiTags, ApiUnauthorizedResponse, ApiOkResponse, ApiConflictResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { SnsFeatureGuard } from '../access/sns-feature.guard.js';
import { RequireSnsFeature } from '../access/require-sns-feature.decorator.js';
import { success } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import { ApiOkEnvelopeResponse } from '../../../common/swagger/api-response.decorator.js';
import { PostDto } from './dto/post.dto.js';
import { CreateImagePostDto } from './dto/image-post.dto.js';
import { POST_IMAGE_MAX_BYTES, PostImagesService, type UploadedPostImage } from './post-images.service.js';

@ApiTags('sns-post-images')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: '로그인 필요' })
@ApiForbiddenResponse({ description: '기능 권한 없음' })
@Controller('sns/posts')
@UseGuards(RolesGuard, SnsFeatureGuard)
export class PostImagesController {
  constructor(private readonly images: PostImagesService) {}

  @Post('with-images')
  @RequireSnsFeature('canCreatePost')
  @UseInterceptors(FilesInterceptor('images', 4, { limits: { fileSize: POST_IMAGE_MAX_BYTES, files: 4, fields: 3, fieldSize: 80_000, parts: 7 } }))
  @ApiOperation({ summary: '사진과 본문 함께 게시 (동일 요청 재시도 중복 방지)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', required: ['submissionId', 'content', 'images'], properties: {
    submissionId: { type: 'string', format: 'uuid' }, content: { type: 'string', maxLength: 20000 }, visibilityScopeCode: { type: 'string', enum: ['public', 'organization', 'followers', 'self'] },
    images: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'string', format: 'binary' } },
  } } })
  @ApiOkEnvelopeResponse(PostDto)
  @ApiBadRequestResponse({ description: '본문·사진 개수/크기/형식 오류' })
  @ApiConflictResponse({ description: '같은 요청의 내용 불일치 또는 삭제된 요청' })
  async create(@Body() dto: CreateImagePostDto, @UploadedFiles() files: UploadedPostImage[], @CurrentUser() user: TokenPayload) {
    return success(serializeBigInt(await this.images.create(dto, files ?? [], user)));
  }

  @Get(':postId/images/:imageId')
  @RequireSnsFeature('canReadFeed')
  @ApiOperation({ summary: '게시물 열람 권한으로 첨부 이미지 조회' })
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOkResponse({ description: '이미지 파일', schema: { type: 'string', format: 'binary' } })
  @ApiNotFoundResponse({ description: '이미지 없음 또는 게시물 열람 불가' })
  async read(@Param('postId') postId: string, @Param('imageId') imageId: string, @CurrentUser() user: TokenPayload, @Res() response: Response) {
    const image = await this.images.read(postId, imageId, user);
    response.setHeader('Content-Type', image.mimeType);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Disposition', 'inline');
    response.send(image.buffer);
  }
}
