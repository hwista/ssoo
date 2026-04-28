import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../common/auth/guards/roles.guard.js';
import { TaskService } from './task.service.js';
import { ProjectFeatureGuard } from '../project/project-feature.guard.js';
import { RequireProjectFeature } from '../project/require-project-feature.decorator.js';
import { success, deleted } from '../../../common/index.js';
import { serializeBigInt } from '../../../common/utils/bigint.util.js';
import type { CreateTaskDto, UpdateTaskDto } from '@ssoo/types';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('projects/:projectId/tasks')
@UseGuards(RolesGuard, ProjectFeatureGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get()
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '프로젝트 태스크 목록' })
  async findByProject(@Param('projectId') projectId: string) {
    const data = await this.taskService.findByProject(BigInt(projectId));
    return success(data.map((t) => serializeBigInt(t)));
  }

  @Get(':id')
  @RequireProjectFeature('canViewProject')
  @ApiOperation({ summary: '태스크 상세' })
  async findOne(@Param('id') id: string) {
    const result = await this.taskService.findOne(BigInt(id));
    return success(serializeBigInt(result));
  }

  @Post()
  @RequireProjectFeature('canManageTasks')
  @ApiOperation({ summary: '태스크 생성' })
  async create(@Param('projectId') projectId: string, @Body() dto: CreateTaskDto) {
    const result = await this.taskService.create(BigInt(projectId), dto);
    return success(serializeBigInt(result));
  }

  @Put(':id')
  @RequireProjectFeature('canManageTasks')
  @ApiOperation({ summary: '태스크 수정' })
  async update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    const result = await this.taskService.update(BigInt(id), dto);
    return success(serializeBigInt(result));
  }

  @Delete(':id')
  @RequireProjectFeature('canManageTasks')
  @ApiOperation({ summary: '태스크 삭제' })
  async remove(@Param('id') id: string) {
    await this.taskService.remove(BigInt(id));
    return deleted(true);
  }
}
