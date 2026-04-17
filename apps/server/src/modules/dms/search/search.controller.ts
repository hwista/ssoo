import { Body, Controller, Post, UseGuards } from '@nestjs/common';
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
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { DmsFeatureGuard } from '../access/dms-feature.guard.js';
import { RequireDmsFeature } from '../access/require-dms-feature.decorator.js';
import { SearchDocumentsDto, SyncSearchIndexDto } from './dto/search.dto.js';
import { SearchService } from './search.service.js';

@ApiTags('dms')
@ApiBearerAuth()
@Controller('dms/search')
@UseGuards(JwtAuthGuard, DmsFeatureGuard)
@RequireDmsFeature('canUseSearch')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

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
