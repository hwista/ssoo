import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { MilestoneService } from './milestone.service.js';
import { success, deleted } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import type { CreateMilestoneDto, UpdateMilestoneDto } from '@ssoo/types';

@ApiTags('milestones')
@ApiBearerAuth()
@Controller('projects/:projectId/milestones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MilestoneController {
  constructor(private readonly milestoneService: MilestoneService) {}

  @Get()
  @ApiOperation({ summary: '프로젝트 마일스톤 목록' })
  async findByProject(@Param('projectId') projectId: string) {
    const data = await this.milestoneService.findByProject(BigInt(projectId));
    return success(data.map((m) => serializeBigInt(m)));
  }

  @Get(':id')
  @ApiOperation({ summary: '마일스톤 상세' })
  async findOne(@Param('id') id: string) {
    const result = await this.milestoneService.findOne(BigInt(id));
    return success(serializeBigInt(result));
  }

  @Post()
  @ApiOperation({ summary: '마일스톤 생성' })
  async create(@Param('projectId') projectId: string, @Body() dto: CreateMilestoneDto) {
    const result = await this.milestoneService.create(BigInt(projectId), dto);
    return success(serializeBigInt(result));
  }

  @Put(':id')
  @ApiOperation({ summary: '마일스톤 수정' })
  async update(@Param('id') id: string, @Body() dto: UpdateMilestoneDto) {
    const result = await this.milestoneService.update(BigInt(id), dto);
    return success(serializeBigInt(result));
  }

  @Delete(':id')
  @ApiOperation({ summary: '마일스톤 삭제' })
  async remove(@Param('id') id: string) {
    await this.milestoneService.remove(BigInt(id));
    return deleted(true);
  }
}
