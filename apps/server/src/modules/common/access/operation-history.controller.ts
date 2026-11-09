import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { success } from '../../../common/index.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { OperationHistoryQueryDto } from './dto/operation-history.dto.js';
import { OperationHistoryService } from './operation-history.service.js';

@ApiTags('Common Operation History')
@ApiBearerAuth()
@Controller('access/ops/history')
@UseGuards(RolesGuard)
@Roles('admin')
export class OperationHistoryController {
  constructor(private readonly service: OperationHistoryService) {}

  @Get()
  @ApiOperation({ summary: '공통 운영 이력 기간·대상·운영자·결과별 조회' })
  async list(@Query() query: OperationHistoryQueryDto) { return success(await this.service.list(query)); }

  @Get(':category/:subjectId/:sequence')
  @ApiOperation({ summary: '공통 운영 이력과 직전 값 비교' })
  async detail(@Param('category') category: string, @Param('subjectId') subjectId: string, @Param('sequence') sequence: string) {
    return success(await this.service.detail(category, subjectId, sequence));
  }
}
