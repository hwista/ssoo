import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { WbsService } from './wbs.service.js';
import { ProjectFeatureGuard } from '../project/project-feature.guard.js';
import { RequireProjectFeature } from '../project/require-project-feature.decorator.js';
import { success, deleted } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import type { CreateWbsDto, UpdateWbsDto } from '@ssoo/types';

@ApiTags('wbs')
@ApiBearerAuth()
@Controller('projects/:projectId/wbs')
@UseGuards(JwtAuthGuard, RolesGuard, ProjectFeatureGuard)
export class WbsController {
  constructor(private readonly wbsService: WbsService) {}

  @Get()
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '프로젝트 WBS 목록' })
  async findByProject(@Param('projectId') projectId: string) {
    const data = await this.wbsService.findByProject(BigInt(projectId));
    return success(data.map((wbs) => serializeBigInt(wbs)));
  }

  @Get(':id')
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '프로젝트 WBS 상세' })
  async findOne(@Param('projectId') projectId: string, @Param('id') id: string) {
    const wbs = await this.wbsService.findOne(BigInt(projectId), BigInt(id));
    return success(serializeBigInt(wbs));
  }

  @Post()
  @RequireProjectFeature('canManageTasks')
  @ApiOperation({ summary: '프로젝트 WBS 생성' })
  async create(@Param('projectId') projectId: string, @Body() dto: CreateWbsDto) {
    const wbs = await this.wbsService.create(BigInt(projectId), dto);
    return success(serializeBigInt(wbs));
  }

  @Put(':id')
  @RequireProjectFeature('canManageTasks')
  @ApiOperation({ summary: '프로젝트 WBS 수정' })
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWbsDto,
  ) {
    const wbs = await this.wbsService.update(BigInt(projectId), BigInt(id), dto);
    return success(serializeBigInt(wbs));
  }

  @Delete(':id')
  @RequireProjectFeature('canManageTasks')
  @ApiOperation({ summary: '프로젝트 WBS 삭제' })
  async remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    await this.wbsService.remove(BigInt(projectId), BigInt(id));
    return deleted(true);
  }
}
