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
import { SystemInstanceService } from './system-instance.service.js';
import {
  CreateSystemInstanceDto,
  FindSystemInstancesDto,
  SystemInstanceDto,
  UpdateSystemInstanceDto,
} from './dto/system-instance.dto.js';

@ApiTags('system-instances')
@ApiBearerAuth()
@Controller('system-instances')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemInstanceController {
  constructor(private readonly systemInstanceService: SystemInstanceService) {}

  @Get()
  @ApiOperation({ summary: '시스템 인스턴스 목록' })
  @ApiOkResponse({ type: [SystemInstanceDto] })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findAll(@Query() params: FindSystemInstancesDto) {
    const { data, total, page, limit } = await this.systemInstanceService.findAll(params);
    const serialized = data.map((item) => serializeBigInt(item));
    return paginated(serialized as Record<string, unknown>[], page, limit, total);
  }

  @Get('tree')
  @ApiOperation({ summary: '시스템 인스턴스 트리 목록' })
  @ApiOkResponse({ type: [SystemInstanceDto] })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findTree(@Query('customerId') customerId?: string, @Query('siteId') siteId?: string) {
    const data = await this.systemInstanceService.findTree(customerId, siteId);
    return success(data.map((item) => serializeBigInt(item)));
  }

  @Get(':id')
  @ApiOperation({ summary: '시스템 인스턴스 상세' })
  @ApiOkResponse({ type: SystemInstanceDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findOne(@Param('id') id: string) {
    const result = await this.systemInstanceService.findOne(BigInt(id));
    return success(serializeBigInt(result));
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: '시스템 인스턴스 생성' })
  @ApiOkResponse({ type: SystemInstanceDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async create(@Body() dto: CreateSystemInstanceDto) {
    const result = await this.systemInstanceService.create(dto);
    return success(serializeBigInt(result));
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: '시스템 인스턴스 수정' })
  @ApiOkResponse({ type: SystemInstanceDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async update(@Param('id') id: string, @Body() dto: UpdateSystemInstanceDto) {
    const result = await this.systemInstanceService.update(BigInt(id), dto);
    return success(serializeBigInt(result));
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: '시스템 인스턴스 비활성화' })
  @ApiOkResponse({ description: '시스템 인스턴스 비활성화 완료' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async deactivate(@Param('id') id: string) {
    const result = await this.systemInstanceService.deactivate(BigInt(id));
    return deleted(!!result);
  }
}
