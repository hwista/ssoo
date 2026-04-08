import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import { success } from '../../../common/responses.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { SearchService } from '../search/search.service.js';
import { contentService } from '../runtime/content.service.js';

function isSearchIndexSyncTarget(targetPath: string): boolean {
  const normalized = targetPath.toLowerCase();
  return normalized.endsWith('.md') || !normalized.includes('.');
}

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/content')
@UseGuards(JwtAuthGuard)
export class ContentController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'DMS 콘텐츠 로드' })
  @ApiOkResponse({ description: '콘텐츠 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  load(
    @Query('path') contentPath?: string,
    @Query('strict') strict?: string,
  ) {
    if (!contentPath?.trim()) {
      throw new BadRequestException('Missing path parameter');
    }

    const result = contentService.load(contentPath.trim(), {
      strict: strict === 'true',
    });
    if (!result.success) {
      throw new BadRequestException(result.error ?? '콘텐츠 로드에 실패했습니다.');
    }

    return success(result.data);
  }

  @Get('metadata')
  @ApiOperation({ summary: 'DMS 콘텐츠 메타데이터 조회' })
  @ApiOkResponse({ description: '메타데이터 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  readMetadata(@Query('path') contentPath?: string) {
    if (!contentPath?.trim()) {
      throw new BadRequestException('Missing path parameter');
    }

    const { targetPath, valid } = contentService.resolveContentPath(contentPath.trim());
    if (!valid) {
      throw new BadRequestException('Invalid path');
    }

    const metadata = contentService.readSidecar(targetPath);
    if (!metadata) {
      throw new BadRequestException('Metadata not found');
    }

    return success(metadata);
  }

  @Delete()
  @ApiOperation({ summary: 'DMS 콘텐츠 삭제' })
  @ApiOkResponse({ description: '삭제 결과 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async remove(@Body() body: Record<string, unknown>) {
    const contentPath = typeof body.path === 'string' ? body.path : '';
    const candidatePaths = Array.isArray(body.candidatePaths)
      ? body.candidatePaths.filter((item): item is string => typeof item === 'string')
      : undefined;

    if (!contentPath) {
      throw new BadRequestException('path는 필수입니다.');
    }

    const result = contentService.delete(contentPath, candidatePaths);
    if (!result.success) {
      throw new BadRequestException(result.error ?? '콘텐츠 삭제에 실패했습니다.');
    }

    await this.syncSearchIndex(contentPath, 'delete');
    return success(result.data);
  }

  @Post()
  @ApiOperation({ summary: 'DMS 콘텐츠 저장/메타데이터 갱신' })
  @ApiOkResponse({ description: '저장 결과 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async post(@Body() body: Record<string, unknown>) {
    const contentPath = typeof body.path === 'string' ? body.path : '';
    if (!contentPath) {
      throw new BadRequestException('path는 필수입니다.');
    }

    if (body.metadataUpdate && typeof body.metadataUpdate === 'object' && body.content === undefined) {
      const update = body.metadataUpdate as Record<string, unknown>;
      const { targetPath, valid } = contentService.resolveContentPath(contentPath);
      if (!valid) {
        throw new BadRequestException('Invalid path');
      }

      const existing = contentService.readSidecar(targetPath);
      if (!existing) {
        throw new BadRequestException('Metadata not found');
      }

      const merged = {
        ...existing,
        ...update,
        updatedAt: new Date().toISOString(),
      };
      contentService.writeSidecar(targetPath, merged);
      await this.syncSearchIndex(contentPath, 'upsert');
      return success(merged);
    }

    if (typeof body.content !== 'string') {
      throw new BadRequestException('path와 content는 필수입니다.');
    }

    const metadata = body.metadata && typeof body.metadata === 'object'
      ? body.metadata as Record<string, unknown>
      : undefined;
    const result = contentService.save(
      contentPath,
      body.content,
      metadata,
      { skipMetadata: body.skipMetadata === true },
    );

    if (!result.success) {
      throw new BadRequestException(result.error ?? '콘텐츠 저장에 실패했습니다.');
    }

    await this.syncSearchIndex(contentPath, 'upsert');
    return success(result.data);
  }

  private async syncSearchIndex(
    contentPath: string,
    action: 'upsert' | 'delete',
  ) {
    if (!isSearchIndexSyncTarget(contentPath)) {
      return;
    }

    try {
      await this.searchService.syncIndex({ path: contentPath, action });
    } catch (error) {
      throw new BadGatewayException(
        `콘텐츠는 처리되었지만 검색 인덱스 동기화에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
