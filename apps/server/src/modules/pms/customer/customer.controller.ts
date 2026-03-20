import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { Roles } from '../../common/auth/decorators/roles.decorator.js';
import { CustomerService } from './customer.service.js';
import { success, paginated, deleted } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import { CreateCustomerDto, UpdateCustomerDto, FindCustomersDto, CustomerDto } from './dto/customer.dto.js';
import { ApiError } from '../../../common/swagger/api-response.dto.js';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @ApiOperation({ summary: '고객사 목록' })
  @ApiOkResponse({ type: [CustomerDto] })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findAll(@Query() params: FindCustomersDto) {
    const { data, total, page, limit } = await this.customerService.findAll(params);
    const serialized = data.map((c) => serializeBigInt(c));
    return paginated(serialized as Record<string, unknown>[], page, limit, total);
  }

  @Get(':id')
  @ApiOperation({ summary: '고객사 상세' })
  @ApiOkResponse({ type: CustomerDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async findOne(@Param('id') id: string) {
    const result = await this.customerService.findOne(BigInt(id));
    return success(serializeBigInt(result));
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: '고객사 생성' })
  @ApiOkResponse({ type: CustomerDto })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async create(@Body() dto: CreateCustomerDto) {
    const result = await this.customerService.create(dto);
    return success(serializeBigInt(result));
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: '고객사 수정' })
  @ApiOkResponse({ type: CustomerDto })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    const result = await this.customerService.update(BigInt(id), dto);
    return success(serializeBigInt(result));
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: '고객사 비활성화' })
  @ApiOkResponse({ description: '고객사 비활성화 완료' })
  @ApiNotFoundResponse({ type: ApiError })
  @ApiUnauthorizedResponse({ type: ApiError })
  @ApiForbiddenResponse({ type: ApiError })
  @ApiInternalServerErrorResponse({ type: ApiError, description: '서버 오류' })
  async deactivate(@Param('id') id: string) {
    const result = await this.customerService.deactivate(BigInt(id));
    return deleted(!!result);
  }
}
