import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { success } from '../../../common/index.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import type { TokenPayload } from '../../common/auth/interfaces/auth.interface.js';
import { CrmDomainFeatureGuard } from '../access/crm-domain-feature.guard.js';
import { RequireCrmDomainFeature } from '../access/require-crm-domain-feature.decorator.js';
import { BusinessYearService } from './business-year.service.js';
import { CreateBusinessYearDto, UpdateBusinessYearDto } from './dto/business-year.dto.js';

@ApiTags('crm-business-years')
@ApiBearerAuth()
@Controller('crm/business-years')
@UseGuards(RolesGuard, CrmDomainFeatureGuard)
export class BusinessYearController {
  constructor(private readonly service: BusinessYearService) {}

  @Get()
  @RequireCrmDomainFeature('canReadBusinessYear')
  @ApiOperation({ summary: 'CRM 사업연도 목록 조회' })
  async list() { return success(await this.service.list()); }

  @Post()
  @RequireCrmDomainFeature('canManageBusinessYear')
  @ApiOperation({ summary: 'CRM 사업연도 추가' })
  async create(@Body() dto: CreateBusinessYearDto, @CurrentUser() user: TokenPayload) {
    return success(await this.service.create(dto.year, BigInt(user.userId)));
  }

  @Put(':id')
  @RequireCrmDomainFeature('canManageBusinessYear')
  @ApiOperation({ summary: 'CRM 사업연도 활성·비활성 변경' })
  async update(@Param('id') id: string, @Body() dto: UpdateBusinessYearDto, @CurrentUser() user: TokenPayload) {
    return success(await this.service.setActive(id, dto.isActive, BigInt(user.userId)));
  }

  @Delete(':id')
  @RequireCrmDomainFeature('canManageBusinessYear')
  @ApiOperation({ summary: '비활성 CRM 사업연도 삭제' })
  async remove(@Param('id') id: string, @CurrentUser() user: TokenPayload) {
    return success(await this.service.remove(id, BigInt(user.userId)));
  }
}
