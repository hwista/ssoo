import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { Roles } from '../../common/auth/decorators/roles.decorator.js';
import { deleted, paginated, success } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';
import { SiteService } from './site.service.js';
import { CreateSiteDto, FindSitesDto, SiteDto, UpdateSiteDto } from './dto/site.dto.js';

@ApiTags('sites')
@ApiBearerAuth()
@Controller('sites')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SiteController {
  constructor(private readonly siteService: SiteService) {}

  @Get()
  @ApiOperation({ summary: '사이트 목록' })
  @ApiOkResponse({ type: [SiteDto] })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findAll(@Query() params: FindSitesDto) {
    const { data, total, page, limit } = await this.siteService.findAll(params);
    const serialized = data.map((item) => serializeBigInt(item));
    return paginated(serialized as Record<string, unknown>[], page, limit, total);
  }

  @Get('tree')
  @ApiOperation({ summary: '사이트 트리 목록' })
  @ApiOkResponse({ type: [SiteDto] })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findTree(@Query('customerId') customerId?: string) {
    const data = await this.siteService.findTree(customerId);
    return success(data.map((item) => serializeBigInt(item)));
  }

  @Get(':id')
  @ApiOperation({ summary: '사이트 상세' })
  @ApiOkResponse({ type: SiteDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findOne(@Param('id') id: string) {
    const result = await this.siteService.findOne(BigInt(id));
    return success(serializeBigInt(result));
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: '사이트 생성' })
  @ApiOkResponse({ type: SiteDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async create(@Body() dto: CreateSiteDto) {
    const result = await this.siteService.create(dto);
    return success(serializeBigInt(result));
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: '사이트 수정' })
  @ApiOkResponse({ type: SiteDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async update(@Param('id') id: string, @Body() dto: UpdateSiteDto) {
    const result = await this.siteService.update(BigInt(id), dto);
    return success(serializeBigInt(result));
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: '사이트 비활성화' })
  @ApiOkResponse({ description: '사이트 비활성화 완료' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async deactivate(@Param('id') id: string) {
    const result = await this.siteService.deactivate(BigInt(id));
    return deleted(!!result);
  }
}
