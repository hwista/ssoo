import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CrmOpportunityListQuery } from '@ssoo/types/crm';
import { success } from '../../../common/index.js';
import { OpportunityService } from './opportunity.service.js';

@ApiTags('crm-opportunities')
@Controller('crm/opportunities')
export class OpportunityController {
  constructor(private readonly opportunityService: OpportunityService) {}

  @Get()
  @ApiOperation({ summary: 'CRM 영업기회 현황 데모 목록' })
  @ApiOkResponse({ description: 'CRM 영업기회 목록과 요약' })
  list(@Query() query: CrmOpportunityListQuery) {
    return success(this.opportunityService.listResponse(query));
  }

  @Get(':id')
  @ApiOperation({ summary: 'CRM 영업기회 상세' })
  @ApiOkResponse({ description: 'CRM 영업기회 상세' })
  detail(@Param('id') id: string) {
    return success(this.opportunityService.getOpportunity(id));
  }
}
