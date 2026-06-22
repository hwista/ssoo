import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { CommonSearchSourceApp } from '@ssoo/types/common';
import type { CommonSearchEntityType } from '@ssoo/types/common';
import { success } from '../../../common/responses.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { TokenPayload } from '../auth/interfaces/auth.interface.js';
import { CommonSearchService } from './search.service.js';

const COMMON_SEARCH_SOURCE_APPS = new Set<CommonSearchSourceApp>(['admin', 'crm', 'pms', 'dms', 'sns']);
const COMMON_SEARCH_ENTITY_TYPES = new Set<CommonSearchEntityType>([
  'document',
  'person',
  'post',
  'project',
  'customer',
  'opportunity',
  'user',
  'setting',
  'menu',
  'unknown',
]);

function normalizeSourceApp(sourceApp?: string): CommonSearchSourceApp | undefined {
  if (!sourceApp) return undefined;
  return COMMON_SEARCH_SOURCE_APPS.has(sourceApp as CommonSearchSourceApp)
    ? sourceApp as CommonSearchSourceApp
    : undefined;
}

function normalizeEntityTypes(entityTypes?: string): CommonSearchEntityType[] | undefined {
  const normalized = entityTypes
    ?.split(',')
    .map((value) => value.trim())
    .filter((value): value is CommonSearchEntityType => (
      COMMON_SEARCH_ENTITY_TYPES.has(value as CommonSearchEntityType)
    ));

  return normalized && normalized.length > 0 ? Array.from(new Set(normalized)) : undefined;
}

@ApiTags('common-search')
@ApiBearerAuth()
@Controller('search')
export class CommonSearchController {
  constructor(private readonly searchService: CommonSearchService) {}

  @Get()
  @ApiOperation({ summary: 'SSOO 통합 검색' })
  @ApiQuery({ name: 'q', required: true, type: String, description: '검색어' })
  @ApiQuery({ name: 'sourceApp', required: false, type: String, description: 'admin|crm|pms|dms|sns' })
  @ApiQuery({ name: 'entityTypes', required: false, type: String, description: 'comma-separated entity type filter' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '최대 결과 수' })
  @ApiOkResponse({ description: '통합 검색 결과 반환' })
  async search(
    @CurrentUser() currentUser: TokenPayload,
    @Query('q') query: string,
    @Query('sourceApp') sourceApp?: string,
    @Query('entityTypes') entityTypes?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.searchService.search({
      query: query ?? '',
      sourceApp: normalizeSourceApp(sourceApp),
      entityTypes: normalizeEntityTypes(entityTypes),
      limit: limit ? Number(limit) : undefined,
    }, currentUser);
    return success(data);
  }
}
