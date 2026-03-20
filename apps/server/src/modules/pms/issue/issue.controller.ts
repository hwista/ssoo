import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator.js';
import { IssueService } from './issue.service.js';
import { success, deleted } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import type { CreateIssueDto, UpdateIssueDto } from '@ssoo/types';

@ApiTags('issues')
@ApiBearerAuth()
@Controller('projects/:projectId/issues')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IssueController {
  constructor(private readonly issueService: IssueService) {}

  @Get()
  @ApiOperation({ summary: '프로젝트 이슈 목록' })
  async findByProject(
    @Param('projectId') projectId: string,
    @Query('statusCode') statusCode?: string,
    @Query('issueTypeCode') issueTypeCode?: string,
  ) {
    const data = await this.issueService.findByProject(BigInt(projectId), { statusCode, issueTypeCode });
    return success(data.map((i) => serializeBigInt(i)));
  }

  @Get(':id')
  @ApiOperation({ summary: '이슈 상세' })
  async findOne(@Param('id') id: string) {
    const result = await this.issueService.findOne(BigInt(id));
    return success(serializeBigInt(result));
  }

  @Post()
  @ApiOperation({ summary: '이슈 생성' })
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateIssueDto,
    @CurrentUser('userId') userId?: string,
  ) {
    const reportedBy = userId ? BigInt(userId) : undefined;
    const result = await this.issueService.create(BigInt(projectId), dto, reportedBy);
    return success(serializeBigInt(result));
  }

  @Put(':id')
  @ApiOperation({ summary: '이슈 수정' })
  async update(@Param('id') id: string, @Body() dto: UpdateIssueDto) {
    const result = await this.issueService.update(BigInt(id), dto);
    return success(serializeBigInt(result));
  }

  @Delete(':id')
  @ApiOperation({ summary: '이슈 삭제' })
  async remove(@Param('id') id: string) {
    const result = await this.issueService.remove(BigInt(id));
    return deleted(!!result);
  }
}
