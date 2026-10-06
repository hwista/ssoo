import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { success } from '../../../common/index.js';
import { ApiOkObjectResponse } from '../../../common/swagger/api-response.decorator.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { Roles } from '../../common/auth/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CrmAccessService } from '../access/access.service.js';
import { CrmCustomerFeatureGuard } from '../access/crm-customer-feature.guard.js';
import { CrmOpportunityFeatureGuard } from '../access/crm-opportunity-feature.guard.js';
import { RequireCrmCustomerFeature } from '../access/require-crm-customer-feature.decorator.js';
import {
  CrmCustomerActivityCreateDto,
  CrmCustomerAiIndexBackfillDto,
  CrmCustomerActivityListQueryDto,
  CrmCustomerListQueryDto,
  CrmCustomerUpsertDto,
} from './dto/customer.dto.js';
import { CustomerService } from './customer.service.js';

@ApiTags('crm-customers')
@ApiBearerAuth()
@Controller('crm/customers')
@UseGuards(RolesGuard, CrmOpportunityFeatureGuard, CrmCustomerFeatureGuard)
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly accessService: CrmAccessService,
  ) {}

  @Get()
  @RequireCrmCustomerFeature('canViewCustomer')
  @ApiOperation({ summary: 'CRM 고객 원장 목록' })
  @ApiOkObjectResponse({ description: 'CRM 고객 원장 목록과 요약' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: 'CRM 고객 조회 권한 없음' })
  async list(@Query() query: CrmCustomerListQueryDto, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.customerService.listResponse(query, currentUser));
  }

  @Get('access/me')
  @ApiOperation({ summary: 'CRM 고객/활동 전역 접근 스냅샷' })
  @ApiOkResponse({ description: 'CRM 고객/활동 전역 접근 스냅샷' })
  async myAccess(@CurrentUser() currentUser: TokenPayload) {
    return success(await this.accessService.getGlobalCustomerAccess(currentUser));
  }

  @Post('ai-index/backfill')
  @Roles('admin')
  @ApiOperation({ summary: 'CRM 고객/활동 AI 인덱스 backfill job 등록' })
  @ApiBody({ type: CrmCustomerAiIndexBackfillDto })
  @ApiOkResponse({ description: 'CRM customer/activity AI index backfill queue summary' })
  @ApiUnauthorizedResponse({ description: '인증 필요' })
  @ApiForbiddenResponse({ description: '시스템 override 권한 필요' })
  async queueAiIndexBackfill(
    @Body() body: CrmCustomerAiIndexBackfillDto | undefined,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.customerService.queueAiIndexBackfill(body ?? {}, currentUser));
  }

  @Get(':id/access')
  @RequireCrmCustomerFeature('canViewCustomer', { customerIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 고객/활동 접근 스냅샷' })
  @ApiOkResponse({ description: 'CRM 고객/활동 접근 스냅샷' })
  async access(@Param('id') id: string, @CurrentUser() currentUser: TokenPayload) {
    return success(await this.accessService.getCustomerAccess(id, currentUser));
  }

  @Get(':id')
  @RequireCrmCustomerFeature('canViewCustomer', { customerIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 고객 원장 상세' })
  @ApiOkResponse({ description: 'CRM 고객 원장 상세' })
  async detail(@Param('id') id: string) {
    return success(await this.customerService.getCustomer(id));
  }

  @Post()
  @RequireCrmCustomerFeature('canCreateCustomer')
  @ApiOperation({ summary: 'CRM 고객 원장 생성' })
  @ApiBody({ type: CrmCustomerUpsertDto })
  @ApiOkResponse({ description: '생성된 CRM 고객 원장' })
  async create(
    @Body() body: CrmCustomerUpsertDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.customerService.createCustomer(body, BigInt(currentUser.userId)));
  }

  @Put(':id')
  @RequireCrmCustomerFeature('canEditCustomer', { customerIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 고객 원장 수정' })
  @ApiBody({ type: CrmCustomerUpsertDto })
  @ApiOkResponse({ description: '수정된 CRM 고객 원장' })
  async update(
    @Param('id') id: string,
    @Body() body: CrmCustomerUpsertDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.customerService.updateCustomer(id, body, BigInt(currentUser.userId)));
  }

  @Get(':id/activities')
  @RequireCrmCustomerFeature('canViewCustomerActivity', { customerIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 고객 활동 원장 목록' })
  @ApiOkResponse({ description: 'CRM 고객 활동 원장 목록' })
  async activities(@Param('id') id: string, @Query() query: CrmCustomerActivityListQueryDto) {
    return success(await this.customerService.listActivities(id, query));
  }

  @Post(':id/activities')
  @RequireCrmCustomerFeature('canCreateCustomerActivity', { customerIdParam: 'id' })
  @ApiOperation({ summary: 'CRM 고객 활동 등록' })
  @ApiBody({ type: CrmCustomerActivityCreateDto })
  @ApiOkResponse({ description: '생성된 CRM 고객 활동' })
  async addActivity(
    @Param('id') id: string,
    @Body() body: CrmCustomerActivityCreateDto,
    @CurrentUser() currentUser: TokenPayload,
  ) {
    return success(await this.customerService.addActivity(id, body, BigInt(currentUser.userId)));
  }
}
