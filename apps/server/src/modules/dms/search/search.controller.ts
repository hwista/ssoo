import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiBearerAuth,
  ApiTags } from '@nestjs/swagger';
import { success } from '../../../common/responses.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { DmsFeatureGuard } from '../access/dms-feature.guard.js';
import { RequireDmsFeature } from '../access/require-dms-feature.decorator.js';
import { SearchDocumentsDto, SyncSearchIndexDto } from './dto/search.dto.js';
import { SearchHistoryService } from './search-history.service.js';
import { SearchService } from './search.service.js';

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/search')
@UseGuards(DmsFeatureGuard)
@RequireDmsFeature('canUseSearch')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly searchHistoryService: SearchHistoryService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'DMS 문서 검색' })
  @ApiOkResponse({ description: '검색 결과 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async search(
    @Body() dto: SearchDocumentsDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    const data = await this.searchService.search(dto, currentUser);
    return success(data);
  }

  @Get('insights')
  @ApiOperation({ summary: 'DMS 검색 기록 및 인기 검색어 조회' })
  @ApiOkResponse({ description: '검색 기록/인기 검색어 반환' })
  async insights(
    @CurrentUser() currentUser: TokenPayload,
    @Query('historyLimit') historyLimit?: string,
    @Query('popularLimit') popularLimit?: string,
  ) {
    const data = await this.searchHistoryService.getSearchInsights(currentUser, {
      historyLimit: Number(historyLimit),
      popularLimit: Number(popularLimit),
    });
    return success(data);
  }

  @Post('sync')
  @RequireDmsFeature('canManageStorage')
  @ApiOperation({ summary: 'DMS 검색 인덱스 동기화' })
  @ApiOkResponse({ description: '인덱스 동기화 결과 반환' })
  @ApiBadRequestResponse({ type: ApiError, description: '잘못된 요청' })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async sync(@Body() dto: SyncSearchIndexDto) {
    const data = await this.searchService.syncIndex(dto);
    return success(data);
  }
}
