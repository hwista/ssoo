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
import { SystemCatalogService } from './system-catalog.service.js';
import {
  CreateSystemCatalogDto,
  FindSystemCatalogsDto,
  SystemCatalogDto,
  UpdateSystemCatalogDto,
} from './dto/system-catalog.dto.js';

@ApiTags('system-catalogs')
@ApiBearerAuth()
@Controller('system-catalogs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemCatalogController {
  constructor(private readonly systemCatalogService: SystemCatalogService) {}

  @Get()
  @ApiOperation({ summary: '시스템 카탈로그 목록' })
  @ApiOkResponse({ type: [SystemCatalogDto] })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findAll(@Query() params: FindSystemCatalogsDto) {
    const { data, total, page, limit } = await this.systemCatalogService.findAll(params);
    const serialized = data.map((item) => serializeBigInt(item));
    return paginated(serialized as Record<string, unknown>[], page, limit, total);
  }

  @Get('tree')
  @ApiOperation({ summary: '시스템 카탈로그 트리 목록' })
  @ApiOkResponse({ type: [SystemCatalogDto] })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findTree() {
    const data = await this.systemCatalogService.findTree();
    return success(data.map((item) => serializeBigInt(item)));
  }

  @Get(':id')
  @ApiOperation({ summary: '시스템 카탈로그 상세' })
  @ApiOkResponse({ type: SystemCatalogDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findOne(@Param('id') id: string) {
    const result = await this.systemCatalogService.findOne(BigInt(id));
    return success(serializeBigInt(result));
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: '시스템 카탈로그 생성' })
  @ApiOkResponse({ type: SystemCatalogDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async create(@Body() dto: CreateSystemCatalogDto) {
    const result = await this.systemCatalogService.create(dto);
    return success(serializeBigInt(result));
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: '시스템 카탈로그 수정' })
  @ApiOkResponse({ type: SystemCatalogDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async update(@Param('id') id: string, @Body() dto: UpdateSystemCatalogDto) {
    const result = await this.systemCatalogService.update(BigInt(id), dto);
    return success(serializeBigInt(result));
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: '시스템 카탈로그 비활성화' })
  @ApiOkResponse({ description: '시스템 카탈로그 비활성화 완료' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async deactivate(@Param('id') id: string) {
    const result = await this.systemCatalogService.deactivate(BigInt(id));
    return deleted(!!result);
  }
}
