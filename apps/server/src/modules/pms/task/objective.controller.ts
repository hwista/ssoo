import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { ObjectiveService } from './objective.service.js';
import { ProjectFeatureGuard } from '../project/project-feature.guard.js';
import { RequireProjectFeature } from '../project/require-project-feature.decorator.js';
import { success, deleted } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import type { CreateObjectiveDto, UpdateObjectiveDto } from '@ssoo/types';

@ApiTags('objectives')
@ApiBearerAuth()
@Controller('projects/:projectId/objectives')
@UseGuards(RolesGuard, ProjectFeatureGuard)
export class ObjectiveController {
  constructor(private readonly objectiveService: ObjectiveService) {}

  @Get()
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '프로젝트 목표 목록' })
  async findByProject(@Param('projectId') projectId: string) {
    const data = await this.objectiveService.findByProject(BigInt(projectId));
    return success(data.map((objective) => serializeBigInt(objective)));
  }

  @Get(':id')
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '프로젝트 목표 상세' })
  async findOne(@Param('projectId') projectId: string, @Param('id') id: string) {
    const objective = await this.objectiveService.findOne(BigInt(projectId), BigInt(id));
    return success(serializeBigInt(objective));
  }

  @Post()
  @RequireProjectFeature('canManageMilestones')
  @ApiOperation({ summary: '프로젝트 목표 생성' })
  async create(@Param('projectId') projectId: string, @Body() dto: CreateObjectiveDto) {
    const objective = await this.objectiveService.create(BigInt(projectId), dto);
    return success(serializeBigInt(objective));
  }

  @Put(':id')
  @RequireProjectFeature('canManageMilestones')
  @ApiOperation({ summary: '프로젝트 목표 수정' })
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateObjectiveDto,
  ) {
    const objective = await this.objectiveService.update(BigInt(projectId), BigInt(id), dto);
    return success(serializeBigInt(objective));
  }

  @Delete(':id')
  @RequireProjectFeature('canManageMilestones')
  @ApiOperation({ summary: '프로젝트 목표 삭제' })
  async remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    await this.objectiveService.remove(BigInt(projectId), BigInt(id));
    return deleted(true);
  }
}
